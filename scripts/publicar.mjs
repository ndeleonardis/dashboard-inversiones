// Publica la app (T29): arma el sitio con la configuración del proyecto real,
// que está en .env.production, y sube dist/ a la carpeta del servidor que dice
// PUBLICAR_DESTINO.
//
//   npm run publicar
//
// Sube con scp, que viene con Windows, macOS y Linux. Conviene entrar al
// servidor con una clave SSH, así no pide la contraseña en cada paso. Primero
// van los archivos de assets/, que llevan su contenido en el nombre, y al final
// index.html: así nadie recibe una página que pide archivos que todavía no
// subieron.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'

const ENTORNO = '.env.production'
const VARIABLES = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'PUBLICAR_DESTINO']
// Como lo escribe scp, [usuario@]servidor:/carpeta. Un nombre de servidor de
// una letra sería una unidad de Windows, como C:/sitio.
const FORMA_DEL_DESTINO = /^(?:[^@\s:/]+@)?[^@\s:/]{2,}:\/\S+$/

function fallar(mensaje) {
  console.error(mensaje)
  process.exit(1)
}

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

function subir(archivos) {
  if (archivos.length === 0) return
  const resultado = spawnSync('scp', ['-r', ...archivos, `${destino}/`], { stdio: 'inherit' })
  if (resultado.error) fallar('No encontré scp. Viene con OpenSSH: en Windows, instalá "Cliente OpenSSH" desde Características opcionales.')
  if (resultado.status !== 0) {
    fallar(`No se pudo subir ${archivos.join(', ')}. El sitio publicado sigue con su index.html anterior, que anda.`)
  }
}

subir(['dist/assets'])
subir(
  readdirSync('dist')
    .filter((nombre) => nombre !== 'assets' && nombre !== 'index.html')
    .map((nombre) => `dist/${nombre}`),
)
subir(['dist/index.html'])
console.log(`Publicado en ${destino}.`)
