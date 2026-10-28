// La configuración de cada copia de LemonHouse sale de .env (regla 6). Vite
// pasa al navegador solo las variables que empiezan con VITE_, así que
// ninguna de ellas puede ser un secreto (regla 7).

export type Configuracion = { supabaseUrl: string; supabaseKey: string }

type Entorno = Record<string, string | undefined>

export function leerConfiguracion(entorno: Entorno = import.meta.env): Configuracion {
  const supabaseUrl = entorno.VITE_SUPABASE_URL?.trim() ?? ''
  const supabaseKey = entorno.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''

  const faltan = [
    ...(supabaseUrl ? [] : ['VITE_SUPABASE_URL']),
    ...(supabaseKey ? [] : ['VITE_SUPABASE_PUBLISHABLE_KEY']),
  ]
  if (faltan.length > 0) {
    throw new Error(`Falta configurar ${faltan.join(' y ')} en el archivo .env. Mirá .env.example.`)
  }
  // La key secreta saltea RLS: en el navegador, cualquiera podría ver y borrar todo.
  if (supabaseKey.startsWith('sb_secret_')) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY tiene la key secreta. Usá la publicable, que empieza con sb_publishable_.')
  }
  return { supabaseUrl, supabaseKey }
}
