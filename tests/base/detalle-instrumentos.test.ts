import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorDe } from './ayudas.ts'
import { crearBase, type BaseDePrueba, type Consultor } from './crear-base.ts'

let base: BaseDePrueba
let ana: Consultor

beforeAll(async () => {
  base = await crearBase()
  await base.admin.consultar(`insert into persona (nombre, email) values ('Ana', 'ana@example.com')`)
  ana = base.conSesion('ana@example.com')
})

afterAll(async () => {
  await base.cerrar()
})

type Guardar = {
  id?: string
  tipo: string
  ticker: string
  moneda?: 'ARS' | 'USD'
  vencimiento?: string
  codigo_cafci?: string
  ratio?: number
  subyacente?: string
  emisor?: string
  valor_nominal_residual?: number
}

/** Llama a guardar_instrumento como lo hace la app, con los datos que no vienen en null. */
async function guardar(datos: Guardar, quien: Consultor = ana): Promise<string> {
  const { tipo, ticker, moneda = 'ARS', ...resto } = datos
  const [fila] = await quien.consultar<{ id: string }>(
    `select public.guardar_instrumento(
       p_tipo => $1, p_ticker => $2, p_nombre => 'Ejemplo', p_moneda => $3, p_id => $4, p_vencimiento => $5,
       p_codigo_cafci => $6, p_ratio => $7, p_subyacente => $8, p_emisor => $9, p_valor_nominal_residual => $10
     ) as id`,
    [
      tipo,
      ticker,
      moneda,
      resto.id ?? null,
      resto.vencimiento ?? null,
      resto.codigo_cafci ?? null,
      resto.ratio ?? null,
      resto.subyacente ?? null,
      resto.emisor ?? null,
      resto.valor_nominal_residual ?? null,
    ],
  )
  return fila!.id
}

const detalle = (tabla: string, id: string) =>
  base.admin.consultar<Record<string, unknown>>(`select * from public.${tabla} where instrumento_id = $1`, [id])

const instrumentoConTicker = (ticker: string) =>
  base.admin.consultar<{ id: string; tipo: string }>(`select id, tipo from instrumento where ticker = $1`, [ticker])

describe('datos propios de cada instrumento (C10)', () => {
  it('un FCI guarda su código CAFCI, con la autoría de quien lo cargó', async () => {
    const id = await guardar({ tipo: 'FCI', ticker: 'fciuno', codigo_cafci: '1234' })
    expect(await detalle('instrumento_fci', id)).toMatchObject([{ codigo_cafci: '1234', creado_por: 'ana@example.com' }])
    expect(await instrumentoConTicker('FCIUNO')).toMatchObject([{ id, tipo: 'FCI' }])
  })

  it('un CEDEAR guarda su ratio y su subyacente', async () => {
    const id = await guardar({ tipo: 'CEDEAR', ticker: 'CEDUNO', ratio: 20, subyacente: 'EJM' })
    const [fila] = await detalle('instrumento_cedear', id)
    expect({ ratio: Number(fila?.ratio), subyacente: fila?.subyacente }).toEqual({ ratio: 20, subyacente: 'EJM' })
  })

  it('una ON guarda su emisor y su valor nominal residual', async () => {
    const id = await guardar({
      tipo: 'ON',
      ticker: 'ONUNO',
      moneda: 'USD',
      vencimiento: '2028-03-01',
      emisor: 'Emisora Ejemplo',
      valor_nominal_residual: 62.5,
    })
    const [fila] = await detalle('instrumento_on', id)
    expect({ emisor: fila?.emisor, residual: Number(fila?.valor_nominal_residual) }).toEqual({
      emisor: 'Emisora Ejemplo',
      residual: 62.5,
    })
  })

  it('los datos propios son opcionales: sin ninguno, no hay detalle', async () => {
    const id = await guardar({ tipo: 'CEDEAR', ticker: 'CEDDOS' })
    expect(await detalle('instrumento_cedear', id)).toEqual([])
  })

  it('un detalle de otro tipo se rechaza', async () => {
    const [cedear] = await instrumentoConTicker('CEDUNO')
    const error = await errorDe(
      ana.consultar(`insert into instrumento_fci (instrumento_id, codigo_cafci) values ($1, '999')`, [cedear!.id]),
    )
    expect(error.code).toBe('23503')
    expect(error.constraint).toBe('instrumento_fci_instrumento_fk')
  })

  it('si falla el detalle, el instrumento no queda a medias', async () => {
    const deOtroTipo = await errorDe(guardar({ tipo: 'CEDEAR', ticker: 'CEDTRES', codigo_cafci: '1234' }))
    expect(deOtroTipo.constraint).toBe('instrumento_fci_instrumento_fk')
    const vacio = await errorDe(guardar({ tipo: 'FCI', ticker: 'FCIDOS', codigo_cafci: '   ' }))
    expect(vacio.constraint).toBe('instrumento_fci_codigo_cafci_no_vacio')
    expect(await instrumentoConTicker('CEDTRES')).toEqual([])
    expect(await instrumentoConTicker('FCIDOS')).toEqual([])
  })

  it('un ratio en cero o un valor residual de más de 100 se rechazan', async () => {
    const ratio = await errorDe(guardar({ tipo: 'CEDEAR', ticker: 'CEDCUATRO', ratio: 0 }))
    expect(ratio.constraint).toBe('instrumento_cedear_ratio_positivo')
    const residual = await errorDe(
      guardar({ tipo: 'ON', ticker: 'ONDOS', vencimiento: '2028-03-01', valor_nominal_residual: 100.5 }),
    )
    expect(residual.constraint).toBe('instrumento_on_valor_residual_valido')
  })

  it('al editar se cambian los datos propios, y si cambia el tipo se borra el detalle que ya no corresponde', async () => {
    const id = await guardar({ tipo: 'FCI', ticker: 'FCITRES', codigo_cafci: '111' })
    await guardar({ id, tipo: 'FCI', ticker: 'FCITRES', codigo_cafci: '222' })
    expect(await detalle('instrumento_fci', id)).toMatchObject([{ codigo_cafci: '222', modificado_por: 'ana@example.com' }])

    await guardar({ id, tipo: 'ETF', ticker: 'FCITRES' })
    expect(await detalle('instrumento_fci', id)).toEqual([])
    expect(await instrumentoConTicker('FCITRES')).toMatchObject([{ tipo: 'ETF' }])
  })

  it('cambiarle el tipo a un instrumento sin sacar su detalle se rechaza', async () => {
    const id = await guardar({ tipo: 'FCI', ticker: 'FCICUATRO', codigo_cafci: '333' })
    const error = await errorDe(ana.consultar(`update instrumento set tipo = 'ETF' where id = $1`, [id]))
    expect(error.constraint).toBe('instrumento_fci_instrumento_fk')
  })

  it('borrar un instrumento borra su detalle', async () => {
    const id = await guardar({ tipo: 'FCI', ticker: 'FCICINCO', codigo_cafci: '444' })
    await ana.consultar('delete from instrumento where id = $1', [id])
    expect(await detalle('instrumento_fci', id)).toEqual([])
  })

  it('editar un instrumento que ya no existe dice que no se encontró', async () => {
    const error = await errorDe(guardar({ id: crypto.randomUUID(), tipo: 'ETF', ticker: 'NOESTA' }))
    expect(error.code).toBe('LH004')
  })

  it('ni el anónimo ni alguien sin invitación pueden guardar', async () => {
    const anonimo = await errorDe(guardar({ tipo: 'ETF', ticker: 'ANONIMO' }, base.anonimo))
    expect(anonimo.code).toBe('42501')
    const intruso = await errorDe(guardar({ tipo: 'ETF', ticker: 'INTRUSO' }, base.conSesion('intruso@example.com')))
    expect(intruso.code).toBe('42501')
    expect(await instrumentoConTicker('INTRUSO')).toEqual([])
  })
})
