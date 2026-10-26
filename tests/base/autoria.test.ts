import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

let base: BaseDePrueba
let supermercado: string

const ANA = 'ana@example.com'
const BETO = 'beto@example.com'

beforeAll(async () => {
  base = await crearBase()
  await base.admin.consultar(`insert into persona (nombre, email) values ('Ana', $1), ('Beto', $2)`, [ANA, BETO])
  const [tipo] = await base.admin.consultar<{ id: string }>(`select id from tipo_gasto where nombre = 'Súper'`)
  supermercado = tipo!.id
})

afterAll(async () => {
  await base.cerrar()
})

type Autoria = {
  creado_por: string | null
  creado_en: Date | null
  modificado_por: string | null
  modificado_en: Date | null
}

async function autoriaDelGasto(id: string): Promise<Autoria & { monto: string }> {
  const [fila] = await base.admin.consultar<Autoria & { monto: string }>(
    'select monto, creado_por, creado_en, modificado_por, modificado_en from gasto where id = $1',
    [id],
  )
  return fila!
}

async function cargarGastoComo(email: string, monto: number, columnasExtra = '', valoresExtra = ''): Promise<string> {
  const [fila] = await base
    .conSesion(email)
    .consultar<{ id: string }>(
      `insert into gasto (tipo_gasto_id, fecha, monto, moneda${columnasExtra})
       values ($1, '2026-10-05', $2, 'ARS'${valoresExtra}) returning id`,
      [supermercado, monto],
    )
  return fila!.id
}

describe('quién cargó cada cosa (C27)', () => {
  it('lo que carga una persona queda con su email y la hora', async () => {
    const antes = Date.now()
    const id = await cargarGastoComo(ANA, 100)
    const autoria = await autoriaDelGasto(id)
    expect(autoria.creado_por).toBe(ANA)
    expect(autoria.creado_en!.getTime()).toBeGreaterThanOrEqual(antes - 1000)
    expect(autoria.modificado_por).toBeNull()
    expect(autoria.modificado_en).toBeNull()
  })

  it('si la app manda otro creado_por, se ignora', async () => {
    const id = await cargarGastoComo(ANA, 100, ', creado_por, creado_en', `, '${BETO}', '2001-01-01'`)
    const autoria = await autoriaDelGasto(id)
    expect(autoria.creado_por).toBe(ANA)
    expect(autoria.creado_en!.getFullYear()).not.toBe(2001)
  })

  it('una edición registra quién la hizo y no cambia quién la cargó', async () => {
    const id = await cargarGastoComo(ANA, 100)
    await base.conSesion(BETO).consultar(`update gasto set monto = 150, creado_por = 'otro@example.com' where id = $1`, [id])
    const autoria = await autoriaDelGasto(id)
    expect(autoria.creado_por).toBe(ANA)
    expect(autoria.modificado_por).toBe(BETO)
    expect(autoria.modificado_en).not.toBeNull()
  })

  it('lo que se carga desde el panel de Supabase queda sin email', async () => {
    const [fila] = await base.admin.consultar<{ creado_por: string | null }>(
      `insert into persona (nombre) values ('Caro') returning creado_por`,
    )
    expect(fila?.creado_por).toBeNull()
  })
})

describe('dos personas editan lo mismo a la vez', () => {
  it('gana la última edición y queda registrado quién la hizo', async () => {
    const id = await cargarGastoComo(ANA, 100)
    await base.conSesion(ANA).consultar('update gasto set monto = 200 where id = $1', [id])
    await base.conSesion(BETO).consultar('update gasto set monto = 300 where id = $1', [id])
    const autoria = await autoriaDelGasto(id)
    expect(Number(autoria.monto)).toBe(300)
    expect(autoria.modificado_por).toBe(BETO)
  })
})

describe('todas las tablas llevan autoría', () => {
  it('cada tabla de public tiene las cuatro columnas y el trigger, también las que vengan', async () => {
    const tablas = await base.admin.consultar<{ tabla: string; columnas: string[]; con_trigger: boolean }>(
      `select c.relname as tabla,
              array(select a.attname::text from pg_attribute a
                    where a.attrelid = c.oid and a.attname in ('creado_por', 'creado_en', 'modificado_por', 'modificado_en')
                      and not a.attisdropped
                    order by a.attname) as columnas,
              exists(select 1 from pg_trigger t join pg_proc p on p.oid = t.tgfoid
                     where t.tgrelid = c.oid and p.proname = 'marcar_autoria') as con_trigger
       from pg_class c
       where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
       order by c.relname`,
    )
    expect(tablas.length).toBeGreaterThan(0)
    for (const { tabla, columnas, con_trigger } of tablas) {
      expect(columnas, tabla).toEqual(['creado_en', 'creado_por', 'modificado_en', 'modificado_por'])
      expect(con_trigger, tabla).toBe(true)
    }
  })
})
