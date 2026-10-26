// Guardas del repositorio (reglas 3 y 7 de la constitución). El repo es
// público: no puede tener secretos, emails reales ni archivos con datos reales.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

export type Hallazgo = { archivo: string; linea: number; motivo: string }

const SECRETOS: { motivo: string; patron: RegExp }[] = [
  { motivo: 'token JWT', patron: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { motivo: 'clave secreta de Supabase', patron: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { motivo: 'token personal de Supabase', patron: /sbp_[a-f0-9]{40}/ },
  { motivo: 'secreto de Google', patron: /GOCSPX-[A-Za-z0-9_-]{10,}/ },
  // La contraseña es lo que va entre "usuario:" y "@". Un marcador como
  // [TU-CONTRASEÑA] o <clave> no cuenta.
  { motivo: 'contraseña en una URL de Postgres', patron: /postgres(?:ql)?:\/\/[^\s:@/]+:(?![[<$])[^\s@/]+@/ },
  { motivo: 'clave privada', patron: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
]

// Dominios reservados para ejemplos (RFC 2606). Cualquier otro es un email real.
const DOMINIO_DE_EJEMPLO = /(^|\.)example\.(com|net|org)$/i
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g

export function buscarSecretos(texto: string): string[] {
  return SECRETOS.filter(({ patron }) => patron.test(texto)).map(({ motivo }) => motivo)
}

export function buscarEmailsReales(texto: string): string[] {
  return [...texto.matchAll(EMAIL)]
    .filter((encontrado) => !DOMINIO_DE_EJEMPLO.test(encontrado[1] ?? ''))
    .map((encontrado) => encontrado[0])
}

export function revisarRuta(ruta: string): string | null {
  if (ruta.startsWith('data/real/')) return 'archivo de datos reales'
  if (/\.xlsx$/i.test(ruta) && !ruta.startsWith('data/sample/')) return 'Excel fuera de data/sample/'
  const nombre = ruta.split('/').pop() ?? ''
  if ((nombre === '.env' || nombre.startsWith('.env.')) && nombre !== '.env.example') {
    return 'archivo de entorno con valores'
  }
  return null
}

function listarVersionados(): string[] {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
}

export function revisarRepo(archivos: string[] = listarVersionados()): Hallazgo[] {
  const hallazgos: Hallazgo[] = []
  for (const archivo of archivos) {
    const motivoRuta = revisarRuta(archivo)
    if (motivoRuta) hallazgos.push({ archivo, linea: 0, motivo: motivoRuta })

    const contenido = readFileSync(archivo)
    if (contenido.includes(0)) continue // binario: solo cuenta su ruta
    contenido
      .toString('utf8')
      .split(/\r?\n/)
      .forEach((texto, indice) => {
        for (const motivo of buscarSecretos(texto)) hallazgos.push({ archivo, linea: indice + 1, motivo })
        for (const email of buscarEmailsReales(texto)) {
          hallazgos.push({ archivo, linea: indice + 1, motivo: `email real (${email})` })
        }
      })
  }
  return hallazgos
}
