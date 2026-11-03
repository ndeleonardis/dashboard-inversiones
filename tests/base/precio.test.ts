// T1. Los precios los escribe solo el proceso externo, con el rol
// carga_precios y a través de guardar_precios(). Los miembros solo los leen, y
// carga_precios no ve ningún dato personal.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorDe } from './ayudas.ts'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

const ANA = 'ana@example.com'

let base: BaseDePrueba
let contador = 0

beforeAll(async () => {
  base = await crearBase()
  await base.admin.consultar(`insert into persona (nombre, email) values ('Ana', $1)`, [ANA])
})

afterAll(async () => {
  await base.cerrar()
})

async function instrumento(moneda: 'ARS' | 'USD' = 'ARS'): Promise<string> {
  contador += 1
  const [fila] = await base.admin.consultar<{ id: string }>(
    `insert into instrumento (tipo, ticker, nombre, moneda) values ('FCI', $1, 'Fondo Ejemplo', $2) returning id`,
    [`FONDO${contador}`, moneda],
  )
  return fila!.id
}

type Precio = { instrumento_id: string; fecha: string; valor: number | string; cada: number; moneda: string; fuente: string }

function guardar(precios: Precio[]) {
  return base.cargaPrecios.consultar<{ cambiados: number }>('select public.guardar_precios($1::jsonb) as cambiados', [
    JSON.stringify(precios),
  ])
}

function precioDe(id: string, cambios: Partial<Precio> = {}): Precio {
  return { instrumento_id: id, fecha: '2026-11-02', valor: '2345678.9', cada: 1000, moneda: 'ARS', fuente: 'CAFCI', ...cambios }
}

async function preciosDe(id: string) {
  return base.admin.consultar<{ fecha: string; valor: string; cada: number; fuente: string }>(
    `select to_char(fecha, 'YYYY-MM-DD') as fecha, valor::text as valor, cada, fuente
     from precio where instrumento_id = $1 order by fecha`,
    [id],
  )
}

describe('carga_precios guarda los precios', () => {
  it('guarda el valor con su fecha, cada cuántas unidades y su fuente', async () => {
    const id = await instrumento()
    const [resultado] = await guardar([precioDe(id)])
    expect(Number(resultado?.cambiados)).toBe(1)
    expect(await preciosDe(id)).toEqual([{ fecha: '2026-11-02', valor: '2345678.9', cada: 1000, fuente: 'CAFCI' }])
  })

  it('reemplaza el valor de una fecha cuando la fuente lo corrige, sin duplicar', async () => {
    const id = await instrumento()
    await guardar([precioDe(id)])
    await guardar([precioDe(id, { valor: '2345680.1' })])
    expect(await preciosDe(id)).toEqual([{ fecha: '2026-11-02', valor: '2345680.1', cada: 1000, fuente: 'CAFCI' }])
  })

  it('si el valor no cambió, no cuenta como cambio', async () => {
    const id = await instrumento()
    await guardar([precioDe(id)])
    const [resultado] = await guardar([precioDe(id)])
    expect(Number(resultado?.cambiados)).toBe(0)
  })

  it('guarda varias fechas de una vez', async () => {
    const id = await instrumento()
    await guardar([precioDe(id, { fecha: '2026-10-30' }), precioDe(id)])
    expect((await preciosDe(id)).map((p) => p.fecha)).toEqual(['2026-10-30', '2026-11-02'])
  })

  it('si un precio de la corrida es inválido, no guarda ninguno', async () => {
    const id = await instrumento()
    const error = await errorDe(guardar([precioDe(id, { fecha: '2026-10-30' }), precioDe(id, { valor: 0 })]))
    expect(error.constraint).toBe('precio_valor_positivo')
    expect(await preciosDe(id)).toEqual([])
  })
})

describe('restricciones del precio', () => {
  it('el precio va en la moneda de su instrumento (regla 2)', async () => {
    const id = await instrumento('ARS')
    const error = await errorDe(guardar([precioDe(id, { moneda: 'USD' })]))
    expect(error.constraint).toBe('precio_moneda_instrumento_fk')
  })

  it('el valor tiene que ser mayor que cero y con hasta 8 decimales', async () => {
    const id = await instrumento()
    expect((await errorDe(guardar([precioDe(id, { valor: -1 })]))).constraint).toBe('precio_valor_positivo')
    expect((await errorDe(guardar([precioDe(id, { valor: '1.123456789' })]))).constraint).toBe('precio_valor_decimales')
  })

  it('cada cuántas unidades tiene que ser mayor que cero', async () => {
    const id = await instrumento()
    expect((await errorDe(guardar([precioDe(id, { cada: 0 })]))).constraint).toBe('precio_cada_positivo')
  })

  it('la fuente no puede quedar vacía', async () => {
    const id = await instrumento()
    expect((await errorDe(guardar([precioDe(id, { fuente: ' ' })]))).constraint).toBe('precio_fuente_no_vacia')
  })

  it('borrar el instrumento borra sus precios', async () => {
    const id = await instrumento()
    await guardar([precioDe(id)])
    await base.admin.consultar('delete from instrumento where id = $1', [id])
    expect(await preciosDe(id)).toEqual([])
  })
})

describe('precios que dejan de corresponder (T3)', () => {
  async function fondoConPrecio(codigo = '1234') {
    const ana = base.conSesion(ANA)
    contador += 1
    const ticker = `FONDO${contador}`
    const [fila] = await ana.consultar<{ id: string }>(
      `select public.guardar_instrumento('FCI', $1, 'Fondo Ejemplo', 'ARS', p_codigo_cafci => $2) as id`,
      [ticker, codigo],
    )
    await guardar([precioDe(fila!.id)])
    return { ana, id: fila!.id, ticker }
  }

  it('si se corrige el código CAFCI, los precios del código anterior se borran', async () => {
    const { ana, id, ticker } = await fondoConPrecio()
    await ana.consultar(`select public.guardar_instrumento('FCI', $1, 'Fondo Ejemplo', 'ARS', $2, p_codigo_cafci => '9999')`, [
      ticker,
      id,
    ])
    expect(await preciosDe(id)).toEqual([])
  })

  it('si se saca el código CAFCI, los precios se borran', async () => {
    const { ana, id, ticker } = await fondoConPrecio()
    await ana.consultar(`select public.guardar_instrumento('FCI', $1, 'Fondo Ejemplo', 'ARS', $2)`, [ticker, id])
    expect(await preciosDe(id)).toEqual([])
  })

  it('si cambia el ticker, los precios se borran', async () => {
    const { ana, id } = await fondoConPrecio()
    await ana.consultar(`update instrumento set ticker = 'OTRO' || $2 where id = $1`, [id, contador])
    expect(await preciosDe(id)).toEqual([])
  })

  it('si cambia la moneda, los precios se borran en vez de frenar el cambio', async () => {
    const { ana, id } = await fondoConPrecio()
    await ana.consultar(`update instrumento set moneda = 'USD' where id = $1`, [id])
    expect(await preciosDe(id)).toEqual([])
  })

  it('si se edita otro dato, como el nombre, los precios se quedan', async () => {
    const { ana, id, ticker } = await fondoConPrecio()
    await ana.consultar(`select public.guardar_instrumento('FCI', $1, 'Otro nombre', 'ARS', $2, p_codigo_cafci => '1234')`, [
      ticker,
      id,
    ])
    expect(await preciosDe(id)).toHaveLength(1)
  })
})

describe('acceso a los precios', () => {
  it('carga_precios no ve ningún dato personal ni ninguna tabla', async () => {
    for (const relacion of ['persona', 'cuenta', 'operacion', 'gasto', 'ingreso', 'posicion', 'instrumento', 'precio']) {
      const error = await errorDe(base.cargaPrecios.consultar(`select count(*) from public.${relacion}`))
      expect(error.code, relacion).toBe('42501')
    }
  })

  it('carga_precios no puede escribir en la tabla sin pasar por guardar_precios', async () => {
    const id = await instrumento()
    const error = await errorDe(
      base.cargaPrecios.consultar(
        `insert into precio (instrumento_id, fecha, valor, cada, moneda, fuente) values ($1, '2026-11-02', 1, 1, 'ARS', 'X')`,
        [id],
      ),
    )
    expect(error.code).toBe('42501')
  })

  it('un miembro lee los precios pero no los escribe', async () => {
    const id = await instrumento()
    await guardar([precioDe(id)])
    const ana = base.conSesion(ANA)
    const filas = await ana.consultar('select * from precio where instrumento_id = $1', [id])
    expect(filas).toHaveLength(1)
    const alInsertar = await errorDe(
      ana.consultar(
        `insert into precio (instrumento_id, fecha, valor, cada, moneda, fuente) values ($1, '2026-11-03', 1, 1, 'ARS', 'X')`,
        [id],
      ),
    )
    expect(alInsertar.code).toBe('42501')
    const alGuardar = await errorDe(ana.consultar(`select public.guardar_precios('[]'::jsonb)`))
    expect(alGuardar.code).toBe('42501')
  })

  it('el anónimo no ve los precios ni puede guardarlos', async () => {
    expect((await errorDe(base.anonimo.consultar('select count(*) from precio'))).code).toBe('42501')
    expect((await errorDe(base.anonimo.consultar(`select public.guardar_precios('[]'::jsonb)`))).code).toBe('42501')
  })
})
