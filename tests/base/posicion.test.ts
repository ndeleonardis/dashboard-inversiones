import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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

async function escenario(tipo = 'CEDEAR'): Promise<Escenario> {
  contador += 1
  const [persona] = await base.admin.consultar<{ id: string }>(`insert into persona (nombre) values ($1) returning id`, [
    `Persona ${contador}`,
  ])
  const [cuenta] = await base.admin.consultar<{ id: string }>(
    `insert into cuenta (persona_id, tipo_cuenta_id, entidad) values ($1, $2, 'Broker Ejemplo') returning id`,
    [persona!.id, banco],
  )
  const [instrumento] = await base.admin.consultar<{ id: string }>(
    `insert into instrumento (tipo, ticker, nombre, moneda, vencimiento)
     values ($1, $2, 'Ejemplo', 'ARS', $3) returning id`,
    [tipo, `TICK${contador}`, tipo === 'ON' ? '2030-06-30' : null],
  )
  return { cuenta: cuenta!.id, instrumento: instrumento!.id }
}

async function operar(
  e: Escenario,
  tipo: 'COMPRA' | 'VENTA',
  fecha: string,
  cantidad: number | string,
  precio: number | string,
  comision: number | string = 0,
) {
  const [fila] = await base.admin.consultar<{ id: string }>(
    `insert into operacion (cuenta_id, instrumento_id, tipo, fecha, cantidad, precio_unitario, moneda, comision)
     values ($1, $2, $3, $4, $5, $6, 'ARS', $7) returning id`,
    [e.cuenta, e.instrumento, tipo, fecha, cantidad, precio, comision],
  )
  return fila!.id
}

async function posicion(e: Escenario): Promise<{ cantidad: number; costo: number } | undefined> {
  const [fila] = await base.admin.consultar<{ cantidad: string; costo: string }>(
    'select cantidad, costo from posicion where cuenta_id = $1 and instrumento_id = $2',
    [e.cuenta, e.instrumento],
  )
  return fila && { cantidad: Number(fila.cantidad), costo: Number(fila.costo) }
}

describe('costo promedio (C12)', () => {
  it('el ejemplo de la spec: 10 a $ 100, 10 a $ 200 y una venta de 5 dan 15 con costo $ 2.250', async () => {
    const e = await escenario()
    await operar(e, 'COMPRA', '2026-01-10', 10, 100)
    await operar(e, 'COMPRA', '2026-02-10', 10, 200)
    await operar(e, 'VENTA', '2026-03-10', 5, 999)
    expect(await posicion(e)).toEqual({ cantidad: 15, costo: 2250 })
  })

  it('la comisión de la compra suma al costo y la de la venta no lo cambia', async () => {
    const e = await escenario()
    await operar(e, 'COMPRA', '2026-01-10', 10, 100, 50)
    expect(await posicion(e)).toEqual({ cantidad: 10, costo: 1050 })
    await operar(e, 'VENTA', '2026-02-10', 5, 500, 30)
    expect(await posicion(e)).toEqual({ cantidad: 5, costo: 525 })
  })

  it('una ON cotiza cada 100: 1.000 de valor nominal a 102,50 cuestan 1.025 más la comisión', async () => {
    const e = await escenario('ON')
    await operar(e, 'COMPRA', '2026-01-10', 1000, '102.50', 5)
    expect(await posicion(e)).toEqual({ cantidad: 1000, costo: 1030 })
  })

  it('al vender todo la posición desaparece y una compra nueva arranca sin restos', async () => {
    // 3 a $ 100 más $ 1 de comisión da un promedio que no es exacto
    // (100,333…). Sin cuidado, al vender todo quedaría un resto de 0,0000000000000001.
    const e = await escenario()
    await operar(e, 'COMPRA', '2026-01-10', 3, 100, 1)
    await operar(e, 'VENTA', '2026-02-10', 3, 400)
    expect(await posicion(e)).toBeUndefined()
    await operar(e, 'COMPRA', '2026-03-10', 1, 10)
    const [fila] = await base.admin.consultar<{ costo: string }>(
      'select costo::text as costo from posicion where cuenta_id = $1',
      [e.cuenta],
    )
    expect(fila?.costo).toMatch(/^10(\.0*)?$/)
  })
})

describe('la posición sigue a las operaciones (C13)', () => {
  it('editar el precio de una compra cambia el costo', async () => {
    const e = await escenario()
    const compra = await operar(e, 'COMPRA', '2026-01-10', 10, 100)
    await base.admin.consultar('update operacion set precio_unitario = 120 where id = $1', [compra])
    expect(await posicion(e)).toEqual({ cantidad: 10, costo: 1200 })
  })

  it('borrar una venta devuelve la cantidad', async () => {
    const e = await escenario()
    await operar(e, 'COMPRA', '2026-01-10', 10, 100)
    const venta = await operar(e, 'VENTA', '2026-02-10', 4, 150)
    expect(await posicion(e)).toEqual({ cantidad: 6, costo: 600 })
    await base.admin.consultar('delete from operacion where id = $1', [venta])
    expect(await posicion(e)).toEqual({ cantidad: 10, costo: 1000 })
  })
})

describe('operaciones del mismo día (decisión 3)', () => {
  it('se aplican en el orden de carga: primero la venta y después la compra', async () => {
    const e = await escenario()
    await operar(e, 'COMPRA', '2026-01-10', 10, 100)
    await operar(e, 'VENTA', '2026-02-10', 10, 150)
    await operar(e, 'COMPRA', '2026-02-10', 10, 200)
    expect(await posicion(e)).toEqual({ cantidad: 10, costo: 2000 })
  })

  it('se aplican en el orden de carga: primero la compra y después la venta', async () => {
    const e = await escenario()
    await operar(e, 'COMPRA', '2026-01-10', 10, 100)
    await operar(e, 'COMPRA', '2026-02-10', 10, 200)
    await operar(e, 'VENTA', '2026-02-10', 10, 150)
    expect(await posicion(e)).toEqual({ cantidad: 10, costo: 1500 })
  })
})

describe('forma de la vista', () => {
  it('tiene solo cantidad y costo, sin ningún valor actual que pueda salir en cero (regla 5)', async () => {
    const columnas = await base.admin.consultar<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'posicion' order by ordinal_position`,
    )
    expect(columnas.map((c) => c.column_name)).toEqual([
      'cuenta_id',
      'persona_id',
      'instrumento_id',
      'moneda',
      'cantidad',
      'costo',
    ])
  })

  it('respeta los permisos de quien consulta (security_invoker)', async () => {
    const [fila] = await base.admin.consultar<{ opciones: string[] }>(
      `select reloptions as opciones from pg_class where relname = 'posicion' and relnamespace = 'public'::regnamespace`,
    )
    expect(fila?.opciones).toContain('security_invoker=true')
  })
})
