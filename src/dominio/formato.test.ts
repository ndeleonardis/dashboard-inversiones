import { describe, expect, it } from 'vitest'
import { formatearCantidad, formatearFecha, formatearMes, formatearMomento, formatearMonto } from './formato.ts'
import { MONEDAS } from './moneda.ts'

// Intl separa el símbolo del número con un espacio duro (U+00A0).
const sinEspacioDuro = (texto: string) => texto.replace(/ /g, ' ')

describe('montos (C24)', () => {
  it('los pesos salen como $ 25.291,50', () => {
    expect(sinEspacioDuro(formatearMonto(25291.5, 'ARS'))).toBe('$ 25.291,50')
  })

  it('los dólares salen como US$ 25.291,50', () => {
    expect(sinEspacioDuro(formatearMonto(25291.5, 'USD'))).toBe('US$ 25.291,50')
  })

  it('acepta el monto como texto, como lo puede devolver la base', () => {
    expect(sinEspacioDuro(formatearMonto('2250.0000000000000000', 'ARS'))).toBe('$ 2.250,00')
  })

  it('cada moneda se ve distinta y siempre con su símbolo', () => {
    const textos = MONEDAS.map((moneda) => sinEspacioDuro(formatearMonto(0, moneda)))
    expect(textos).toEqual(['$ 0,00', 'US$ 0,00'])
  })

  it('un monto negativo lleva el signo', () => {
    expect(sinEspacioDuro(formatearMonto(-1234, 'ARS'))).toBe('-$ 1.234,00')
  })
})

describe('cantidades', () => {
  it('usan punto de miles y coma decimal, sin ceros de más', () => {
    expect(formatearCantidad(1234.5)).toBe('1.234,5')
    expect(formatearCantidad('15.00000000')).toBe('15')
    expect(formatearCantidad('0.05')).toBe('0,05')
  })

  it('muestran hasta 8 decimales, como guarda la base', () => {
    expect(formatearCantidad('0.12345678')).toBe('0,12345678')
  })
})

describe('fechas', () => {
  it('una fecha sale como día, mes y año', () => {
    expect(formatearFecha('2026-03-01')).toBe('01/03/2026')
  })

  it('un mes sale con su nombre', () => {
    expect(formatearMes('2026-10-01')).toBe('octubre de 2026')
  })

  it('un momento sale con fecha y hora local', () => {
    const momento = new Date(2026, 9, 26, 18, 5).toISOString()
    expect(formatearMomento(momento)).toBe('26/10/2026 18:05')
  })
})
