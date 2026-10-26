import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorDe } from './ayudas.ts'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

let base: BaseDePrueba
let banco: string

beforeAll(async () => {
  base = await crearBase()
  const [tipo] = await base.admin.consultar<{ id: string }>(`select id from tipo_cuenta where nombre = 'Banco'`)
  banco = tipo!.id
})

afterAll(async () => {
  await base.cerrar()
})

async function crearPersona(nombre: string, email: string | null = null): Promise<string> {
  const [fila] = await base.admin.consultar<{ id: string }>(
    'insert into persona (nombre, email) values ($1, $2) returning id',
    [nombre, email],
  )
  return fila!.id
}

describe('tipos de cuenta', () => {
  it('vienen cargados en una base nueva', async () => {
    const filas = await base.admin.consultar<{ nombre: string }>('select nombre from tipo_cuenta order by nombre')
    expect(filas.map((f) => f.nombre)).toEqual(['Banco', 'Billetera', 'Comitente del exterior', 'Comitente nacional'])
  })
})

describe('personas (C5)', () => {
  it('una persona con nombre se guarda y se le puede asignar una cuenta', async () => {
    const ana = await crearPersona('Ana')
    const [cuenta] = await base.admin.consultar<{ persona_id: string }>(
      `insert into cuenta (persona_id, tipo_cuenta_id, entidad) values ($1, $2, 'Banco Ejemplo') returning persona_id`,
      [ana, banco],
    )
    expect(cuenta?.persona_id).toBe(ana)
  })

  it('sin email es una persona que no entra a la app', async () => {
    const id = await crearPersona('Beto')
    const [fila] = await base.admin.consultar<{ email: string | null }>('select email from persona where id = $1', [id])
    expect(fila?.email).toBeNull()
  })

  it('el email se guarda sin espacios y en minúsculas', async () => {
    const id = await crearPersona('Caro', '  Caro@Example.COM ')
    const [fila] = await base.admin.consultar<{ email: string }>('select email from persona where id = $1', [id])
    expect(fila?.email).toBe('caro@example.com')
  })

  it('un email repetido se rechaza', async () => {
    await crearPersona('Dani', 'dani@example.com')
    const error = await errorDe(crearPersona('Otra Dani', 'DANI@example.com'))
    expect(error.code).toBe('23505')
    expect(error.message).toContain('persona_email_unico')
  })

  it('un nombre vacío se rechaza', async () => {
    const error = await errorDe(crearPersona('   '))
    expect(error.code).toBe('23514')
    expect(error.message).toContain('persona_nombre_no_vacio')
  })
})

describe('cuentas (C6, regla 4)', () => {
  it('una cuenta sin dueño se rechaza', async () => {
    const error = await errorDe(
      base.admin.consultar(`insert into cuenta (tipo_cuenta_id, entidad) values ($1, 'Banco Ejemplo')`, [banco]),
    )
    expect(error.code).toBe('23502')
    expect(error.message).toContain('"persona_id"')
  })

  it('una cuenta de una persona que no existe se rechaza', async () => {
    const error = await errorDe(
      base.admin.consultar(`insert into cuenta (persona_id, tipo_cuenta_id, entidad) values ($1, $2, 'Banco Ejemplo')`, [
        crypto.randomUUID(),
        banco,
      ]),
    )
    expect(error.code).toBe('23503')
    expect(error.message).toContain('cuenta_persona_fk')
  })

  it('una cuenta sin tipo se rechaza', async () => {
    const ana = await crearPersona('Eva')
    const error = await errorDe(
      base.admin.consultar(`insert into cuenta (persona_id, entidad) values ($1, 'Banco Ejemplo')`, [ana]),
    )
    expect(error.code).toBe('23502')
    expect(error.message).toContain('"tipo_cuenta_id"')
  })

  it('una cuenta sin entidad, o con la entidad vacía, se rechaza', async () => {
    const fede = await crearPersona('Fede')
    const sinEntidad = await errorDe(
      base.admin.consultar('insert into cuenta (persona_id, tipo_cuenta_id) values ($1, $2)', [fede, banco]),
    )
    expect(sinEntidad.code).toBe('23502')
    expect(sinEntidad.message).toContain('"entidad"')

    const vacia = await errorDe(
      base.admin.consultar(`insert into cuenta (persona_id, tipo_cuenta_id, entidad) values ($1, $2, '  ')`, [fede, banco]),
    )
    expect(vacia.code).toBe('23514')
    expect(vacia.message).toContain('cuenta_entidad_no_vacia')
  })
})

describe('borrar una persona en uso (C7)', () => {
  it('una persona con cuentas no se borra y el error nombra la restricción de cuentas', async () => {
    const gabi = await crearPersona('Gabi')
    await base.admin.consultar(
      `insert into cuenta (persona_id, tipo_cuenta_id, entidad) values ($1, $2, 'Broker Ejemplo')`,
      [gabi, banco],
    )
    const error = await errorDe(base.admin.consultar('delete from persona where id = $1', [gabi]))
    expect(error.code).toBe('23503')
    expect(error.message).toContain('cuenta_persona_fk')
  })

  it('una persona sin nada asignado se borra', async () => {
    const hugo = await crearPersona('Hugo')
    await base.admin.consultar('delete from persona where id = $1', [hugo])
    const filas = await base.admin.consultar('select 1 from persona where id = $1', [hugo])
    expect(filas).toEqual([])
  })
})
