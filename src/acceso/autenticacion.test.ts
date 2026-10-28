import { createClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '../datos/tipos-base.ts'
import { crearAutenticacionSupabase } from './autenticacion.ts'

function conCliente() {
  const cliente = createClient<Database>('https://ejemplo.supabase.co', 'sb_publishable_prueba', {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return { cliente, autenticacion: crearAutenticacionSupabase(cliente, 'http://localhost:5173') }
}

describe('autenticación con Supabase', () => {
  it('entra con Google, vuelve al inicio y pide siempre elegir la cuenta', async () => {
    const { cliente, autenticacion } = conCliente()
    const irAGoogle = vi.spyOn(cliente.auth, 'signInWithOAuth').mockResolvedValue({ data: { provider: 'google', url: '' }, error: null })
    await autenticacion.entrarConGoogle()
    expect(irAGoogle).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost:5173', queryParams: { prompt: 'select_account' } },
    })
  })

  it('salir cierra la sesión solo en este dispositivo', async () => {
    const { cliente, autenticacion } = conCliente()
    const cerrar = vi.spyOn(cliente.auth, 'signOut').mockResolvedValue({ error: null })
    await autenticacion.salir()
    expect(cerrar).toHaveBeenCalledWith({ scope: 'local' })
  })
})
