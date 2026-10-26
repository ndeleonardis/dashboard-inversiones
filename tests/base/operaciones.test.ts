import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorDe } from './ayudas.ts'
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

type Escenario = { cuenta: string; instrumento: string; ticker: string }

/** Una persona con una cuenta y un instrumento en pesos, sin operaciones. */
async function escenario(): Promise<Escenario> {
  contador += 1
  const ticker = `TICK${contador}`
  const [persona] = await base.admin.consultar<{ id: string }>(
    `insert into persona (nombre) values ($1) returning id`,
    [`Persona ${contador}`],
  )
  const [cuenta] = await base.admin.consultar<{ id: string }>(
    `insert into cuenta (persona_id, tipo_cuenta_id, entidad) values ($1, $2, 'Broker Ejemplo') returning id`,
    [persona!.id, banco],
  )
  const [instrumento] = await base.admin.consultar<{ id: string }>(
    `insert into instrumento (tipo, ticker, nombre, moneda) values ('CEDEAR', $1, 'Ejemplo', 'ARS') returning id`,
    [ticker],
  )
  return { cuenta: cuenta!.id, instrumento: instrumento!.id, ticker }
}

function operar(e: Escenario, tipo: string, fecha: string, cantidad: number | string, precio: number | string = 100) {
  return base.admin.consultar<{ id: string; comision: string }>(
    `insert into operacion (cuenta_id, instrumento_id, tipo, fecha, cantidad, precio_unitario, moneda)
     values ($1, $2, $3, $4, $5, $6, 'ARS') returning id, comision`,
    [e.cuenta, e.instrumento, tipo, fecha, cantidad, precio],
  )
}

describe('datos obligatorios de una operación (C11, regla 4)', () => {
  it('sin cuenta, sin instrumento, sin fecha o sin precio se rechaza', async () => {
    const e = await escenario()
    const casos: { columna: string; sql: string; parametros: string[] }[] = [
      {
        columna: 'cuenta_id',
        sql: `insert into operacion (instrumento_id, tipo, fecha, cantidad, precio_unitario, moneda)
              values ($1, 'COMPRA', '2026-01-10', 1, 1, 'ARS')`,
        parametros: [e.instrumento],
      },
      {
        columna: 'instrumento_id',
        sql: `insert into operacion (cuenta_id, tipo, fecha, cantidad, precio_unitario, moneda)
              values ($1, 'COMPRA', '2026-01-10', 1, 1, 'ARS')`,
        parametros: [e.cuenta],
      },
      {
        columna: 'fecha',
        sql: `insert into operacion (cuenta_id, instrumento_id, tipo, cantidad, precio_unitario, moneda)
              values ($1, $2, 'COMPRA', 1, 1, 'ARS')`,
        parametros: [e.cuenta, e.instrumento],
      },
      {
        columna: 'precio_unitario',
        sql: `insert into operacion (cuenta_id, instrumento_id, tipo, fecha, cantidad, moneda)
              values ($1, $2, 'COMPRA', '2026-01-10', 1, 'ARS')`,
        parametros: [e.cuenta, e.instrumento],
      },
    ]
    for (const { columna, sql, parametros } of casos) {
      const error = await errorDe(base.admin.consultar(sql, parametros))
      expect(error.code, columna).toBe('23502')
      expect(error.message).toContain(`"${columna}"`)
    }
  })

  it('una cuenta que no existe se rechaza', async () => {
    const e = await escenario()
    const error = await errorDe(operar({ ...e, cuenta: crypto.randomUUID() }, 'COMPRA', '2026-01-10', 1))
    expect(error.code).toBe('23503')
    expect(error.message).toContain('operacion_cuenta_fk')
  })

  it('una cantidad en cero o negativa se rechaza', async () => {
    const e = await escenario()
    for (const cantidad of [0, -3]) {
      const error = await errorDe(operar(e, 'COMPRA', '2026-01-10', cantidad))
      expect(error.code).toBe('23514')
      expect(error.message).toContain('operacion_cantidad_positiva')
    }
  })

  it('un precio en cero se rechaza', async () => {
    const e = await escenario()
    const error = await errorDe(operar(e, 'COMPRA', '2026-01-10', 1, 0))
    expect(error.code).toBe('23514')
    expect(error.message).toContain('operacion_precio_positivo')
  })

  it('la comisión es opcional y vacía queda en cero', async () => {
    const e = await escenario()
    const [fila] = await operar(e, 'COMPRA', '2026-01-10', 1)
    expect(Number(fila?.comision)).toBe(0)
  })

  it('una comisión negativa se rechaza', async () => {
    const e = await escenario()
    const error = await errorDe(
      base.admin.consultar(
        `insert into operacion (cuenta_id, instrumento_id, tipo, fecha, cantidad, precio_unitario, moneda, comision)
         values ($1, $2, 'COMPRA', '2026-01-10', 1, 1, 'ARS', -1)`,
        [e.cuenta, e.instrumento],
      ),
    )
    expect(error.code).toBe('23514')
    expect(error.message).toContain('operacion_comision_no_negativa')
  })

  it('una cantidad con más de 8 decimales se rechaza, no se redondea', async () => {
    const e = await escenario()
    const error = await errorDe(operar(e, 'COMPRA', '2026-01-10', '0.123456789'))
    expect(error.code).toBe('23514')
    expect(error.message).toContain('operacion_cantidad_decimales')
  })

  it('una comisión con más de 2 decimales se rechaza', async () => {
    const e = await escenario()
    const error = await errorDe(
      base.admin.consultar(
        `insert into operacion (cuenta_id, instrumento_id, tipo, fecha, cantidad, precio_unitario, moneda, comision)
         values ($1, $2, 'COMPRA', '2026-01-10', 1, 1, 'ARS', '1.005')`,
        [e.cuenta, e.instrumento],
      ),
    )
    expect(error.code).toBe('23514')
    expect(error.message).toContain('operacion_comision_decimales')
  })
})

describe('venta sin respaldo (C14)', () => {
  it('con 10 en cartera, una venta de 15 se rechaza y dice que hay 10', async () => {
    const e = await escenario()
    await operar(e, 'COMPRA', '2026-01-10', 10)
    const error = await errorDe(operar(e, 'VENTA', '2026-02-10', 15))
    expect(error.code).toBe('LH001')
    expect(error.message).toContain('solo tiene 10')
    expect(JSON.parse(error.detail ?? '{}')).toMatchObject({
      fecha: '2026-02-10',
      cantidad: 15,
      disponible: 10,
      ticker: e.ticker,
    })
  })

  it('vender todo lo que hay se permite', async () => {
    const e = await escenario()
    await operar(e, 'COMPRA', '2026-01-10', 10)
    await operar(e, 'VENTA', '2026-02-10', 10)
  })

  it('una venta cargada antes que la compra del mismo día se rechaza', async () => {
    const e = await escenario()
    const error = await errorDe(operar(e, 'VENTA', '2026-01-10', 5))
    expect(error.code).toBe('LH001')
    await operar(e, 'COMPRA', '2026-01-10', 5)
    await operar(e, 'VENTA', '2026-01-10', 5)
  })
})

describe('editar o borrar una compra vieja', () => {
  it('mover una compra para que quede después de su venta se rechaza y nombra la venta', async () => {
    const e = await escenario()
    const [compra] = await operar(e, 'COMPRA', '2026-01-10', 10)
    const [venta] = await operar(e, 'VENTA', '2026-02-10', 10)
    const error = await errorDe(
      base.admin.consultar(`update operacion set fecha = '2026-03-01' where id = $1`, [compra!.id]),
    )
    expect(error.code).toBe('LH001')
    expect(JSON.parse(error.detail ?? '{}')).toMatchObject({ operacion_id: venta!.id, fecha: '2026-02-10' })
  })

  it('bajar la cantidad de una compra por debajo de lo vendido se rechaza', async () => {
    const e = await escenario()
    const [compra] = await operar(e, 'COMPRA', '2026-01-10', 10)
    await operar(e, 'VENTA', '2026-02-10', 8)
    const error = await errorDe(base.admin.consultar(`update operacion set cantidad = 5 where id = $1`, [compra!.id]))
    expect(error.code).toBe('LH001')
  })

  it('borrar la compra de una venta se rechaza', async () => {
    const e = await escenario()
    const [compra] = await operar(e, 'COMPRA', '2026-01-10', 10)
    await operar(e, 'VENTA', '2026-02-10', 10)
    const error = await errorDe(base.admin.consultar('delete from operacion where id = $1', [compra!.id]))
    expect(error.code).toBe('LH001')
  })

  it('pasar la compra a otra cuenta deja la venta sin respaldo y se rechaza', async () => {
    const e = await escenario()
    const otra = await escenario()
    const [compra] = await operar(e, 'COMPRA', '2026-01-10', 10)
    await operar(e, 'VENTA', '2026-02-10', 10)
    const error = await errorDe(
      base.admin.consultar('update operacion set cuenta_id = $1 where id = $2', [otra.cuenta, compra!.id]),
    )
    expect(error.code).toBe('LH001')
  })
})

describe('moneda de la operación (decisión 1)', () => {
  it('una operación en otra moneda que la del instrumento se rechaza', async () => {
    const e = await escenario()
    const error = await errorDe(
      base.admin.consultar(
        `insert into operacion (cuenta_id, instrumento_id, tipo, fecha, cantidad, precio_unitario, moneda)
         values ($1, $2, 'COMPRA', '2026-01-10', 1, 1, 'USD')`,
        [e.cuenta, e.instrumento],
      ),
    )
    expect(error.code).toBe('23503')
    expect(error.message).toContain('operacion_moneda_instrumento_fk')
  })

  it('cambiar la moneda de un instrumento con operaciones se rechaza', async () => {
    const e = await escenario()
    await operar(e, 'COMPRA', '2026-01-10', 1)
    const error = await errorDe(
      base.admin.consultar(`update instrumento set moneda = 'USD' where id = $1`, [e.instrumento]),
    )
    expect(error.code).toBe('23503')
    expect(error.message).toContain('operacion_moneda_instrumento_fk')
  })
})

describe('borrar algo con operaciones (C7)', () => {
  it('una cuenta con operaciones no se borra', async () => {
    const e = await escenario()
    await operar(e, 'COMPRA', '2026-01-10', 1)
    const error = await errorDe(base.admin.consultar('delete from cuenta where id = $1', [e.cuenta]))
    expect(error.code).toBe('23503')
    expect(error.message).toContain('operacion_cuenta_fk')
  })

  it('un instrumento con operaciones no se borra', async () => {
    const e = await escenario()
    await operar(e, 'COMPRA', '2026-01-10', 1)
    const error = await errorDe(base.admin.consultar('delete from instrumento where id = $1', [e.instrumento]))
    expect(error.code).toBe('23503')
    expect(error.message).toContain('operacion_instrumento_fk')
  })
})

describe('tipos de operación', () => {
  it('vienen cargadas la compra y la venta', async () => {
    const filas = await base.admin.consultar<{ codigo: string }>('select codigo from tipo_operacion order by codigo')
    expect(filas.map((f) => f.codigo)).toEqual(['COMPRA', 'VENTA'])
  })

  it('un tipo sin regla para la posición se rechaza al cargarlo (C30)', async () => {
    const e = await escenario()
    await base.admin.consultar(`insert into tipo_operacion (codigo, nombre) values ('DIVIDENDO', 'Dividendo')`)
    const error = await errorDe(operar(e, 'DIVIDENDO', '2026-01-10', 1))
    expect(error.code).toBe('LH002')
    await base.admin.consultar(`delete from tipo_operacion where codigo = 'DIVIDENDO'`)
  })
})
