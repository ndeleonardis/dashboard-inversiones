import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorDe } from './ayudas.ts'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

let base: BaseDePrueba
let relaciones: string[]
let beto: string
let supermercado: string

const ANA = 'ana@example.com'
const INTRUSO = 'intruso@example.com'

// Las funciones que alguien con sesión puede ejecutar. Cualquier otra que
// aparezca tiene que sumarse acá a propósito.
const FUNCIONES_PARA_MIEMBROS = ['costo_promedio', 'email_de_la_sesion', 'es_miembro', 'resumen_mes', 'validar_posicion']

beforeAll(async () => {
  base = await crearBase()
  const [ana] = await base.admin.consultar<{ id: string }>(
    `insert into persona (nombre, email) values ('Ana', $1) returning id`,
    [ANA],
  )
  const [sinEmail] = await base.admin.consultar<{ id: string }>(`insert into persona (nombre) values ('Beto') returning id`)
  beto = sinEmail!.id
  const [tipoCuenta] = await base.admin.consultar<{ id: string }>(`select id from tipo_cuenta where nombre = 'Banco'`)
  const [cuenta] = await base.admin.consultar<{ id: string }>(
    `insert into cuenta (persona_id, tipo_cuenta_id, entidad) values ($1, $2, 'Banco Ejemplo') returning id`,
    [ana!.id, tipoCuenta!.id],
  )
  const [instrumento] = await base.admin.consultar<{ id: string }>(
    `insert into instrumento (tipo, ticker, nombre, moneda) values ('CEDEAR', 'EJEM', 'Ejemplo', 'ARS') returning id`,
  )
  await base.admin.consultar(
    `insert into operacion (cuenta_id, instrumento_id, tipo, fecha, cantidad, precio_unitario, moneda)
     values ($1, $2, 'COMPRA', '2026-10-01', 10, 100, 'ARS')`,
    [cuenta!.id, instrumento!.id],
  )
  const [tipoGasto] = await base.admin.consultar<{ id: string }>(`select id from tipo_gasto where nombre = 'Súper'`)
  supermercado = tipoGasto!.id
  await base.admin.consultar(
    `insert into gasto (tipo_gasto_id, fecha, monto, moneda) values ($1, '2026-10-05', 5000, 'ARS')`,
    [supermercado],
  )
  const [tipoIngreso] = await base.admin.consultar<{ id: string }>(`select id from tipo_ingreso where nombre = 'Sueldo'`)
  await base.admin.consultar(
    `insert into ingreso (tipo_ingreso_id, persona_id, fecha, monto, moneda) values ($1, $2, '2026-10-01', 90000, 'ARS')`,
    [tipoIngreso!.id, ana!.id],
  )

  const filas = await base.admin.consultar<{ nombre: string }>(
    `select relname as nombre from pg_class
     where relnamespace = 'public'::regnamespace and relkind in ('r', 'v') order by relname`,
  )
  relaciones = filas.map((f) => f.nombre)
})

afterAll(async () => {
  await base.cerrar()
})

describe('sin sesión no se ve nada (C1)', () => {
  it('el anónimo no puede leer ninguna tabla ni vista', async () => {
    expect(relaciones).toContain('posicion')
    for (const relacion of relaciones) {
      const error = await errorDe(base.anonimo.consultar(`select count(*) from public.${relacion}`))
      expect(error.code, relacion).toBe('42501')
    }
  })

  it('el anónimo no puede ejecutar ninguna función', async () => {
    const funciones = await base.admin.consultar<{ nombre: string; puede: boolean }>(
      `select p.proname as nombre, has_function_privilege('anon', p.oid, 'execute') as puede
       from pg_proc p where p.pronamespace = 'public'::regnamespace`,
    )
    expect(funciones.filter((f) => f.puede).map((f) => f.nombre)).toEqual([])
  })
})

describe('con sesión pero sin invitación tampoco (C1)', () => {
  it('no ve ninguna fila de ninguna tabla ni vista', async () => {
    const intruso = base.conSesion(INTRUSO)
    for (const relacion of relaciones) {
      const [fila] = await intruso.consultar<{ n: string }>(`select count(*) as n from public.${relacion}`)
      expect(Number(fila?.n), relacion).toBe(0)
    }
  })

  it('no puede cargar nada', async () => {
    const error = await errorDe(
      base
        .conSesion(INTRUSO)
        .consultar(`insert into gasto (tipo_gasto_id, fecha, monto, moneda) values ($1, '2026-10-05', 1, 'ARS')`, [
          supermercado,
        ]),
    )
    expect(error.code).toBe('42501')
  })

  it('es_miembro() le dice que no', async () => {
    const [fila] = await base.conSesion(INTRUSO).consultar<{ es: boolean }>('select public.es_miembro() as es')
    expect(fila?.es).toBe(false)
  })
})

describe('un miembro ve y edita todo', () => {
  it('ve todas las filas de cada tabla', async () => {
    const ana = base.conSesion(ANA)
    const tablas = await base.admin.consultar<{ nombre: string }>(
      `select relname as nombre from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'`,
    )
    for (const { nombre } of tablas) {
      const [deAdmin] = await base.admin.consultar<{ n: string }>(`select count(*) as n from public.${nombre}`)
      const [deAna] = await ana.consultar<{ n: string }>(`select count(*) as n from public.${nombre}`)
      expect(deAna?.n, nombre).toBe(deAdmin?.n)
    }
  })

  it('ve datos en cada vista', async () => {
    const ana = base.conSesion(ANA)
    const vistas = await base.admin.consultar<{ nombre: string }>(
      `select relname as nombre from pg_class where relnamespace = 'public'::regnamespace and relkind = 'v'`,
    )
    expect(vistas.length).toBeGreaterThan(0)
    for (const { nombre } of vistas) {
      const [deAna] = await ana.consultar<{ n: string }>(`select count(*) as n from public.${nombre}`)
      expect(Number(deAna?.n), nombre).toBeGreaterThan(0)
    }
  })

  it('es_miembro() le dice que sí, sin importar las mayúsculas del email', async () => {
    const [fila] = await base.conSesion('Ana@Example.com').consultar<{ es: boolean }>('select public.es_miembro() as es')
    expect(fila?.es).toBe(true)
  })

  it('carga, edita y borra gastos', async () => {
    const ana = base.conSesion(ANA)
    const [gasto] = await ana.consultar<{ id: string }>(
      `insert into gasto (tipo_gasto_id, fecha, monto, moneda) values ($1, '2026-10-06', 700, 'ARS') returning id`,
      [supermercado],
    )
    const editadas = await ana.consultar('update gasto set monto = 800 where id = $1 returning id', [gasto!.id])
    expect(editadas).toHaveLength(1)
    const borradas = await ana.consultar('delete from gasto where id = $1 returning id', [gasto!.id])
    expect(borradas).toHaveLength(1)
  })

  it('carga personas y les cambia el nombre', async () => {
    const ana = base.conSesion(ANA)
    const [nueva] = await ana.consultar<{ id: string }>(`insert into persona (nombre) values ('Caro') returning id`)
    const [editada] = await ana.consultar<{ nombre: string }>(
      `update persona set nombre = 'Carolina' where id = $1 returning nombre`,
      [nueva!.id],
    )
    expect(editada?.nombre).toBe('Carolina')
  })

  it('carga operaciones, aunque el orden de carga lo pone la base', async () => {
    const ana = base.conSesion(ANA)
    const [cuenta] = await ana.consultar<{ id: string }>('select id from cuenta limit 1')
    const [instrumento] = await ana.consultar<{ id: string }>(`select id from instrumento where ticker = 'EJEM'`)
    const [operacion] = await ana.consultar<{ orden: string }>(
      `insert into operacion (cuenta_id, instrumento_id, tipo, fecha, cantidad, precio_unitario, moneda)
       values ($1, $2, 'VENTA', '2026-10-10', 1, 120, 'ARS') returning orden`,
      [cuenta!.id, instrumento!.id],
    )
    expect(Number(operacion?.orden)).toBeGreaterThan(0)
  })

  it('agrega categorías de gastos, pero no toca los tipos de cuenta', async () => {
    const ana = base.conSesion(ANA)
    await ana.consultar(`insert into tipo_gasto (nombre) values ('Farmacia')`)
    const error = await errorDe(ana.consultar(`insert into tipo_cuenta (nombre) values ('Caja fuerte')`))
    expect(error.code).toBe('42501')
  })
})

describe('la invitación la maneja quien administra la copia', () => {
  it('un miembro no puede escribir el email de una persona', async () => {
    const ana = base.conSesion(ANA)
    const alEditar = await errorDe(
      ana.consultar(`update persona set email = 'beto@example.com' where id = $1`, [beto]),
    )
    expect(alEditar.code).toBe('42501')
    const alCrear = await errorDe(
      ana.consultar(`insert into persona (nombre, email) values ('Dani', 'dani@example.com')`),
    )
    expect(alCrear.code).toBe('42501')
  })

  it('un miembro no puede borrar una persona que entra a la app', async () => {
    const [caro] = await base.admin.consultar<{ id: string }>(
      `insert into persona (nombre, email) values ('Eva', 'eva@example.com') returning id`,
    )
    const error = await errorDe(base.conSesion(ANA).consultar('delete from persona where id = $1', [caro!.id]))
    expect(error.code).toBe('LH003')
    await base.admin.consultar('delete from persona where id = $1', [caro!.id])
  })

  it('un miembro sí puede borrar una persona sin email ni nada asignado', async () => {
    const [fede] = await base.admin.consultar<{ id: string }>(`insert into persona (nombre) values ('Fede') returning id`)
    const borradas = await base.conSesion(ANA).consultar('delete from persona where id = $1 returning id', [fede!.id])
    expect(borradas).toHaveLength(1)
  })
})

describe('guardas para lo que venga', () => {
  it('toda tabla de public tiene RLS activo', async () => {
    const tablas = await base.admin.consultar<{ nombre: string; rls: boolean }>(
      `select relname as nombre, relrowsecurity as rls from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'r'`,
    )
    expect(tablas.filter((t) => !t.rls).map((t) => t.nombre)).toEqual([])
  })

  it('alguien con sesión solo puede ejecutar las funciones de la lista', async () => {
    const funciones = await base.admin.consultar<{ nombre: string }>(
      `select distinct p.proname as nombre from pg_proc p
       where p.pronamespace = 'public'::regnamespace and has_function_privilege('authenticated', p.oid, 'execute')
       order by 1`,
    )
    expect(funciones.map((f) => f.nombre)).toEqual(FUNCIONES_PARA_MIEMBROS)
  })
})
