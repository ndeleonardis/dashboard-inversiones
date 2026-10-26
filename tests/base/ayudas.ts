// Ayudas para los tests de la base.

export type ErrorDeBase = Error & {
  code: string
  detail?: string
  hint?: string
  constraint?: string
  column?: string
  table?: string
}

/** Espera que la consulta falle y devuelve el error de Postgres. */
export async function errorDe(consulta: Promise<unknown>): Promise<ErrorDeBase> {
  try {
    await consulta
  } catch (error) {
    return error as ErrorDeBase
  }
  throw new Error('Se esperaba un error de la base y la consulta anduvo')
}
