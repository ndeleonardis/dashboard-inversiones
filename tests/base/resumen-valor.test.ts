// T5. Lo invertido por persona y del grupo suma su valor actual (C40). Si
// algún instrumento no tiene precio, el total es parcial y dice cuántos faltan
// (C41), y no hay rendimiento (C42). Siempre una fila por moneda (regla 2).
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { guardarPrecios } from './ayudas.ts'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

let base: BaseDePrueba
let banco: string
let contador = 0

const MIEMBRO = 'miembro@example.com'

beforeEach(async () => {
  base = await crearBase()
  // invertido_grupo se le muestra solo a un miembro.
  await base.admin.consultar(`insert into persona (nombre, email) values ('Miembro', $1)`, [MIEMBRO])
  const [tipo] = await base.admin.consultar<{ id: string }>(`select id from tipo_cuenta where nombre = 'Banco'`)
  banco = tipo!.id
})

afterEach(async () => {
  await base.cerrar()
})

async function persona(nombre: string): Promise<string> {
  const [fila] = await base.admin.consultar<{ id: string }>(`insert into persona (nombre) values ($1) returning id`, [nombre])
  return fila!.id
}

async function cuenta(personaId: string): Promise<string> {
  const [fila] = await base.admin.consultar<{ id: string }>(
    `insert into cuenta (persona_id, tipo_cuenta_id, entidad) values ($1, $2, 'Broker Ejemplo') returning id`,
    [personaId, banco],
  )
  return fila!.id
}

async function instrumento(moneda: 'ARS' | 'USD'): Promise<string> {
  contador += 1
  const [fila] = await base.admin.consultar<{ id: string }>(
    `insert into instrumento (tipo, ticker, nombre, moneda) values ('CEDEAR', $1, 'Ejemplo', $2) returning id`,
    [`TICK${contador}`, moneda],
  )
  return fila!.id
}

async function comprar(cuentaId: string, instrumentoId: string, moneda: 'ARS' | 'USD', cantidad: number, precio: number) {
  await base.admin.consultar(
    `insert into operacion (cuenta_id, instrumento_id, tipo, fecha, cantidad, precio_unitario, moneda)
     values ($1, $2, 'COMPRA', '2026-10-01', $3, $4, $5)`,
    [cuentaId, instrumentoId, cantidad, precio, moneda],
  )
}

async function cotizar(instrumentoId: string, moneda: 'ARS' | 'USD', valor: number) {
  await guardarPrecios(base.cargaPrecios, [
    { instrumento_id: instrumentoId, fecha: '2026-11-02', valor, cada: 1, moneda, fuente: 'Prueba' },
  ])
}

type Total = {
  moneda: string
  costo: number
  valor: number | null
  instrumentos_sin_precio: number
  rendimiento: number | null
  rendimiento_pct: number | null
}

const aNumero = (v: unknown) => (v === null ? null : Number(v))

function normalizar(filas: Record<string, unknown>[]): Total[] {
  return filas.map((f) => ({
    moneda: String(f.moneda),
    costo: Number(f.costo),
    valor: aNumero(f.valor),
    instrumentos_sin_precio: Number(f.instrumentos_sin_precio),
    rendimiento: aNumero(f.rendimiento),
    rendimiento_pct: aNumero(f.rendimiento_pct),
  }))
}

async function dePersona(personaId: string) {
  return normalizar(
    await base.admin.consultar(
      `select moneda, costo, valor, instrumentos_sin_precio, rendimiento, rendimiento_pct
       from invertido_por_persona where persona_id = $1 order by moneda`,
      [personaId],
    ),
  )
}

async function delGrupo() {
  return normalizar(
    await base.conSesion(MIEMBRO).consultar(
      `select moneda, costo, valor, instrumentos_sin_precio, rendimiento, rendimiento_pct
       from invertido_grupo order by moneda`,
    ),
  )
}

describe('valor de lo invertido (C40)', () => {
  it('cada persona y el grupo tienen costo y valor en cada moneda, sin mezclarlas (regla 2)', async () => {
    const ana = await persona('Ana')
    const beto = await persona('Beto')
    const deAna = await cuenta(ana)
    const deBeto = await cuenta(beto)
    const enPesos = await instrumento('ARS')
    const enDolares = await instrumento('USD')
    // Los mismos números en las dos monedas: si se mezclaran, se notaría.
    await comprar(deAna, enPesos, 'ARS', 10, 100)
    await comprar(deAna, enDolares, 'USD', 10, 100)
    await comprar(deBeto, enPesos, 'ARS', 10, 100)
    await cotizar(enPesos, 'ARS', 110)
    await cotizar(enDolares, 'USD', 90)

    expect(await dePersona(ana)).toEqual([
      { moneda: 'ARS', costo: 1000, valor: 1100, instrumentos_sin_precio: 0, rendimiento: 100, rendimiento_pct: 0.1 },
      { moneda: 'USD', costo: 1000, valor: 900, instrumentos_sin_precio: 0, rendimiento: -100, rendimiento_pct: -0.1 },
    ])
    expect(await delGrupo()).toEqual([
      { moneda: 'ARS', costo: 2000, valor: 2200, instrumentos_sin_precio: 0, rendimiento: 200, rendimiento_pct: 0.1 },
      { moneda: 'USD', costo: 1000, valor: 900, instrumentos_sin_precio: 0, rendimiento: -100, rendimiento_pct: -0.1 },
    ])
  })

  it('una persona sin inversiones tiene valor 0 y ningún rendimiento', async () => {
    const ana = await persona('Ana')
    expect(await dePersona(ana)).toEqual([
      { moneda: 'ARS', costo: 0, valor: 0, instrumentos_sin_precio: 0, rendimiento: null, rendimiento_pct: null },
      { moneda: 'USD', costo: 0, valor: 0, instrumentos_sin_precio: 0, rendimiento: null, rendimiento_pct: null },
    ])
  })
})

describe('totales parciales (C41, C42)', () => {
  it('con un instrumento sin precio, el valor suma lo conocido, dice cuántos faltan y no hay rendimiento', async () => {
    const ana = await persona('Ana')
    const deAna = await cuenta(ana)
    const conPrecio = await instrumento('ARS')
    const sinPrecio = await instrumento('ARS')
    await comprar(deAna, conPrecio, 'ARS', 10, 100)
    await comprar(deAna, sinPrecio, 'ARS', 5, 100)
    await cotizar(conPrecio, 'ARS', 110)

    const [enPesos] = await dePersona(ana)
    expect(enPesos).toEqual({
      moneda: 'ARS',
      costo: 1500,
      valor: 1100,
      instrumentos_sin_precio: 1,
      rendimiento: null,
      rendimiento_pct: null,
    })
  })

  it('si ningún instrumento tiene precio, el valor es null y no 0 (regla 5)', async () => {
    const ana = await persona('Ana')
    const deAna = await cuenta(ana)
    await comprar(deAna, await instrumento('ARS'), 'ARS', 10, 100)
    const [enPesos] = await dePersona(ana)
    expect(enPesos?.valor).toBeNull()
    expect(enPesos?.instrumentos_sin_precio).toBe(1)
  })

  it('un instrumento sin precio en dos cuentas cuenta una sola vez en el grupo', async () => {
    const ana = await persona('Ana')
    const beto = await persona('Beto')
    const sinPrecio = await instrumento('ARS')
    await comprar(await cuenta(ana), sinPrecio, 'ARS', 10, 100)
    await comprar(await cuenta(beto), sinPrecio, 'ARS', 10, 100)
    const [enPesos] = await delGrupo()
    expect(enPesos?.instrumentos_sin_precio).toBe(1)
  })
})
