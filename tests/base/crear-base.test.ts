import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

let base: BaseDePrueba

beforeAll(async () => {
  base = await crearBase()
})

afterAll(async () => {
  await base.cerrar()
})

describe('base de prueba', () => {
  it('arranca con las migraciones aplicadas', async () => {
    const [fila] = await base.admin.consultar<{ uno: number }>('select 1 as uno')
    expect(fila?.uno).toBe(1)
  })

  it('consulta con sesión como el rol authenticated y con el email simulado', async () => {
    const [fila] = await base
      .conSesion('ana@example.com')
      .consultar<{ rol: string; email: string }>(`select current_user as rol, auth.jwt() ->> 'email' as email`)
    expect(fila).toEqual({ rol: 'authenticated', email: 'ana@example.com' })
  })

  it('consulta sin sesión como el rol anon y sin email', async () => {
    const [fila] = await base.anonimo.consultar<{ rol: string; email: string | null }>(
      `select current_user as rol, auth.jwt() ->> 'email' as email`,
    )
    expect(fila).toEqual({ rol: 'anon', email: null })
  })

  it('consulta como el rol que usa Supabase Auth para los hooks', async () => {
    const [fila] = await base.authAdmin.consultar<{ rol: string }>('select current_user as rol')
    expect(fila?.rol).toBe('supabase_auth_admin')
  })

  it('cada consulta con sesión es una transacción aparte, como en la API de Supabase', async () => {
    const ana = base.conSesion('ana@example.com')
    await expect(ana.consultar('select 1 / 0')).rejects.toThrow()
    const [fila] = await ana.consultar<{ uno: number }>('select 1 as uno')
    expect(fila?.uno).toBe(1)
  })
})
