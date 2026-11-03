// T2. Lo que el proceso externo necesita para traer precios: qué instrumentos
// existen y con qué clave pedirlos. Sin cantidades, cuentas ni personas.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorDe } from './ayudas.ts'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

const ANA = 'ana@example.com'

let base: BaseDePrueba
let fondo: string
let cedear: string

beforeAll(async () => {
  base = await crearBase()
  await base.admin.consultar(`insert into persona (nombre, email) values ('Ana', $1)`, [ANA])
  fondo = (
    await base.admin.consultar<{ id: string }>(
      `select public.guardar_instrumento('FCI', 'FONDOA', 'Fondo Ejemplo', 'ARS', p_codigo_cafci => '1234') as id`,
    )
  )[0]!.id
  cedear = (
    await base.admin.consultar<{ id: string }>(
      `insert into instrumento (tipo, ticker, nombre, moneda) values ('CEDEAR', 'EJEMD', 'Ejemplo', 'USD') returning id`,
    )
  )[0]!.id
})

afterAll(async () => {
  await base.cerrar()
})

describe('instrumentos_a_cotizar()', () => {
  it('devuelve cada instrumento con su clave, y nada más', async () => {
    const filas = await base.cargaPrecios.consultar('select * from public.instrumentos_a_cotizar()')
    // La clave es con lo que se pide el precio: el código CAFCI de un FCI y el ticker del resto.
    expect(filas).toEqual([
      { id: cedear, tipo: 'CEDEAR', ticker: 'EJEMD', moneda: 'USD', codigo_cafci: null, clave: 'EJEMD' },
      { id: fondo, tipo: 'FCI', ticker: 'FONDOA', moneda: 'ARS', codigo_cafci: '1234', clave: '1234' },
    ])
  })

  it('un FCI sin código CAFCI no tiene clave', async () => {
    const [fila] = await base.admin.consultar<{ id: string }>(
      `select public.guardar_instrumento('FCI', 'FONDOB', 'Fondo Ejemplo', 'ARS') as id`,
    )
    const filas = await base.cargaPrecios.consultar<{ id: string; clave: string | null }>(
      'select id, clave from public.instrumentos_a_cotizar()',
    )
    expect(filas.find((f) => f.id === fila!.id)?.clave).toBeNull()
  })

  it('solo la ejecuta carga_precios', async () => {
    const deAna = await errorDe(base.conSesion(ANA).consultar('select * from public.instrumentos_a_cotizar()'))
    expect(deAna.code).toBe('42501')
    const delAnonimo = await errorDe(base.anonimo.consultar('select * from public.instrumentos_a_cotizar()'))
    expect(delAnonimo.code).toBe('42501')
  })
})
