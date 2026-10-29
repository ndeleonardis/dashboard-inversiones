// Fechas como texto "AAAA-MM-DD", igual que las guarda la base. Siempre en
// hora local: a las 23:30 de Buenos Aires todavía es hoy, aunque en UTC ya
// sea mañana.
import { dosDigitos, formatearFecha } from './formato.ts'

export function hoy(reloj: Date = new Date()): string {
  return `${reloj.getFullYear()}-${dosDigitos(reloj.getMonth() + 1)}-${dosDigitos(reloj.getDate())}`
}

/** El mes de una fecha, como su primer día: "2026-02-28" → "2026-02-01". */
export function mesDe(fecha: string): string {
  return `${fecha.slice(0, 7)}-01`
}

export function mesActual(reloj: Date = new Date()): string {
  return mesDe(hoy(reloj))
}

function moverMes(mes: string, cuantos: number): string {
  const [anio, numero] = mes.split('-').map(Number)
  const destino = new Date(anio!, numero! - 1 + cuantos, 1)
  return `${destino.getFullYear()}-${dosDigitos(destino.getMonth() + 1)}-01`
}

export const mesAnterior = (mes: string) => moverMes(mes, -1)
export const mesSiguiente = (mes: string) => moverMes(mes, 1)

/** Si la fecha es posterior a hoy. La app pide confirmar antes de guardarla. */
export function esFutura(fecha: string, reloj: Date = new Date()): boolean {
  return fecha > hoy(reloj)
}

/** El aviso para confirmar una fecha posterior a hoy, o null si no hace falta. */
export function avisoDeFechaFutura(fecha: string, reloj: Date = new Date()): string | null {
  return esFutura(fecha, reloj) ? `La fecha ${formatearFecha(fecha)} es posterior a hoy.` : null
}
