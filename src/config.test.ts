import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { leerConfiguracion } from './config.ts'

function archivosDeLaApp(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name)
    if (entrada.isDirectory()) return archivosDeLaApp(ruta)
    return /\.(ts|tsx)$/.test(entrada.name) && !/\.test\.(ts|tsx)$/.test(entrada.name) ? [ruta] : []
  })
}

const variablesVite = (texto: string) => new Set(texto.match(/\bVITE_[A-Z0-9_]+/g) ?? [])

const usadasEnElCodigo = new Set(archivosDeLaApp('src').flatMap((archivo) => [...variablesVite(readFileSync(archivo, 'utf8'))]))
const listadasEnElEjemplo = new Set(
  readFileSync('.env.example', 'utf8')
    .split(/\r?\n/)
    .filter((linea) => !linea.trim().startsWith('#'))
    .flatMap((linea) => [...variablesVite(linea)]),
)

describe('configuración de la copia', () => {
  it('sin variables, falla con un mensaje en español que dice cuáles faltan', () => {
    expect(() => leerConfiguracion({})).toThrow(
      'Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env. Mirá .env.example.',
    )
  })

  it('una variable en blanco cuenta como faltante', () => {
    expect(() => leerConfiguracion({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: '  ' })).toThrow(
      'Falta configurar VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env. Mirá .env.example.',
    )
  })

  it('con las variables, devuelve la URL y la key', () => {
    expect(
      leerConfiguracion({ VITE_SUPABASE_URL: ' https://abc.supabase.co ', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc' }),
    ).toEqual({ supabaseUrl: 'https://abc.supabase.co', supabaseKey: 'sb_publishable_abc' })
  })

  it('rechaza la key secreta, que llegaría al navegador (regla 7)', () => {
    const secreta = 'sb_' + 'secret_' + 'x'.repeat(24)
    expect(() => leerConfiguracion({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: secreta })).toThrow(
      'VITE_SUPABASE_PUBLISHABLE_KEY tiene la key secreta. Usá la publicable, que empieza con sb_publishable_.',
    )
  })
})

describe('variables de entorno (reglas 6 y 7)', () => {
  it('.env.example lista todas las variables VITE_ que usa el código', () => {
    expect(usadasEnElCodigo.size).toBeGreaterThan(0)
    expect([...usadasEnElCodigo].filter((variable) => !listadasEnElEjemplo.has(variable))).toEqual([])
  })

  it('ninguna variable VITE_ tiene SECRET, TOKEN o PASSWORD en el nombre, porque llegan al navegador', () => {
    const todas = [...usadasEnElCodigo, ...listadasEnElEjemplo]
    expect(todas.filter((variable) => /SECRET|TOKEN|PASSWORD/.test(variable))).toEqual([])
  })
})
