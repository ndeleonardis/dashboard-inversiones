// Autenticación en memoria para los tests de pantallas, sin Google ni Supabase.
import type { Autenticacion } from '../../src/acceso/autenticacion.ts'

export type AutenticacionFalsa = Autenticacion & {
  /** El email de la sesión, o null si no hay. */
  readonly email: string | null
  /** Cuántas veces se fue a Google. */
  readonly intentos: number
  /** Desde ahora, ir a Google falla con este error. */
  fallarAlEntrar(error: unknown): void
}

export function crearAutenticacionFalsa(emailInicial: string | null = null): AutenticacionFalsa {
  let email = emailInicial
  let intentos = 0
  let falla: unknown = null
  const oyentes = new Set<(email: string | null) => void>()

  return {
    get email() {
      return email
    },
    get intentos() {
      return intentos
    },
    fallarAlEntrar(error) {
      falla = error
    },

    alCambiar(oyente) {
      oyentes.add(oyente)
      oyente(email)
      return () => {
        oyentes.delete(oyente)
      }
    },

    async entrarConGoogle() {
      if (falla) throw falla
      intentos++
    },

    async salir() {
      email = null
      for (const oyente of oyentes) oyente(null)
    },
  }
}
