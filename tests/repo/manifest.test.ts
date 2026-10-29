import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// La app instalable (C32). Los valores salen de DESIGN.md, sección "App instalable".
const seccion = readFileSync('DESIGN.md', 'utf8').split('### App instalable')[1]?.split(/\n#{2,3} /)[0] ?? ''
const diseño = {
  nombre: seccion.match(/\*\*Nombre\*\* ([^.\s]+)/)?.[1],
  fondo: seccion.match(/\*\*Color de fondo\*\* `(#[0-9A-F]{6})`/i)?.[1]?.toUpperCase(),
  tema: seccion.match(/\*\*Color del tema\*\* `(#[0-9A-F]{6})`/i)?.[1]?.toUpperCase(),
}

type Icono = { src: string; sizes: string; type: string; purpose?: string }
const manifest = existsSync('public/manifest.webmanifest')
  ? (JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as Record<string, unknown> & { icons?: Icono[] })
  : {}
const iconos = manifest.icons ?? []
const html = readFileSync('index.html', 'utf8')

/** El ancho y el alto que dice la cabecera de un PNG. */
function medidasDelPng(ruta: string): string {
  const archivo = readFileSync(ruta)
  expect(archivo.subarray(1, 4).toString('ascii'), `${ruta} no es un PNG`).toBe('PNG')
  return `${archivo.readUInt32BE(16)}x${archivo.readUInt32BE(20)}`
}

describe('app instalable (C32)', () => {
  it('DESIGN.md define el nombre y los dos colores', () => {
    expect(diseño).toEqual({ nombre: 'LemonHouse', fondo: '#F9D2E5', tema: '#0D0C11' })
  })

  it('el manifest tiene el nombre, el inicio y abre sin la barra del navegador', () => {
    expect(manifest).toMatchObject({
      name: diseño.nombre,
      short_name: diseño.nombre,
      lang: 'es-AR',
      start_url: '/',
      scope: '/',
      display: 'standalone',
    })
  })

  it('el manifest usa los colores de DESIGN.md', () => {
    expect(String(manifest.background_color).toUpperCase()).toBe(diseño.fondo)
    expect(String(manifest.theme_color).toUpperCase()).toBe(diseño.tema)
  })

  it('tiene íconos de 192 y 512 px, y uno adaptable para Android', () => {
    const comunes = iconos.filter((icono) => (icono.purpose ?? 'any') === 'any').map((icono) => icono.sizes)
    expect(comunes).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(iconos.filter((icono) => icono.purpose === 'maskable').map((icono) => icono.sizes)).toEqual(['512x512'])
  })

  it('cada ícono existe y mide lo que dice el manifest', () => {
    expect(iconos.length).toBeGreaterThan(0)
    for (const icono of iconos) {
      expect(icono.type).toBe('image/png')
      const ruta = `public${icono.src}`
      expect(existsSync(ruta), `falta ${ruta}`).toBe(true)
      expect(medidasDelPng(ruta)).toBe(icono.sizes)
    }
  })

  it('index.html enlaza el manifest y el ícono, con el color del tema', () => {
    expect(html).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest"/)
    expect(html.match(/<meta name="theme-color" content="(#[0-9A-Fa-f]{6})"/)?.[1]?.toUpperCase()).toBe(diseño.tema)
    const icono = html.match(/<link rel="icon" href="([^"]+)"/)?.[1] ?? ''
    expect(icono).toMatch(/^\/iconos\//)
    expect(existsSync(`public${icono}`), `falta public${icono}`).toBe(true)
  })
})
