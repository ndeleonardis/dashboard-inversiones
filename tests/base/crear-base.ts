// Base de prueba: PGlite con lo que Supabase trae de fábrica y todas las
// migraciones de supabase/migrations/, aplicadas en orden.
import { PGlite, type Transaction } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const CARPETA_MIGRACIONES = 'supabase/migrations'

export interface Consultor {
  consultar<T = Record<string, unknown>>(sql: string, parametros?: unknown[]): Promise<T[]>
}

export interface BaseDePrueba {
  /** El rol postgres, como el editor SQL o el panel de Supabase. */
  admin: Consultor
  /** Alguien que entró con Google con ese email. Esté invitado o no. */
  conSesion(email: string): Consultor
  /** Una llamada a la API sin sesión. */
  anonimo: Consultor
  /** El rol con el que Supabase Auth ejecuta los hooks. */
  authAdmin: Consultor
  cerrar(): Promise<void>
}

type Rol = 'anon' | 'authenticated' | 'supabase_auth_admin'

export function listarMigraciones(): string[] {
  let archivos: string[]
  try {
    archivos = readdirSync(CARPETA_MIGRACIONES)
  } catch {
    return []
  }
  return archivos
    .filter((archivo) => archivo.endsWith('.sql'))
    .sort()
    .map((archivo) => join(CARPETA_MIGRACIONES, archivo))
}

export async function crearBase(): Promise<BaseDePrueba> {
  const pg = new PGlite()
  await pg.exec(readFileSync('tests/base/supabase-de-fabrica.sql', 'utf8'))
  for (const migracion of listarMigraciones()) {
    try {
      await pg.exec(readFileSync(migracion, 'utf8'))
    } catch (error) {
      throw new Error(`Falló la migración ${migracion}: ${(error as Error).message}`)
    }
  }

  // Igual que la API de Supabase: cada consulta es una transacción con su rol
  // y los datos del token de la sesión.
  const como = (rol: Rol, claims: Record<string, unknown>): Consultor => ({
    consultar: async <T,>(sql: string, parametros?: unknown[]) =>
      pg.transaction(async (tx: Transaction) => {
        await tx.exec(`set local role ${rol}`)
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)])
        const resultado = await tx.query<T>(sql, parametros)
        return resultado.rows
      }),
  })

  return {
    admin: {
      consultar: async <T,>(sql: string, parametros?: unknown[]) => (await pg.query<T>(sql, parametros)).rows,
    },
    conSesion: (email) => como('authenticated', { role: 'authenticated', email, sub: crypto.randomUUID() }),
    anonimo: como('anon', { role: 'anon' }),
    authAdmin: como('supabase_auth_admin', {}),
    cerrar: () => pg.close(),
  }
}
