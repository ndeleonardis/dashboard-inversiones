// Lo que trae la URL cuando Supabase vuelve de Google con un error. La app solo
// muestra textos propios: el de C3 si el hook rechazó el email, y uno genérico
// para todo lo demás. Así nadie puede armar un link que muestre un mensaje
// inventado dentro de la app.

/** El texto de C3. El hook de invitación lo manda con el email entre corchetes. */
export const MENSAJE_SIN_ACCESO = 'Este email no tiene acceso a LemonHouse. Pedile acceso a quien administra la app'
export const MENSAJE_FALLO_GOOGLE = 'No se pudo entrar con Google. Probá de nuevo.'

export type AvisoDeEntrada = { mensaje: string; email?: string }

const PARAMETROS_DE_ERROR = ['error', 'error_code', 'error_description']
const RECHAZO_DEL_HOOK = /^(.*) \[(.*)\]$/
const FORMA_DE_EMAIL = /^[^\s@[\]]{1,64}@[^\s@[\]]{1,190}\.[^\s@[\]]{2,}$/

function parametrosDeError(url: URL): URLSearchParams | null {
  if (url.searchParams.has('error')) return url.searchParams
  // El # trae el mismo error codificado dos veces: sirve para saber que falló,
  // pero su texto nunca coincide con el de C3.
  const delNumeral = new URLSearchParams(url.hash.slice(1))
  return delNumeral.has('error') ? delNumeral : null
}

export function leerAvisoDeLaUrl(direccion: string): AvisoDeEntrada | null {
  const parametros = parametrosDeError(new URL(direccion))
  if (!parametros) return null

  const rechazo = RECHAZO_DEL_HOOK.exec(parametros.get('error_description') ?? '')
  if (rechazo?.[1] !== MENSAJE_SIN_ACCESO) return { mensaje: MENSAJE_FALLO_GOOGLE }

  // Lo que va entre corchetes se muestra solo si tiene forma de email.
  const email = rechazo[2] ?? ''
  return FORMA_DE_EMAIL.test(email) ? { mensaje: MENSAJE_SIN_ACCESO, email } : { mensaje: MENSAJE_SIN_ACCESO }
}

/** La misma dirección sin el error, para que no vuelva a aparecer al recargar. */
export function sinAvisoEnLaUrl(direccion: string): string {
  const url = new URL(direccion)
  for (const nombre of PARAMETROS_DE_ERROR) url.searchParams.delete(nombre)
  if (new URLSearchParams(url.hash.slice(1)).has('error')) url.hash = ''
  return url.toString()
}
