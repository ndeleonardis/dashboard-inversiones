// Entrar con Google y salir, a través de Supabase Auth. La app usa esta
// interfaz, y los tests de pantallas una versión falsa.
import type { Cliente } from '../datos/cliente.ts'

export interface Autenticacion {
  /** Avisa el email de la sesión ahora y cada vez que cambia, o null sin sesión. Devuelve cómo dejar de escuchar. */
  alCambiar(oyente: (email: string | null) => void): () => void
  /** Lleva a Google. Si sale bien, la página se va y vuelve con la sesión. */
  entrarConGoogle(): Promise<void>
  salir(): Promise<void>
}

/** `origen` es la dirección de la app, a donde vuelve Google. Tiene que estar autorizada en Supabase. */
export function crearAutenticacionSupabase(cliente: Cliente, origen: string = window.location.origin): Autenticacion {
  return {
    alCambiar(oyente) {
      // Acá adentro no se llama a Supabase, porque puede trabarse esperando la
      // sesión. Quien escucha pregunta lo que necesite después.
      const { data } = cliente.auth.onAuthStateChange((_evento, sesion) => oyente(sesion?.user.email?.toLowerCase() ?? null))
      return () => data.subscription.unsubscribe()
    },

    async entrarConGoogle() {
      const { error } = await cliente.auth.signInWithOAuth({
        provider: 'google',
        // select_account: Google muestra siempre el selector, así se puede
        // elegir otra cuenta después de un rechazo.
        options: { redirectTo: origen, queryParams: { prompt: 'select_account' } },
      })
      if (error) throw error
    },

    async salir() {
      // Solo este dispositivo: salir en el celular no cierra la sesión de la notebook.
      const { error } = await cliente.auth.signOut({ scope: 'local' })
      if (error) throw error
    },
  }
}
