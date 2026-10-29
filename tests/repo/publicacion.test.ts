import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Publicar (T29). El script se corre en una carpeta vacía, así nunca llega a
// armar el sitio ni a subir nada, y sin las variables que pudiera tener quien
// corre los tests.
const PUBLICAR = resolve('scripts/publicar.mjs')
const VARIABLES_DE_LA_COPIA = ['PUBLICAR_DESTINO', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']
const CONFIGURACION = 'VITE_SUPABASE_URL=https://abc.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_abc\n'

function publicarCon(entorno: string | null) {
  const carpeta = mkdtempSync(join(tmpdir(), 'lemonhouse-publicar-'))
  try {
    if (entorno !== null) writeFileSync(join(carpeta, '.env.production'), entorno)
    const variables = { ...process.env }
    for (const nombre of VARIABLES_DE_LA_COPIA) delete variables[nombre]
    const resultado = spawnSync(process.execPath, [PUBLICAR], { cwd: carpeta, env: variables, encoding: 'utf8' })
    return { estado: resultado.status, error: resultado.stderr }
  } finally {
    rmSync(carpeta, { recursive: true, force: true })
  }
}

describe('publicar', () => {
  it('sin .env.production, falla en español', () => {
    const { estado, error } = publicarCon(null)
    expect(estado).toBe(1)
    expect(error).toContain('No encontré .env.production. Copiá .env.example con ese nombre')
  })

  it('sin PUBLICAR_DESTINO, falla en español y dice dónde mirar', () => {
    const { estado, error } = publicarCon(CONFIGURACION)
    expect(estado).toBe(1)
    expect(error).toContain('Faltan en .env.production: PUBLICAR_DESTINO. Mirá .env.example.')
  })

  it('sin la configuración de Supabase, tampoco publica', () => {
    const { estado, error } = publicarCon('PUBLICAR_DESTINO=deploy@servidor:/var/www/lemonhouse\n')
    expect(estado).toBe(1)
    expect(error).toContain('Faltan en .env.production: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY.')
  })

  it.each(['/var/www/lemonhouse', 'servidor:/', 'servidor:lemonhouse', 'C:/sitio', 'deploy@servidor'])(
    'un destino sin servidor y carpeta (%s) se rechaza',
    (destino) => {
      const { estado, error } = publicarCon(`${CONFIGURACION}PUBLICAR_DESTINO=${destino}\n`)
      expect(estado).toBe(1)
      expect(error).toContain('PUBLICAR_DESTINO tiene que ser como usuario@servidor:/var/www/lemonhouse')
    },
  )
})

describe('subir las migraciones', () => {
  it('al proyecto real van sin las semillas, que son datos ficticios', async () => {
    // La ruta va en una variable para que TypeScript no busque los tipos del .mjs.
    const ruta = '../../scripts/supabase.mjs'
    const { argumentosParaSubir } = (await import(ruta)) as {
      argumentosParaSubir: (proyecto: string, produccion: boolean, extra?: string[]) => string[]
    }
    expect(argumentosParaSubir('abc', false)).toContain('--include-seed')
    expect(argumentosParaSubir('abc', true)).not.toContain('--include-seed')
    expect(argumentosParaSubir('abc', true, ['--dry-run'])).toEqual(['db', 'push', '--project-ref', 'abc', '--dry-run'])
  })
})

describe('variables de entorno (regla 6)', () => {
  // Las VITE_ que lee src/ las controla src/config.test.ts. Acá van las de los
  // scripts: lo que se lee de process.env y los nombres de variables escritos
  // como texto, como en la lista de las que exige cada script.
  const leidasPorLosScripts = new Set(
    readdirSync('scripts')
      .filter((archivo) => /\.(mjs|ts)$/.test(archivo) && !archivo.includes('.test.'))
      .flatMap((archivo) =>
        [...readFileSync(join('scripts', archivo), 'utf8').matchAll(/process\.env\.([A-Z][A-Z0-9_]*)|['"]([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)['"]/g)].map(
          (encontrada) => encontrada[1] ?? encontrada[2] ?? '',
        ),
      ),
  )
  const listadas = new Set(
    readFileSync('.env.example', 'utf8')
      .split(/\r?\n/)
      .filter((linea) => /^[A-Z]/.test(linea))
      .map((linea) => linea.split('=')[0]),
  )

  it('.env.example lista todas las variables que leen los scripts', () => {
    expect(leidasPorLosScripts).toContain('PUBLICAR_DESTINO')
    expect(leidasPorLosScripts).toContain('SUPABASE_ACCESS_TOKEN')
    expect([...leidasPorLosScripts].filter((variable) => !listadas.has(variable))).toEqual([])
  })
})
