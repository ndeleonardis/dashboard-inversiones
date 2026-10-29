// Sube las migraciones a un proyecto de Supabase y genera los tipos de la base
// (T15). Lee el proyecto, la contraseña de la base y el token de la CLI de
// .env.development, o de .env.production con --produccion. La contraseña y el
// token le llegan a la CLI por el entorno, nunca por la línea de comandos.
//
//   npm run db:subir                         sube las migraciones y las semillas pendientes al de desarrollo
//   npm run db:subir -- --dry-run            muestra qué subiría, sin subir nada
//   npm run db:subir:produccion              sube las migraciones al proyecto real, sin semillas (T29)
//   npm run db:subir:produccion -- --dry-run
//   npm run db:tipos                         regenera src/datos/tipos-base.ts
import { spawnSync } from 'node:child_process'
import { realpathSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ARCHIVO_DE_TIPOS = 'src/datos/tipos-base.ts'
const VARIABLES = ['SUPABASE_PROJECT_ID', 'SUPABASE_DB_PASSWORD', 'SUPABASE_ACCESS_TOKEN']

/** Los argumentos de `supabase db push`. Las semillas son datos ficticios: van solo al proyecto de desarrollo. */
export function argumentosParaSubir(proyecto, produccion, extra = []) {
  return ['db', 'push', '--project-ref', proyecto, ...(produccion ? [] : ['--include-seed']), ...extra]
}

function fallar(mensaje) {
  console.error(mensaje)
  process.exit(1)
}

function principal() {
  const [comando, ...resto] = process.argv.slice(2)
  const produccion = resto.includes('--produccion')
  const extra = resto.filter((argumento) => argumento !== '--produccion')
  const entorno = produccion ? '.env.production' : '.env.development'

  try {
    process.loadEnvFile(entorno)
  } catch {
    fallar(`No encontré ${entorno}. Copiá .env.example con ese nombre y completá los valores.`)
  }
  const faltan = VARIABLES.filter((nombre) => !process.env[nombre])
  if (faltan.length > 0) fallar(`Faltan en ${entorno}: ${faltan.join(', ')}. Mirá .env.example.`)
  const proyecto = process.env.SUPABASE_PROJECT_ID
  const cli = fileURLToPath(import.meta.resolve('supabase/dist/supabase.js'))

  function correrCli(argumentos, salida = 'inherit') {
    const resultado = spawnSync(process.execPath, [cli, ...argumentos], {
      stdio: ['inherit', salida, 'inherit'],
      encoding: 'utf8',
    })
    if (resultado.status !== 0) fallar(`La CLI de Supabase terminó con error (${resultado.status ?? resultado.error}).`)
    return resultado.stdout
  }

  switch (comando) {
    case 'subir':
      correrCli(argumentosParaSubir(proyecto, produccion, extra))
      break
    case 'tipos': {
      const tipos = correrCli(['gen', 'types', 'typescript', '--project-id', proyecto, '--schema', 'public'], 'pipe')
      // Se escribe recién cuando la CLI terminó bien, así un error no deja el archivo vacío.
      writeFileSync(ARCHIVO_DE_TIPOS, `// Generado con "npm run db:tipos". No se edita a mano.\n${tipos}`)
      console.log(`Tipos escritos en ${ARCHIVO_DE_TIPOS}.`)
      break
    }
    default:
      fallar('Uso: node scripts/supabase.mjs subir|tipos [--produccion]')
  }
}

// Corre solo cuando se lo llama desde la línea de comandos, no cuando un test lo importa.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) principal()
