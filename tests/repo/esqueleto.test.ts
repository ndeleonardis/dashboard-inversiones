import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('esqueleto del proyecto', () => {
  it('index.html declara la página en español de Argentina (regla 1)', () => {
    const html = readFileSync('index.html', 'utf8')
    expect(html).toMatch(/<html[^>]*\slang="es-AR"/)
  })

  it('.env.example está versionado y no tiene valores (regla 7)', () => {
    const versionados = execSync('git ls-files', { encoding: 'utf8' }).split(/\r?\n/)
    expect(versionados).toContain('.env.example')

    const variables = readFileSync('.env.example', 'utf8')
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter((linea) => linea !== '' && !linea.startsWith('#'))
    expect(variables.length).toBeGreaterThan(0)
    for (const variable of variables) {
      expect(variable).toMatch(/^[A-Z][A-Z0-9_]*=$/)
    }
  })
})
