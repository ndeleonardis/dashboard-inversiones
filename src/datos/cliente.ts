// El cliente de Supabase: el login con Google y la API de la base. Usa la key
// publicable, así que lo que cada uno puede ver lo decide la base con RLS.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Configuracion } from '../config.ts'
import type { Database } from './tipos-base.ts'

export type Cliente = SupabaseClient<Database>

export function crearCliente({ supabaseUrl, supabaseKey }: Configuracion): Cliente {
  return createClient<Database>(supabaseUrl, supabaseKey)
}
