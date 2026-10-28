// Sube las migraciones al proyecto de desarrollo de Supabase y genera los
// tipos de la base (T15). Lee el proyecto, la contraseña de la base y el token
// de la CLI de .env.development. La contraseña y el token le llegan a la CLI
// por el entorno, nunca por la línea de comandos.
//
//   npm run db:subir               sube las migraciones y las semillas pendientes
//   npm run db:subir -- --dry-run  muestra qué subiría, sin subir nada
//   npm run db:tipos               regenera src/datos/tipos-base.ts
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ENTORNO = '.env.development'
const ARCHIVO_DE_TIPOS = 'src/datos/tipos-base.ts'
const VARIABLES = ['SUPABASE_PROJECT_ID', 'SUPABASE_DB_PASSWORD', 'SUPABASE_ACCESS_TOKEN']
const CLI = fileURLToPath(import.meta.resolve('supabase/dist/supabase.js'))

function fallar(mensaje) {
  console.error(mensaje)
  process.exit(1)
}

try {
  process.loadEnvFile(ENTORNO)
} catch {
  fallar(`No encontré ${ENTORNO}. Copiá .env.example con ese nombre y completá los valores.`)
}
const faltan = VARIABLES.filter((nombre) => !process.env[nombre])
if (faltan.length > 0) fallar(`Faltan en ${ENTORNO}: ${faltan.join(', ')}. Mirá .env.example.`)
const proyecto = process.env.SUPABASE_PROJECT_ID

function correrCli(argumentos, salida = 'inherit') {
  const resultado = spawnSync(process.execPath, [CLI, ...argumentos], {
    stdio: ['inherit', salida, 'inherit'],
    encoding: 'utf8',
  })
  if (resultado.status !== 0) fallar(`La CLI de Supabase terminó con error (${resultado.status ?? resultado.error}).`)
  return resultado.stdout
}

const [comando, ...resto] = process.argv.slice(2)
switch (comando) {
  case 'subir':
    // Las semillas son datos ficticios: van solo al proyecto de desarrollo.
    correrCli(['db', 'push', '--project-ref', proyecto, '--include-seed', ...resto])
    break
  case 'tipos': {
    const tipos = correrCli(['gen', 'types', 'typescript', '--project-id', proyecto, '--schema', 'public'], 'pipe')
    // Se escribe recién cuando la CLI terminó bien, así un error no deja el archivo vacío.
    writeFileSync(ARCHIVO_DE_TIPOS, `// Generado con "npm run db:tipos". No se edita a mano.\n${tipos}`)
    console.log(`Tipos escritos en ${ARCHIVO_DE_TIPOS}.`)
    break
  }
  default:
    fallar('Uso: node scripts/supabase.mjs subir|tipos')
}
