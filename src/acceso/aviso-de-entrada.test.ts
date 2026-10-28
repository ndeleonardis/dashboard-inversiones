import { describe, expect, it } from 'vitest'
import { MENSAJE_FALLO_GOOGLE, MENSAJE_SIN_ACCESO, leerAvisoDeLaUrl, sinAvisoEnLaUrl } from './aviso-de-entrada.ts'

// La forma exacta con la que volvió Supabase en la prueba a mano del
// 2026-10-28, con un email de ejemplo. El # trae lo mismo codificado dos veces.
const RECHAZO_DEL_HOOK =
  'http://localhost:5173/?error=access_denied&error_code=&error_description=Este+email+no+tiene+acceso+a+LemonHouse.+Pedile+acceso+a+quien+administra+la+app+%5Bintruso%40example.com%5D' +
  '#error=access_denied&error_description=Este+email+no+tiene+acceso+a+LemonHouse.+Pedile+acceso+a+quien+administra+la+app+%255Bintruso%2540example.com%255D&sb='

describe('aviso con el que vuelve Supabase después de Google', () => {
  it('el rechazo del hook da el texto exacto de C3 y el email que se intentó usar', () => {
    expect(MENSAJE_SIN_ACCESO).toBe('Este email no tiene acceso a LemonHouse. Pedile acceso a quien administra la app')
    expect(leerAvisoDeLaUrl(RECHAZO_DEL_HOOK)).toEqual({ mensaje: MENSAJE_SIN_ACCESO, email: 'intruso@example.com' })
  })

  it('si Google se cancela o se cae, da "No se pudo entrar con Google. Probá de nuevo."', () => {
    expect(MENSAJE_FALLO_GOOGLE).toBe('No se pudo entrar con Google. Probá de nuevo.')
    for (const url of [
      'http://localhost:5173/?error=access_denied&error_description=The+user+denied+access',
      'http://localhost:5173/?error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code',
      'http://localhost:5173/#error=server_error&error_description=Database+error',
    ]) {
      expect(leerAvisoDeLaUrl(url)).toEqual({ mensaje: MENSAJE_FALLO_GOOGLE })
    }
  })

  it('un texto inventado en la URL no se muestra', () => {
    const inventado = 'http://localhost:5173/?error=x&error_description=Tu+cuenta+fue+suspendida.+Llam%C3%A1+al+0800'
    expect(leerAvisoDeLaUrl(inventado)).toEqual({ mensaje: MENSAJE_FALLO_GOOGLE })
  })

  it('entre corchetes solo se muestra algo con forma de email', () => {
    const conTextoInventado = `http://localhost:5173/?error=access_denied&error_description=${encodeURIComponent(
      `${MENSAJE_SIN_ACCESO} [Llamá al 0800 para recuperarla]`,
    )}`
    expect(leerAvisoDeLaUrl(conTextoInventado)).toEqual({ mensaje: MENSAJE_SIN_ACCESO })
  })

  it('sin error en la URL no hay aviso', () => {
    expect(leerAvisoDeLaUrl('http://localhost:5173/')).toBeNull()
    expect(leerAvisoDeLaUrl('http://localhost:5173/?code=abc123')).toBeNull()
  })
})

describe('limpiar la URL', () => {
  it('saca el error y deja el resto', () => {
    expect(sinAvisoEnLaUrl(RECHAZO_DEL_HOOK)).toBe('http://localhost:5173/')
    expect(sinAvisoEnLaUrl('http://localhost:5173/gastos?mes=2026-10&error=a&error_description=b')).toBe(
      'http://localhost:5173/gastos?mes=2026-10',
    )
  })
})
