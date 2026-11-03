// T4. El valor actual de cada posición, con la fecha del último precio. Sin
// precio, el valor es null y nunca 0 (regla 5).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { guardarPrecios } from './ayudas.ts'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

let base: BaseDePrueba
let banco: string
let contador = 0

beforeAll(async () => {
  base = await crearBase()
  const [tipo] = await base.admin.consultar<{ id: string }>(`select id from tipo_cuenta where nombre = 'Banco'`)
  banco = tipo!.id
})

afterAll(async () => {
  await base.cerrar()
})

type Escenario = { cuenta: string; instrumento: string }

async function escenario(tipo: 'FCI' | 'ON' | 'CEDEAR', opciones: { codigoCafci?: string } = {}): Promise<Escenario> {
  contador += 1
  const [persona] = await base.admin.consultar<{ id: string }>(`insert into persona (nombre) values ($1) returning id`, [
    `Persona ${contador}`,
  ])
  const [cuenta] = await base.admin.consultar<{ id: string }>(
    `insert into cuenta (persona_id, tipo_cuenta_id, entidad) values ($1, $2, 'Broker Ejemplo') returning id`,
    [persona!.id, banco],
  )
  const [instrumento] = await base.admin.consultar<{ id: string }>(
    `select public.guardar_instrumento($1, $2, 'Ejemplo', 'ARS', p_vencimiento => $3, p_codigo_cafci => $4) as id`,
    [tipo, `TICK${contador}`, tipo === 'ON' ? '2030-06-30' : null, opciones.codigoCafci ?? null],
  )
  return { cuenta: cuenta!.id, instrumento: instrumento!.id }
}

async function comprar(e: Escenario, cantidad: number | string, precio: number | string, fecha = '2026-10-01') {
  await base.admin.consultar(
    `insert into operacion (cuenta_id, instrumento_id, tipo, fecha, cantidad, precio_unitario, moneda)
     values ($1, $2, 'COMPRA', $3, $4, $5, 'ARS')`,
    [e.cuenta, e.instrumento, fecha, cantidad, precio],
  )
}

async function vender(e: Escenario, cantidad: number | string, precio: number | string) {
  await base.admin.consultar(
    `insert into operacion (cuenta_id, instrumento_id, tipo, fecha, cantidad, precio_unitario, moneda)
     values ($1, $2, 'VENTA', '2026-10-15', $3, $4, 'ARS')`,
    [e.cuenta, e.instrumento, cantidad, precio],
  )
}

async function cotizar(e: Escenario, fecha: string, valor: number | string, cada: number) {
  await guardarPrecios(base.cargaPrecios, [{ instrumento_id: e.instrumento, fecha, valor, cada, moneda: 'ARS', fuente: 'Prueba' }])
}

type Fila = {
  costo: string
  fecha_valor: string | null
  valor: string | null
  rendimiento: string | null
  rendimiento_pct: string | null
  sin_codigo_cafci: boolean
}

async function posicion(e: Escenario) {
  const [fila] = await base.admin.consultar<Fila>(
    `select costo::text, to_char(fecha_valor, 'YYYY-MM-DD') as fecha_valor, valor::text, rendimiento::text,
            rendimiento_pct::text, sin_codigo_cafci
     from posicion where cuenta_id = $1 and instrumento_id = $2`,
    [e.cuenta, e.instrumento],
  )
  return fila
}

describe('valor de la posición (C34)', () => {
  it('toma el último valor conocido y su fecha', async () => {
    const e = await escenario('CEDEAR')
    await comprar(e, 10, 100)
    await cotizar(e, '2026-10-30', 110, 1)
    await cotizar(e, '2026-11-02', 120, 1)
    await cotizar(e, '2026-10-31', 115, 1)
    const fila = await posicion(e)
    expect(fila?.fecha_valor).toBe('2026-11-02')
    expect(Number(fila?.valor)).toBe(1200)
  })

  it('una posición vendida por completo sigue sin aparecer, aunque tenga precio', async () => {
    const e = await escenario('CEDEAR')
    await comprar(e, 10, 100)
    await vender(e, 10, 120)
    await cotizar(e, '2026-11-02', 120, 1)
    expect(await posicion(e)).toBeUndefined()
  })
})

describe('conversiones', () => {
  it('C35. un FCI se valúa con el valor publicado cada mil cuotapartes', async () => {
    const e = await escenario('FCI', { codigoCafci: '1234' })
    await comprar(e, 1500, '2000')
    await cotizar(e, '2026-11-02', '2345678.90', 1000)
    expect(Number((await posicion(e))?.valor)).toBe(3518518.35)
  })

  it('C36. una ON se valúa cada 100 de valor nominal', async () => {
    const e = await escenario('ON')
    await comprar(e, 1000, 100)
    await cotizar(e, '2026-11-02', '102.50', 100)
    expect(Number((await posicion(e))?.valor)).toBe(1025)
  })
})

describe('sin precio (C37, regla 5)', () => {
  it('sin ningún precio, el valor y su fecha son null, nunca 0, y el costo sigue', async () => {
    const e = await escenario('CEDEAR')
    await comprar(e, 10, 100)
    const fila = await posicion(e)
    expect(fila?.valor).toBeNull()
    expect(fila?.fecha_valor).toBeNull()
    expect(Number(fila?.costo)).toBe(1000)
  })

  it('C39. un FCI sin código CAFCI queda marcado', async () => {
    const sinCodigo = await escenario('FCI')
    await comprar(sinCodigo, 10, 100)
    const conCodigo = await escenario('FCI', { codigoCafci: '5678' })
    await comprar(conCodigo, 10, 100)
    const otro = await escenario('CEDEAR')
    await comprar(otro, 10, 100)
    expect((await posicion(sinCodigo))?.sin_codigo_cafci).toBe(true)
    expect((await posicion(conCodigo))?.sin_codigo_cafci).toBe(false)
    expect((await posicion(otro))?.sin_codigo_cafci).toBe(false)
  })
})

describe('rendimiento (C42)', () => {
  it('es el valor menos el costo, en monto y como fracción del costo', async () => {
    const e = await escenario('CEDEAR')
    await comprar(e, 10, 100)
    await cotizar(e, '2026-11-02', '112.5', 1)
    const fila = await posicion(e)
    expect(Number(fila?.rendimiento)).toBe(125)
    expect(Number(fila?.rendimiento_pct)).toBe(0.125)
  })

  it('puede ser negativo', async () => {
    const e = await escenario('CEDEAR')
    await comprar(e, 10, 100)
    await cotizar(e, '2026-11-02', 90, 1)
    const fila = await posicion(e)
    expect(Number(fila?.rendimiento)).toBe(-100)
    expect(Number(fila?.rendimiento_pct)).toBe(-0.1)
  })

  it('sin precio no hay rendimiento', async () => {
    const e = await escenario('CEDEAR')
    await comprar(e, 10, 100)
    const fila = await posicion(e)
    expect(fila?.rendimiento).toBeNull()
    expect(fila?.rendimiento_pct).toBeNull()
  })
})
