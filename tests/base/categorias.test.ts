import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorDe } from './ayudas.ts'
import { crearBase, type BaseDePrueba, type Consultor } from './crear-base.ts'

let base: BaseDePrueba
let ana: Consultor
let anaId: string

beforeAll(async () => {
  base = await crearBase()
  const [persona] = await base.admin.consultar<{ id: string }>(
    `insert into persona (nombre, email) values ('Ana', 'ana@example.com') returning id`,
  )
  anaId = persona!.id
  ana = base.conSesion('ana@example.com')
})

afterAll(async () => {
  await base.cerrar()
})

describe('categorías de cada grupo (C20)', () => {
  it('una categoría nueva de gastos queda para las cargas siguientes', async () => {
    const [mascotas] = await ana.consultar<{ id: string }>(`insert into tipo_gasto (nombre) values ('Mascotas') returning id`)
    const categorias = await ana.consultar<{ nombre: string }>('select nombre from tipo_gasto')
    expect(categorias.map((c) => c.nombre)).toContain('Mascotas')
    await ana.consultar(`insert into gasto (tipo_gasto_id, fecha, monto, moneda) values ($1, '2026-10-05', 100, 'ARS')`, [
      mascotas!.id,
    ])
  })

  it('al renombrar una categoría, los gastos anteriores muestran el nombre nuevo', async () => {
    const [luz] = await ana.consultar<{ id: string }>(`select id from tipo_gasto where nombre = 'Luz'`)
    const [gasto] = await ana.consultar<{ id: string }>(
      `insert into gasto (tipo_gasto_id, fecha, monto, moneda) values ($1, '2026-09-10', 500, 'ARS') returning id`,
      [luz!.id],
    )
    await ana.consultar(`update tipo_gasto set nombre = 'Electricidad' where id = $1`, [luz!.id])
    const [conNombre] = await ana.consultar<{ nombre: string }>(
      'select t.nombre from gasto g join tipo_gasto t on t.id = g.tipo_gasto_id where g.id = $1',
      [gasto!.id],
    )
    expect(conNombre?.nombre).toBe('Electricidad')
  })

  it('lo mismo con las de ingresos', async () => {
    const [premio] = await ana.consultar<{ id: string }>(`insert into tipo_ingreso (nombre) values ('Premio') returning id`)
    await ana.consultar(
      `insert into ingreso (tipo_ingreso_id, persona_id, fecha, monto, moneda) values ($1, $2, '2026-10-01', 100, 'USD')`,
      [premio!.id, anaId],
    )
    await ana.consultar(`update tipo_ingreso set nombre = 'Bono' where id = $1`, [premio!.id])
    const [conNombre] = await ana.consultar<{ nombre: string }>(
      'select t.nombre from ingreso i join tipo_ingreso t on t.id = i.tipo_ingreso_id where t.id = $1',
      [premio!.id],
    )
    expect(conNombre?.nombre).toBe('Bono')
  })

  it('un nombre repetido se rechaza, sin importar mayúsculas ni espacios', async () => {
    const deGasto = await errorDe(ana.consultar(`insert into tipo_gasto (nombre) values ('  súper ')`))
    expect(deGasto.code).toBe('23505')
    expect(deGasto.constraint).toBe('tipo_gasto_nombre_unico')
    const deIngreso = await errorDe(ana.consultar(`insert into tipo_ingreso (nombre) values ('SUELDO')`))
    expect(deIngreso.constraint).toBe('tipo_ingreso_nombre_unico')
    const alRenombrar = await errorDe(ana.consultar(`update tipo_gasto set nombre = 'Agua' where nombre = 'Gas'`))
    expect(alRenombrar.constraint).toBe('tipo_gasto_nombre_unico')
  })
})
