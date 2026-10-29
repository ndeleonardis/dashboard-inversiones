import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { crearRepositorioFalso } from '../../tests/interfaz/repositorio-falso.ts'
import { MONEDAS } from '../dominio/moneda.ts'
import { ErrorDeLaApp, traducirError } from './errores.ts'
import { crearRepositorioSupabase } from './repositorio.ts'
import { Constants, type Database } from './tipos-base.ts'

const ID = '0b6c1f4e-7a52-4c3e-9d1a-2f8e5b7c9a10'
const NO_SE_ENCONTRO = 'No se encontró. Puede que alguien lo haya borrado'

type Pedido = { metodo: string; url: string }

// Un cliente de Supabase de verdad, con un fetch que contesta lo que contestaría
// la API. Anota cada pedido para ver qué se le mandó.
function conRespuesta(estado: number, cuerpo: unknown) {
  const pedidos: Pedido[] = []
  const enviados: unknown[] = []
  const fetchFalso: typeof fetch = async (entrada, opciones) => {
    pedidos.push({ metodo: opciones?.method ?? 'GET', url: String(entrada) })
    enviados.push(opciones?.body ? JSON.parse(String(opciones.body)) : null)
    return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } })
  }
  const cliente = createClient<Database>('https://ejemplo.supabase.co', 'sb_publishable_prueba', {
    global: { fetch: fetchFalso },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return { repositorio: crearRepositorioSupabase(cliente), pedidos, enviados }
}

describe('repositorio con Supabase', () => {
  it('una edición que no encuentra la fila da "No se encontró", en lugar de pasar por buena', async () => {
    const { repositorio, pedidos } = conRespuesta(200, [])
    const error = await repositorio.editar('persona', ID, { nombre: 'Ana' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ErrorDeLaApp)
    expect(traducirError(error)).toEqual({ mensaje: NO_SE_ENCONTRO })
    expect(pedidos).toEqual([{ metodo: 'PATCH', url: expect.stringContaining(`/rest/v1/persona?id=eq.${ID}`) }])
  })

  it('un borrado que no encuentra la fila da el mismo error', async () => {
    const { repositorio, pedidos } = conRespuesta(200, [])
    const error = await repositorio.borrar('gasto', ID).catch((e: unknown) => e)
    expect(traducirError(error)).toEqual({ mensaje: NO_SE_ENCONTRO })
    expect(pedidos).toEqual([{ metodo: 'DELETE', url: expect.stringContaining(`/rest/v1/gasto?id=eq.${ID}`) }])
  })

  it('una edición que encuentra la fila devuelve cómo quedó', async () => {
    const guardada = { id: ID, nombre: 'Ana', email: null }
    const { repositorio } = conRespuesta(200, [guardada])
    await expect(repositorio.editar('persona', ID, { nombre: 'Ana' })).resolves.toEqual(guardada)
  })

  it('los gastos de un mes se piden con la fecha entre el primer día del mes y el del siguiente', async () => {
    const { repositorio, pedidos } = conRespuesta(200, [])
    await repositorio.listarDelMes('gasto', '2026-12-15')
    expect(pedidos).toEqual([{ metodo: 'GET', url: expect.stringContaining('/rest/v1/gasto?select=*&fecha=gte.2026-12-01&fecha=lt.2027-01-01') }])
  })

  it('una fila se pide por su id, y si no está vuelve vacía', async () => {
    const { repositorio, pedidos } = conRespuesta(200, [])
    await expect(repositorio.obtener('gasto', ID)).resolves.toBeNull()
    expect(pedidos).toEqual([{ metodo: 'GET', url: expect.stringContaining(`/rest/v1/gasto?select=*&id=eq.${ID}`) }])
  })

  it('un id que ni siquiera tiene forma de id también vuelve vacío', async () => {
    const { repositorio } = conRespuesta(400, {
      code: '22P02',
      details: null,
      hint: null,
      message: 'invalid input syntax for type uuid: "no-existe"',
    })
    await expect(repositorio.obtener('gasto', 'no-existe')).resolves.toBeNull()
  })

  it('un instrumento se guarda con sus datos propios en una sola llamada, sin mandar lo vacío (C10)', async () => {
    const { repositorio, pedidos, enviados } = conRespuesta(200, ID)
    const datos = {
      tipo: 'CEDEAR',
      ticker: 'EJM',
      nombre: 'Empresa Ejemplo',
      moneda: 'ARS',
      vencimiento: null,
      codigo_cafci: null,
      ratio: '20.5',
      subyacente: 'EJM',
      emisor: null,
      valor_nominal_residual: null,
    } as const
    await expect(repositorio.guardarInstrumento(datos, ID)).resolves.toBe(ID)
    expect(pedidos).toEqual([{ metodo: 'POST', url: expect.stringContaining('/rest/v1/rpc/guardar_instrumento') }])
    expect(enviados).toEqual([
      {
        p_id: ID,
        p_tipo: 'CEDEAR',
        p_ticker: 'EJM',
        p_nombre: 'Empresa Ejemplo',
        p_moneda: 'ARS',
        p_ratio: '20.5',
        p_subyacente: 'EJM',
      },
    ])
  })

  it('el resumen del mes se pide para el grupo o para una persona (C25)', async () => {
    const { repositorio, pedidos, enviados } = conRespuesta(200, [])
    await repositorio.resumenMes('2026-10-01')
    await repositorio.resumenMes('2026-10-01', ID)
    expect(pedidos.map((p) => p.url)).toEqual([
      expect.stringContaining('/rest/v1/rpc/resumen_mes'),
      expect.stringContaining('/rest/v1/rpc/resumen_mes'),
    ])
    expect(enviados).toEqual([{ p_mes: '2026-10-01' }, { p_mes: '2026-10-01', p_persona: ID }])
  })

  it('un error de la base llega entero, para que se traduzca a español', async () => {
    const { repositorio } = conRespuesta(409, {
      code: '23503',
      details: 'Key is still referenced from table "cuenta".',
      hint: null,
      message: 'update or delete on table "persona" violates foreign key constraint "cuenta_persona_fk" on table "cuenta"',
    })
    const error = await repositorio.borrar('persona', ID).catch((e: unknown) => e)
    expect(traducirError(error)).toEqual({ mensaje: 'No se puede borrar: esta persona tiene cuentas' })
  })
})

describe('repositorio falso', () => {
  it('guarda, lista, edita y borra en memoria, con la autoría completa', async () => {
    const repositorio = crearRepositorioFalso({ email: 'ana@example.com' })
    const ana = await repositorio.crear('persona', { nombre: 'Ana Ejemplo' })
    expect(ana).toMatchObject({ nombre: 'Ana Ejemplo', email: null, creado_por: 'ana@example.com', modificado_por: null })

    await repositorio.editar('persona', ana.id, { nombre: 'Ana E.' })
    expect(await repositorio.listar('persona')).toMatchObject([{ id: ana.id, nombre: 'Ana E.', modificado_por: 'ana@example.com' }])

    await repositorio.borrar('persona', ana.id)
    expect(await repositorio.listar('persona')).toEqual([])
  })

  it('una edición o un borrado que no encuentra la fila da el mismo error que con Supabase', async () => {
    const repositorio = crearRepositorioFalso()
    for (const intento of [repositorio.editar('persona', ID, { nombre: 'Ana' }), repositorio.borrar('persona', ID)]) {
      expect(traducirError(await intento.catch((e: unknown) => e))).toEqual({ mensaje: NO_SE_ENCONTRO })
    }
  })

  it('los montos se mandan como texto exacto y vuelven como número, igual que con Supabase', async () => {
    const repositorio = crearRepositorioFalso()
    const gasto = await repositorio.crear('gasto', { tipo_gasto_id: ID, fecha: '2026-10-01', monto: '1234.56', moneda: 'ARS' })
    expect(gasto).toMatchObject({ monto: 1234.56, persona_id: null, descripcion: null })
  })

  it('lista los gastos de un mes y busca una fila por su id, igual que con Supabase', async () => {
    const repositorio = crearRepositorioFalso()
    const datos = { tipo_gasto_id: ID, monto: '10', moneda: 'ARS' } as const
    await repositorio.crear('gasto', { ...datos, fecha: '2026-09-30' })
    const octubre = await repositorio.crear('gasto', { ...datos, fecha: '2026-10-01' })
    await repositorio.crear('gasto', { ...datos, fecha: '2026-11-01' })

    expect(await repositorio.listarDelMes('gasto', '2026-10-20')).toEqual([octubre])
    expect(await repositorio.obtener('gasto', octubre.id)).toEqual(octubre)
    expect(await repositorio.obtener('gasto', ID)).toBeNull()
  })

  it('lo que devuelve es una copia: cambiarla no cambia lo guardado', async () => {
    const repositorio = crearRepositorioFalso()
    const ana = await repositorio.crear('persona', { nombre: 'Ana Ejemplo' })
    ana.nombre = 'Otro'
    expect(await repositorio.listar('persona')).toMatchObject([{ nombre: 'Ana Ejemplo' }])
  })
})

describe('tipos generados de la base', () => {
  it('la moneda de la base es la misma que la de la app (regla 2)', () => {
    expect(Constants.public.Enums.moneda).toEqual(MONEDAS)
  })
})
