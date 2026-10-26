// Regla 1: todo en español. Cada restricción y cada dato obligatorio de la
// base tiene su mensaje para la pantalla, así nunca se muestra el texto de
// Postgres. Si una migración suma una restricción, este test pide su mensaje.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CLAVES_FORANEAS, MENSAJES_DE_COLUMNA, MENSAJES_DE_RESTRICCION } from '../../src/datos/errores.ts'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

let base: BaseDePrueba

beforeAll(async () => {
  base = await crearBase()
})

afterAll(async () => {
  await base.cerrar()
})

describe('mensajes en español para la base (regla 1)', () => {
  it('cada control y cada dato único tiene su mensaje', async () => {
    // Las claves primarias no están: los id los pone la base y no se repiten.
    const filas = await base.admin.consultar<{ nombre: string }>(
      `select conname as nombre from pg_constraint
       where connamespace = 'public'::regnamespace and contype in ('c', 'u', 'x')
       union
       select c.relname from pg_index i join pg_class c on c.oid = i.indexrelid
       where c.relnamespace = 'public'::regnamespace and i.indisunique and not i.indisprimary
         and not exists (select 1 from pg_constraint k where k.conindid = i.indexrelid)
       order by 1`,
    )
    expect(filas.length).toBeGreaterThan(0)
    expect(filas.map((f) => f.nombre).filter((nombre) => !(nombre in MENSAJES_DE_RESTRICCION))).toEqual([])
  })

  it('cada clave foránea tiene su mensaje para cuando se borra y para cuando se guarda', async () => {
    const filas = await base.admin.consultar<{ nombre: string }>(
      `select conname as nombre from pg_constraint
       where connamespace = 'public'::regnamespace and contype = 'f' order by 1`,
    )
    expect(filas.length).toBeGreaterThan(0)
    expect(filas.map((f) => f.nombre).filter((nombre) => !(nombre in CLAVES_FORANEAS))).toEqual([])
  })

  it('cada dato obligatorio que carga la persona tiene su mensaje', async () => {
    const filas = await base.admin.consultar<{ columna: string }>(
      `select distinct a.attname as columna
       from pg_attribute a join pg_class c on c.oid = a.attrelid
       where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
         and a.attnum > 0 and not a.attisdropped and a.attnotnull
         and not a.atthasdef and a.attidentity = ''
       order by 1`,
    )
    expect(filas.length).toBeGreaterThan(0)
    expect(filas.map((f) => f.columna).filter((columna) => !(columna in MENSAJES_DE_COLUMNA))).toEqual([])
  })
})
