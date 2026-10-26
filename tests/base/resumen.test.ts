import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { crearBase, type BaseDePrueba, type Consultor } from './crear-base.ts'

let base: BaseDePrueba
let ana: Consultor
const ids: Record<string, string> = {}

beforeAll(async () => {
  base = await crearBase()
  const consultar = base.admin.consultar
  const [personaAna] = await consultar<{ id: string }>(
    `insert into persona (nombre, email) values ('Ana', 'ana@example.com') returning id`,
  )
  const [personaBeto] = await consultar<{ id: string }>(`insert into persona (nombre) values ('Beto') returning id`)
  ids.ana = personaAna!.id
  ids.beto = personaBeto!.id
  const [sueldo] = await consultar<{ id: string }>(`select id from tipo_ingreso where nombre = 'Sueldo'`)
  const [supermercado] = await consultar<{ id: string }>(`select id from tipo_gasto where nombre = 'Súper'`)
  ids.sueldo = sueldo!.id
  ids.supermercado = supermercado!.id
  ana = base.conSesion('ana@example.com')
})

afterAll(async () => {
  await base.cerrar()
})

async function ingreso(persona: string, fecha: string, monto: number, moneda: 'ARS' | 'USD') {
  await base.admin.consultar(
    `insert into ingreso (tipo_ingreso_id, persona_id, fecha, monto, moneda) values ($1, $2, $3, $4, $5)`,
    [ids.sueldo, persona, fecha, monto, moneda],
  )
}

async function gasto(fecha: string, monto: number, moneda: 'ARS' | 'USD', persona: string | null = null) {
  const [fila] = await base.admin.consultar<{ id: string }>(
    `insert into gasto (tipo_gasto_id, persona_id, fecha, monto, moneda) values ($1, $2, $3, $4, $5) returning id`,
    [ids.supermercado, persona, fecha, monto, moneda],
  )
  return fila!.id
}

type FilaMes = { moneda: string; ingresos: number; gastos: number; queda: number }

async function resumenDelMes(mes: string, quien: Consultor = ana): Promise<FilaMes[]> {
  const filas = await quien.consultar<Record<keyof FilaMes, string>>('select * from public.resumen_mes($1)', [mes])
  return filas.map((f) => ({
    moneda: f.moneda,
    ingresos: Number(f.ingresos),
    gastos: Number(f.gastos),
    queda: Number(f.queda),
  }))
}

describe('el mes del grupo (C21, C22)', () => {
  beforeAll(async () => {
    // Octubre: los mismos números en pesos y en dólares, así una mezcla se nota.
    await ingreso(ids.ana!, '2026-10-01', 1000, 'ARS')
    await ingreso(ids.beto!, '2026-10-31', 1000, 'USD')
    await gasto('2026-10-05', 300, 'ARS')
    await gasto('2026-10-06', 100, 'ARS', ids.ana!)
    await gasto('2026-10-20', 100, 'USD')
    // Septiembre y noviembre no cuentan para octubre.
    await ingreso(ids.ana!, '2026-09-30', 5000, 'ARS')
    await gasto('2026-11-01', 999, 'USD')
  })

  it('cada moneda tiene sus ingresos, sus gastos y lo que queda, sin mezclarse (regla 2)', async () => {
    expect(await resumenDelMes('2026-10-15')).toEqual([
      { moneda: 'ARS', ingresos: 1000, gastos: 400, queda: 600 },
      { moneda: 'USD', ingresos: 1000, gastos: 100, queda: 900 },
    ])
  })

  it('otro mes devuelve solo lo de ese mes', async () => {
    expect(await resumenDelMes('2026-09-01')).toEqual([
      { moneda: 'ARS', ingresos: 5000, gastos: 0, queda: 5000 },
      { moneda: 'USD', ingresos: 0, gastos: 0, queda: 0 },
    ])
  })

  it('un mes sin movimientos devuelve las dos monedas en cero', async () => {
    expect(await resumenDelMes('2025-01-01')).toEqual([
      { moneda: 'ARS', ingresos: 0, gastos: 0, queda: 0 },
      { moneda: 'USD', ingresos: 0, gastos: 0, queda: 0 },
    ])
  })

  it('editar o borrar un gasto cambia el resumen (C19)', async () => {
    const id = await gasto('2026-12-10', 50, 'ARS')
    expect((await resumenDelMes('2026-12-01'))[0]?.gastos).toBe(50)
    await ana.consultar('update gasto set monto = 80 where id = $1', [id])
    expect((await resumenDelMes('2026-12-01'))[0]?.gastos).toBe(80)
    await ana.consultar('delete from gasto where id = $1', [id])
    expect((await resumenDelMes('2026-12-01'))[0]?.gastos).toBe(0)
  })

  it('alguien sin invitación no recibe nada', async () => {
    expect(await resumenDelMes('2026-10-15', base.conSesion('intruso@example.com'))).toEqual([])
  })
})

describe('lo invertido a costo de compra (C23)', () => {
  beforeAll(async () => {
    const consultar = base.admin.consultar
    const [banco] = await consultar<{ id: string }>(`select id from tipo_cuenta where nombre = 'Banco'`)
    const [cuenta] = await consultar<{ id: string }>(
      `insert into cuenta (persona_id, tipo_cuenta_id, entidad) values ($1, $2, 'Broker Ejemplo') returning id`,
      [ids.ana, banco!.id],
    )
    const [enPesos] = await consultar<{ id: string }>(
      `insert into instrumento (tipo, ticker, nombre, moneda) values ('CEDEAR', 'EJEM', 'Ejemplo', 'ARS') returning id`,
    )
    const [enDolares] = await consultar<{ id: string }>(
      `insert into instrumento (tipo, ticker, nombre, moneda) values ('CEDEAR', 'EJEMD', 'Ejemplo', 'USD') returning id`,
    )
    // 1.000 en pesos y 1.000 en dólares: si se mezclaran, aparecería 2.000.
    await consultar(
      `insert into operacion (cuenta_id, instrumento_id, tipo, fecha, cantidad, precio_unitario, moneda)
       values ($1, $2, 'COMPRA', '2026-10-01', 10, 100, 'ARS'), ($1, $3, 'COMPRA', '2026-10-01', 10, 100, 'USD')`,
      [cuenta!.id, enPesos!.id, enDolares!.id],
    )
  })

  it('cada persona tiene su total por moneda, y la que no invirtió aparece marcada', async () => {
    const filas = await ana.consultar<{ nombre: string; moneda: string; costo: string; tiene_inversiones: boolean }>(
      'select nombre, moneda, costo, tiene_inversiones from invertido_por_persona order by nombre, moneda',
    )
    expect(filas.map((f) => ({ ...f, costo: Number(f.costo) }))).toEqual([
      { nombre: 'Ana', moneda: 'ARS', costo: 1000, tiene_inversiones: true },
      { nombre: 'Ana', moneda: 'USD', costo: 1000, tiene_inversiones: true },
      { nombre: 'Beto', moneda: 'ARS', costo: 0, tiene_inversiones: false },
      { nombre: 'Beto', moneda: 'USD', costo: 0, tiene_inversiones: false },
    ])
  })

  it('el grupo tiene su total por moneda, sin mezclar (regla 2)', async () => {
    const filas = await ana.consultar<{ moneda: string; costo: string }>(
      'select moneda, costo from invertido_grupo order by moneda',
    )
    expect(filas.map((f) => ({ moneda: f.moneda, costo: Number(f.costo) }))).toEqual([
      { moneda: 'ARS', costo: 1000 },
      { moneda: 'USD', costo: 1000 },
    ])
  })

  it('alguien sin invitación no recibe nada', async () => {
    const intruso = base.conSesion('intruso@example.com')
    expect(await intruso.consultar('select * from invertido_grupo')).toEqual([])
    expect(await intruso.consultar('select * from invertido_por_persona')).toEqual([])
  })
})
