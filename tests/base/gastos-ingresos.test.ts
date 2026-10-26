import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorDe } from './ayudas.ts'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

let base: BaseDePrueba
let supermercado: string
let sueldo: string
let banco: string

beforeAll(async () => {
  base = await crearBase()
  const [gasto] = await base.admin.consultar<{ id: string }>(`select id from tipo_gasto where nombre = 'Súper'`)
  const [ingreso] = await base.admin.consultar<{ id: string }>(`select id from tipo_ingreso where nombre = 'Sueldo'`)
  const [tipoCuenta] = await base.admin.consultar<{ id: string }>(`select id from tipo_cuenta where nombre = 'Banco'`)
  supermercado = gasto!.id
  sueldo = ingreso!.id
  banco = tipoCuenta!.id
})

afterAll(async () => {
  await base.cerrar()
})

async function crearPersona(nombre: string): Promise<string> {
  const [fila] = await base.admin.consultar<{ id: string }>('insert into persona (nombre) values ($1) returning id', [nombre])
  return fila!.id
}

async function crearCuenta(persona: string): Promise<string> {
  const [fila] = await base.admin.consultar<{ id: string }>(
    `insert into cuenta (persona_id, tipo_cuenta_id, entidad) values ($1, $2, 'Banco Ejemplo') returning id`,
    [persona, banco],
  )
  return fila!.id
}

function cargarGasto(monto: number | string, persona: string | null = null, moneda = 'ARS') {
  return base.admin.consultar<{ id: string; persona_id: string | null }>(
    `insert into gasto (tipo_gasto_id, persona_id, fecha, monto, moneda)
     values ($1, $2, '2026-10-05', $3, $4) returning id, persona_id`,
    [supermercado, persona, monto, moneda],
  )
}

function cargarIngreso(persona: string | null, monto: number | string = 1000, cuenta: string | null = null) {
  return base.admin.consultar<{ id: string }>(
    `insert into ingreso (tipo_ingreso_id, persona_id, cuenta_id, fecha, monto, moneda)
     values ($1, $2, $3, '2026-10-01', $4, 'ARS') returning id`,
    [sueldo, persona, cuenta, monto],
  )
}

describe('categorías precargadas (C18)', () => {
  it('una base nueva trae las 8 categorías de gastos', async () => {
    const filas = await base.admin.consultar<{ nombre: string }>('select nombre from tipo_gasto')
    expect(filas.map((f) => f.nombre).sort()).toEqual(
      ['Agua', 'Colegio', 'Expensas del barrio', 'Gas', 'Luz', 'Nafta', 'Otros', 'Súper'].sort(),
    )
  })

  it('una base nueva trae las 2 categorías de ingresos', async () => {
    const filas = await base.admin.consultar<{ nombre: string }>('select nombre from tipo_ingreso')
    expect(filas.map((f) => f.nombre).sort()).toEqual(['Otros', 'Sueldo'])
  })

  it('una categoría repetida se rechaza aunque cambien las mayúsculas', async () => {
    const error = await errorDe(base.admin.consultar(`insert into tipo_gasto (nombre) values ('SÚPER')`))
    expect(error.code).toBe('23505')
    expect(error.message).toContain('tipo_gasto_nombre_unico')
  })
})

describe('gastos (C16)', () => {
  it('un gasto sin persona se guarda y es comunitario', async () => {
    const [fila] = await cargarGasto(5000)
    expect(fila?.persona_id).toBeNull()
  })

  it('un gasto con persona también se guarda', async () => {
    const ana = await crearPersona('Ana')
    const [fila] = await cargarGasto(5000, ana)
    expect(fila?.persona_id).toBe(ana)
  })

  it('un gasto sin categoría o sin fecha se rechaza', async () => {
    const sinCategoria = await errorDe(
      base.admin.consultar(`insert into gasto (fecha, monto, moneda) values ('2026-10-05', 1, 'ARS')`),
    )
    expect(sinCategoria.code).toBe('23502')
    expect(sinCategoria.message).toContain('"tipo_gasto_id"')

    const sinFecha = await errorDe(
      base.admin.consultar(`insert into gasto (tipo_gasto_id, monto, moneda) values ($1, 1, 'ARS')`, [supermercado]),
    )
    expect(sinFecha.code).toBe('23502')
    expect(sinFecha.message).toContain('"fecha"')
  })
})

describe('ingresos (C17)', () => {
  it('un ingreso sin persona se rechaza', async () => {
    const error = await errorDe(cargarIngreso(null))
    expect(error.code).toBe('23502')
    expect(error.message).toContain('"persona_id"')
  })

  it('un ingreso sin cuenta se guarda, y con cuenta también', async () => {
    const beto = await crearPersona('Beto')
    await cargarIngreso(beto)
    await cargarIngreso(beto, 1000, await crearCuenta(beto))
  })
})

describe('montos', () => {
  it('un monto en cero o negativo se rechaza', async () => {
    for (const monto of [0, -10]) {
      const error = await errorDe(cargarGasto(monto))
      expect(error.code).toBe('23514')
      expect(error.message).toContain('gasto_monto_positivo')
    }
    const caro = await crearPersona('Caro')
    const error = await errorDe(cargarIngreso(caro, 0))
    expect(error.message).toContain('ingreso_monto_positivo')
  })

  it('un monto con 3 decimales se rechaza y no se redondea', async () => {
    const error = await errorDe(cargarGasto('10.005'))
    expect(error.code).toBe('23514')
    expect(error.message).toContain('gasto_monto_decimales')

    const dani = await crearPersona('Dani')
    const deIngreso = await errorDe(cargarIngreso(dani, '10.005'))
    expect(deIngreso.message).toContain('ingreso_monto_decimales')
  })

  it('una moneda que no es ARS ni USD se rechaza (regla 2)', async () => {
    const error = await errorDe(cargarGasto(10, null, 'EUR'))
    expect(error.code).toBe('22P02')
  })
})

describe('borrar algo con gastos o ingresos (C7)', () => {
  it('una persona con gastos asignados no se borra', async () => {
    const eva = await crearPersona('Eva')
    await cargarGasto(100, eva)
    const error = await errorDe(base.admin.consultar('delete from persona where id = $1', [eva]))
    expect(error.code).toBe('23503')
    expect(error.message).toContain('gasto_persona_fk')
  })

  it('una persona con ingresos no se borra', async () => {
    const fede = await crearPersona('Fede')
    await cargarIngreso(fede)
    const error = await errorDe(base.admin.consultar('delete from persona where id = $1', [fede]))
    expect(error.code).toBe('23503')
    expect(error.message).toContain('ingreso_persona_fk')
  })

  it('una cuenta con ingresos no se borra', async () => {
    const gabi = await crearPersona('Gabi')
    const cuenta = await crearCuenta(gabi)
    await cargarIngreso(gabi, 1000, cuenta)
    const error = await errorDe(base.admin.consultar('delete from cuenta where id = $1', [cuenta]))
    expect(error.code).toBe('23503')
    expect(error.message).toContain('ingreso_cuenta_fk')
  })
})
