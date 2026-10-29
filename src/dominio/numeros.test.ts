import { describe, expect, it } from 'vitest'
import { leerNumero } from './numeros.ts'

const monto = (texto: string) => leerNumero(texto, { decimales: 2 })

describe('leer números en formato argentino', () => {
  it('acepta coma decimal con o sin punto de miles', () => {
    expect(monto('1.234,56')).toEqual({ ok: true, valor: '1234.56' })
    expect(monto('1234,56')).toEqual({ ok: true, valor: '1234.56' })
    expect(monto(' 1.234.567,5 ')).toEqual({ ok: true, valor: '1234567.5' })
  })

  it('acepta enteros con o sin punto de miles', () => {
    expect(monto('1234')).toEqual({ ok: true, valor: '1234' })
    expect(monto('12.500')).toEqual({ ok: true, valor: '12500' })
  })

  it('rechaza el punto como decimal, para que 0.5 no se guarde como 5', () => {
    expect(monto('0.5')).toEqual({ ok: false, error: 'Usá coma para los decimales' })
    expect(monto('12.50')).toEqual({ ok: false, error: 'Usá coma para los decimales' })
  })

  it('un grupo de miles no empieza con cero: 0.500 es un decimal con punto, no 500', () => {
    const cantidad = (texto: string) => leerNumero(texto, { decimales: 8 })
    for (const texto of ['0.500', '0.050', '00.500']) {
      expect(cantidad(texto), texto).toEqual({ ok: false, error: 'Usá coma para los decimales' })
    }
  })

  it('rechaza lo que no se entiende', () => {
    for (const texto of ['abc', '1,234.56', '12,3,4', '1.23.4', '1.2345,6', ',5', '5,']) {
      expect(monto(texto), texto).toEqual({ ok: false, error: 'No se entiende el número' })
    }
  })

  it('pide el número si está vacío', () => {
    expect(monto('  ')).toEqual({ ok: false, error: 'Falta el número' })
  })

  it('rechaza el cero y los negativos', () => {
    expect(monto('0')).toEqual({ ok: false, error: 'Tiene que ser mayor que cero' })
    expect(monto('0,00')).toEqual({ ok: false, error: 'Tiene que ser mayor que cero' })
    expect(monto('-5')).toEqual({ ok: false, error: 'Tiene que ser mayor que cero' })
  })

  it('admite el cero cuando se pide, como en la comisión', () => {
    expect(leerNumero('0', { decimales: 2, admiteCero: true })).toEqual({ ok: true, valor: '0' })
    expect(leerNumero('-1', { decimales: 2, admiteCero: true })).toEqual({ ok: false, error: 'No puede ser negativo' })
  })

  it('rechaza decimales de más en lugar de redondear', () => {
    expect(monto('10,005')).toEqual({ ok: false, error: 'Usá hasta 2 decimales' })
    expect(leerNumero('0,123456789', { decimales: 8 })).toEqual({ ok: false, error: 'Usá hasta 8 decimales' })
    expect(leerNumero('0,12345678', { decimales: 8 })).toEqual({ ok: true, valor: '0.12345678' })
  })

  it('saca los ceros de adelante', () => {
    expect(monto('007,5')).toEqual({ ok: true, valor: '7.5' })
  })
})
