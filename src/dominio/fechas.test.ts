import { describe, expect, it } from 'vitest'
import { avisoDeFechaFutura, esFutura, estaDesactualizado, hoy, mesActual, mesAnterior, mesDe, mesSiguiente } from './fechas.ts'

// Reloj fijo: 26 de octubre de 2026 a las 23:30, hora local.
const reloj = new Date(2026, 9, 26, 23, 30)

describe('fechas', () => {
  it('hoy es la fecha local, aunque en UTC ya sea mañana', () => {
    expect(hoy(reloj)).toBe('2026-10-26')
  })

  it('el mes actual es el primer día del mes', () => {
    expect(mesActual(reloj)).toBe('2026-10-01')
    expect(mesDe('2026-02-28')).toBe('2026-02-01')
  })

  it('se puede ir al mes anterior y al siguiente, cruzando el año', () => {
    expect(mesAnterior('2026-01-01')).toBe('2025-12-01')
    expect(mesSiguiente('2026-12-01')).toBe('2027-01-01')
  })

  it('una fecha posterior a hoy es futura', () => {
    expect(esFutura('2026-10-27', reloj)).toBe(true)
    expect(esFutura('2026-10-26', reloj)).toBe(false)
    expect(esFutura('2026-01-01', reloj)).toBe(false)
  })

  it('una fecha futura da un aviso para confirmar, y hoy no', () => {
    expect(avisoDeFechaFutura('2026-11-02', reloj)).toBe('La fecha 02/11/2026 es posterior a hoy.')
    expect(avisoDeFechaFutura('2026-10-26', reloj)).toBeNull()
  })

  it('un valor de hace más de 7 días está desactualizado (C38)', () => {
    expect(estaDesactualizado('2026-10-26', reloj)).toBe(false)
    expect(estaDesactualizado('2026-10-19', reloj)).toBe(false)
    expect(estaDesactualizado('2026-10-18', reloj)).toBe(true)
  })

  it('los días se cuentan bien al cruzar de mes y de año', () => {
    expect(estaDesactualizado('2026-09-30', new Date(2026, 9, 7, 9, 0))).toBe(false)
    expect(estaDesactualizado('2025-12-24', new Date(2026, 0, 2, 9, 0))).toBe(true)
  })
})
