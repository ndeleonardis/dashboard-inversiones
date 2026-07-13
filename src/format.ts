// Utilidades de formato (es-AR). Reutilizadas por Resumen (T5) y Detalle (T6).
import type { Moneda } from './types'

const NOMBRE_MONEDA: Record<Moneda, string> = {
  ARS: 'Pesos',
  USD: 'Dólares',
}

/** Nombre legible de la moneda. */
export function nombreMoneda(moneda: Moneda): string {
  return NOMBRE_MONEDA[moneda]
}

/**
 * Formatea un monto en su moneda: "$ 9.450.000" (ARS) / "US$ 12.440" (USD).
 * Nunca convierte entre monedas; solo muestra el número con su símbolo.
 */
export function formatMoneda(monto: number, moneda: Moneda, maxDecimales = 0): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimales,
  }).format(monto)
}

/** Cantidad / unidades / cuotapartes: hasta 4 decimales, sin símbolo. */
export function formatCantidad(cantidad: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 4 }).format(cantidad)
}

/** Rendimiento como porcentaje con signo: 0.0925 → "+9,3 %". */
export function formatPorcentaje(fraccion: number): string {
  const signo = fraccion > 0 ? '+' : ''
  return signo + new Intl.NumberFormat('es-AR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(fraccion)
}

/** Fecha ISO "2026-07-10" → "10 de julio de 2026" (sin corrimiento por zona horaria). */
export function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(y, m - 1, d))
}
