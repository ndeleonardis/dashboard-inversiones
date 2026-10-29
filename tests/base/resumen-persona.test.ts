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
  const [personaCaro] = await consultar<{ id: string }>(`insert into persona (nombre) values ('Caro') returning id`)
  const [sueldo] = await consultar<{ id: string }>(`select id from tipo_ingreso where nombre = 'Sueldo'`)
  const [supermercado] = await consultar<{ id: string }>(`select id from tipo_gasto where nombre = 'Súper'`)
  Object.assign(ids, {
    ana: personaAna!.id,
    beto: personaBeto!.id,
    caro: personaCaro!.id,
    sueldo: sueldo!.id,
    supermercado: supermercado!.id,
  })
  ana = base.conSesion('ana@example.com')

  // Octubre: cada uno cobra lo suyo, cada uno gasta algo y hay gastos comunitarios.
  await ingreso(ids.ana!, '2026-10-01', 1000, 'ARS')
  await ingreso(ids.beto!, '2026-10-01', 2000, 'ARS')
  await ingreso(ids.ana!, '2026-10-02', 50, 'USD')
  await gasto('2026-10-03', 300, 'ARS')
  await gasto('2026-10-04', 100, 'ARS', ids.ana)
  await gasto('2026-10-05', 200, 'ARS', ids.beto)
  await gasto('2026-10-06', 10, 'USD')
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
  await base.admin.consultar(
    `insert into gasto (tipo_gasto_id, persona_id, fecha, monto, moneda) values ($1, $2, $3, $4, $5)`,
    [ids.supermercado, persona, fecha, monto, moneda],
  )
}

type Fila = {
  moneda: string
  ingresos: number
  gastos_asignados: number
  gastos_comunitarios: number
  gastos: number
  queda: number
}

async function resumen(mes: string, persona: string | null = null, quien: Consultor = ana): Promise<Fila[]> {
  const filas = await quien.consultar<Record<keyof Fila, string>>('select * from public.resumen_mes($1, $2)', [
    mes,
    persona,
  ])
  return filas.map((f) => ({
    moneda: f.moneda,
    ingresos: Number(f.ingresos),
    gastos_asignados: Number(f.gastos_asignados),
    gastos_comunitarios: Number(f.gastos_comunitarios),
    gastos: Number(f.gastos),
    queda: Number(f.queda),
  }))
}

const fila = (moneda: string, ingresos: number, asignados: number, comunitarios: number): Fila => ({
  moneda,
  ingresos,
  gastos_asignados: asignados,
  gastos_comunitarios: comunitarios,
  gastos: asignados + comunitarios,
  queda: ingresos - asignados - comunitarios,
})

describe('el mes de una persona (C25)', () => {
  it('sin persona es el mes del grupo, con los gastos separados en asignados y comunitarios', async () => {
    expect(await resumen('2026-10-15')).toEqual([fila('ARS', 3000, 300, 300), fila('USD', 50, 0, 10)])
  })

  it('con una persona se ven sus ingresos y sus gastos, además de los comunitarios del grupo', async () => {
    expect(await resumen('2026-10-15', ids.ana)).toEqual([fila('ARS', 1000, 100, 300), fila('USD', 50, 0, 10)])
    expect(await resumen('2026-10-15', ids.beto)).toEqual([fila('ARS', 2000, 200, 300), fila('USD', 0, 0, 10)])
  })

  it('una persona sin movimientos ve solo los comunitarios, y otro mes da ceros', async () => {
    expect(await resumen('2026-10-15', ids.caro)).toEqual([fila('ARS', 0, 0, 300), fila('USD', 0, 0, 10)])
    expect(await resumen('2026-09-15', ids.ana)).toEqual([fila('ARS', 0, 0, 0), fila('USD', 0, 0, 0)])
  })

  it('alguien sin invitación no recibe nada', async () => {
    expect(await resumen('2026-10-15', ids.ana, base.conSesion('intruso@example.com'))).toEqual([])
  })
})

describe('últimos movimientos (C26)', () => {
  type Movimiento = { clase: string; fecha: string; monto: string; categoria: string; persona: string }

  const ultimos = (quien: Consultor = ana) =>
    quien.consultar<Movimiento>('select clase, fecha::text, monto, categoria, persona from public.ultimos_movimientos')

  it('trae los últimos 10 gastos e ingresos, del más nuevo al más viejo', async () => {
    // Siete de octubre más cinco de noviembre: los dos más viejos quedan afuera.
    for (const dia of [1, 2, 3, 4, 5]) await gasto(`2026-11-0${dia}`, dia, 'ARS')
    const filas = await ultimos()
    expect(filas).toHaveLength(10)
    expect(filas.map((f) => f.fecha)).toEqual([
      '2026-11-05',
      '2026-11-04',
      '2026-11-03',
      '2026-11-02',
      '2026-11-01',
      '2026-10-06',
      '2026-10-05',
      '2026-10-04',
      '2026-10-03',
      '2026-10-02',
    ])
  })

  it('cada movimiento dice si es gasto o ingreso, su categoría y de quién es', async () => {
    const filas = await ultimos()
    expect(filas.find((f) => f.fecha === '2026-10-05')).toMatchObject({ clase: 'gasto', categoria: 'Súper', persona: 'Beto' })
    expect(filas.find((f) => f.fecha === '2026-10-02')).toMatchObject({ clase: 'ingreso', categoria: 'Sueldo', persona: 'Ana' })
    // Un gasto comunitario no tiene persona.
    expect(filas.find((f) => f.fecha === '2026-10-03')).toMatchObject({ clase: 'gasto', persona: '' })
  })

  it('alguien sin invitación no ve nada', async () => {
    expect(await ultimos(base.conSesion('intruso@example.com'))).toEqual([])
  })

  // Va al final porque suma un gasto y deja afuera a los más viejos.
  it('lo último que se cargó va primero, aunque sea de otro mes', async () => {
    await new Promise((listo) => setTimeout(listo, 5)) // para que se cargue después, aunque el reloj vaya de a 1 ms
    await gasto('2026-07-15', 999, 'ARS')
    const filas = await ultimos()
    expect(filas[0]).toMatchObject({ fecha: '2026-07-15', monto: '999' })
    expect(filas).toHaveLength(10)
  })
})
