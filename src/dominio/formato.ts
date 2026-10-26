// Cómo se muestran los números y las fechas, en formato es-AR.
import type { Moneda } from './moneda.ts'

// La base devuelve los numeric como texto exacto. Intl los formatea sin pasar
// por un número de coma flotante.
type Numero = number | string
const comoNumero = (valor: Numero) => (typeof valor === 'string' ? (valor as `${number}`) : valor)

const formatosDeMonto: Record<Moneda, Intl.NumberFormat> = {
  ARS: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }),
  USD: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }),
}

/**
 * Un monto con su moneda siempre visible: "$ 25.291,50" o "US$ 25.291,50" (C24).
 * No hay forma de formatear un monto sin decir su moneda.
 */
export function formatearMonto(valor: Numero, moneda: Moneda): string {
  return formatosDeMonto[moneda].format(comoNumero(valor))
}

const formatoDeCantidad = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 8 })

/** Una cantidad de un instrumento, con hasta 8 decimales y sin ceros de más. */
export function formatearCantidad(valor: Numero): string {
  return formatoDeCantidad.format(comoNumero(valor))
}

const dosDigitos = (n: number) => String(n).padStart(2, '0')

/** "2026-03-01" → "01/03/2026", sin pasar por la zona horaria. */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

const formatoDeMes = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })

/** "2026-10-01" → "octubre de 2026". */
export function formatearMes(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number)
  return formatoDeMes.format(new Date(anio!, numero! - 1, 1))
}

/** Un momento guardado por la base, en fecha y hora local: "26/10/2026 18:05". */
export function formatearMomento(momento: string): string {
  const fecha = new Date(momento)
  return (
    `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()} ` +
    `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
  )
}
