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

/** Los días entre dos fechas "AAAA-MM-DD", contados en el calendario y sin horas. */
function diasEntre(desde: string, hasta: string): number {
  const comoDia = (fecha: string) => {
    const [anio, mes, dia] = fecha.split('-').map(Number)
    return Date.UTC(anio!, mes! - 1, dia!)
  }
  return Math.round((comoDia(hasta) - comoDia(desde)) / 86_400_000)
}

/** Los días a partir de los cuales un valor se marca como desactualizado (C38). */
export const DIAS_PARA_DESACTUALIZADO = 7

/** Si el valor de esa fecha tiene más de 7 días. Un fondo que dejó de publicar se nota así. */
export function estaDesactualizado(fecha: string, reloj: Date = new Date()): boolean {
  return diasEntre(fecha.slice(0, 10), hoy(reloj)) > DIAS_PARA_DESACTUALIZADO
}

/** El aviso para confirmar una fecha posterior a hoy, o null si no hace falta. */
export function avisoDeFechaFutura(fecha: string, reloj: Date = new Date()): string | null {
  return esFutura(fecha, reloj) ? `La fecha ${formatearFecha(fecha)} es posterior a hoy.` : null
}
