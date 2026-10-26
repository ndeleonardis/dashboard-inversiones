import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorDe } from './ayudas.ts'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

let base: BaseDePrueba

beforeAll(async () => {
  base = await crearBase()
})

afterAll(async () => {
  await base.cerrar()
})

type Instrumento = { tipo: string; ticker: string; nombre: string; moneda: string; vencimiento?: string | null }

function crearInstrumento({ tipo, ticker, nombre, moneda, vencimiento = null }: Instrumento) {
  return base.admin.consultar<{ id: string; ticker: string }>(
    `insert into instrumento (tipo, ticker, nombre, moneda, vencimiento)
     values ($1, $2, $3, $4, $5) returning id, ticker`,
    [tipo, ticker, nombre, moneda, vencimiento],
  )
}

describe('tipos de instrumento', () => {
  it('vienen cargados, y la ON cotiza cada 100 de valor nominal', async () => {
    const filas = await base.admin.consultar<{ codigo: string; precio_cada: number }>(
      'select codigo, precio_cada from tipo_instrumento order by codigo',
    )
    expect(filas).toEqual([
      { codigo: 'ACCION', precio_cada: 1 },
      { codigo: 'CEDEAR', precio_cada: 1 },
      { codigo: 'CRIPTO', precio_cada: 1 },
      { codigo: 'ETF', precio_cada: 1 },
      { codigo: 'FCI', precio_cada: 1 },
      { codigo: 'ON', precio_cada: 100 },
    ])
  })
})

describe('instrumentos (C8)', () => {
  it('AAPL en pesos y AAPLD en dólares son dos instrumentos', async () => {
    await crearInstrumento({ tipo: 'CEDEAR', ticker: 'AAPL', nombre: 'Apple', moneda: 'ARS' })
    await crearInstrumento({ tipo: 'CEDEAR', ticker: 'AAPLD', nombre: 'Apple', moneda: 'USD' })
    const filas = await base.admin.consultar(`select 1 from instrumento where ticker in ('AAPL', 'AAPLD')`)
    expect(filas).toHaveLength(2)
  })

  it('el mismo ticker en otra moneda es otra especie', async () => {
    await crearInstrumento({ tipo: 'ACCION', ticker: 'AAPL', nombre: 'Apple en EE.UU.', moneda: 'USD' })
  })

  it('un segundo AAPL en pesos se rechaza', async () => {
    const error = await errorDe(crearInstrumento({ tipo: 'CEDEAR', ticker: 'AAPL', nombre: 'Otro', moneda: 'ARS' }))
    expect(error.code).toBe('23505')
    expect(error.message).toContain('instrumento_ticker_moneda_unico')
  })

  it('una moneda que no es ARS ni USD se rechaza (regla 2)', async () => {
    const error = await errorDe(crearInstrumento({ tipo: 'ACCION', ticker: 'SAN', nombre: 'Santander', moneda: 'EUR' }))
    expect(error.code).toBe('22P02')
  })

  it('el ticker se guarda sin espacios y en mayúsculas', async () => {
    const [fila] = await crearInstrumento({ tipo: 'ACCION', ticker: ' ggal ', nombre: 'Galicia', moneda: 'ARS' })
    expect(fila?.ticker).toBe('GGAL')
  })

  it('un tipo que no existe se rechaza', async () => {
    const error = await errorDe(crearInstrumento({ tipo: 'BONO', ticker: 'AL30', nombre: 'Bonar', moneda: 'ARS' }))
    expect(error.code).toBe('23503')
    expect(error.message).toContain('instrumento_tipo_fk')
  })

  it('un nombre vacío se rechaza', async () => {
    const error = await errorDe(crearInstrumento({ tipo: 'ETF', ticker: 'SPY', nombre: ' ', moneda: 'USD' }))
    expect(error.code).toBe('23514')
    expect(error.message).toContain('instrumento_nombre_no_vacio')
  })
})

describe('vencimiento de la ON (C9)', () => {
  it('una ON sin vencimiento se rechaza', async () => {
    const error = await errorDe(crearInstrumento({ tipo: 'ON', ticker: 'YMCHO', nombre: 'YPF 2026', moneda: 'ARS' }))
    expect(error.code).toBe('23514')
    expect(error.message).toContain('instrumento_on_con_vencimiento')
  })

  it('una ON con vencimiento se guarda', async () => {
    const [fila] = await crearInstrumento({
      tipo: 'ON',
      ticker: 'YMCHD',
      nombre: 'YPF 2026',
      moneda: 'USD',
      vencimiento: '2026-12-15',
    })
    expect(fila?.ticker).toBe('YMCHD')
  })

  it('una acción con vencimiento se rechaza', async () => {
    const error = await errorDe(
      crearInstrumento({ tipo: 'ACCION', ticker: 'PAMP', nombre: 'Pampa', moneda: 'ARS', vencimiento: '2030-01-01' }),
    )
    expect(error.code).toBe('23514')
    expect(error.message).toContain('instrumento_vencimiento_solo_on')
  })
})
