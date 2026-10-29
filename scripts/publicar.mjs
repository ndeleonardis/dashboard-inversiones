// Publica la app (T29): arma el sitio con la configuración del proyecto real,
// que está en .env.production, y sube dist/ a la carpeta del servidor que dice
// PUBLICAR_DESTINO.
//
//   npm run publicar
//
// Sube con scp y ssh, que vienen con Windows, macOS y Linux. Conviene entrar
// al servidor con una clave SSH, así no pide la contraseña en cada paso.
// Primero van los archivos de assets/, que llevan su contenido en el nombre, y
// al final index.html: así nadie recibe una página que pide archivos que
// todavía no subieron.
import { spawnSync } from 'node:child_process'
import { readdirSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ENTORNO = '.env.production'
const VARIABLES = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'PUBLICAR_DESTINO']
// Como lo escribe scp, [usuario@]servidor:/carpeta. Un nombre de servidor de
// una letra sería una unidad de Windows, como C:/sitio. La carpeta va dentro
// de un comando de ssh, así que no admite espacios ni signos de la consola.
const FORMA_DEL_DESTINO = /^((?:[^@\s:/]+@)?[^@\s:/]{2,}):(\/[\w./-]+)$/

/**
 * Los comandos para subir dist/. index.html va con otro nombre y después se
 * renombra en el servidor: el cambio es de un solo golpe, y si la conexión se
 * corta, queda el anterior entero.
 */
export function pasosDeSubida(destino, archivos) {
  const [, servidor, carpeta] = FORMA_DEL_DESTINO.exec(destino)
  const otros = archivos.filter((nombre) => nombre !== 'assets' && nombre !== 'index.html').map((nombre) => `dist/${nombre}`)
  return [
    ['scp', '-r', 'dist/assets', `${destino}/`],
    ...(otros.length > 0 ? [['scp', '-r', ...otros, `${destino}/`]] : []),
    ['scp', 'dist/index.html', `${destino}/index.html.nuevo`],
    ['ssh', servidor, `mv ${carpeta}/index.html.nuevo ${carpeta}/index.html`],
  ]
}

function fallar(mensaje) {
  console.error(mensaje)
  process.exit(1)
}

async function principal() {
  try {
    process.loadEnvFile(ENTORNO)
  } catch {
    fallar(`No encontré ${ENTORNO}. Copiá .env.example con ese nombre y completá los valores del proyecto real.`)
  }
  const faltan = VARIABLES.filter((nombre) => !process.env[nombre]?.trim())
  if (faltan.length > 0) fallar(`Faltan en ${ENTORNO}: ${faltan.join(', ')}. Mirá .env.example.`)

  const destino = process.env.PUBLICAR_DESTINO.trim().replace(/\/+$/, '')
  if (!FORMA_DEL_DESTINO.test(destino)) {
    fallar(`PUBLICAR_DESTINO tiene que ser como usuario@servidor:/var/www/lemonhouse, y dice "${destino}".`)
  }

  const { build } = await import('vite')
  try {
    await build({ mode: 'production' })
  } catch {
    fallar('No se pudo armar el sitio. No se subió nada.')
  }

  for (const [programa, ...argumentos] of pasosDeSubida(destino, readdirSync('dist'))) {
    const resultado = spawnSync(programa, argumentos, { stdio: 'inherit' })
    if (resultado.error) {
      fallar(`No encontré ${programa}. Viene con OpenSSH: en Windows, instalá "Cliente OpenSSH" desde Características opcionales.`)
    }
    if (resultado.status !== 0) {
      fallar(`Falló: ${programa} ${argumentos.join(' ')}. El sitio publicado sigue con su index.html anterior, que anda.`)
    }
  }
  console.log(`Publicado en ${destino}.`)
}

// Corre solo cuando se lo llama desde la línea de comandos, no cuando un test lo importa.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) await principal()
