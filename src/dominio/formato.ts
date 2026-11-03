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

const formatosDePrecio: Record<Moneda, Intl.NumberFormat> = {
  ARS: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 8 }),
  USD: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 8 }),
}

/** Un precio unitario con su moneda. Como la base, admite hasta 8 decimales: "US$ 0,00012345". */
export function formatearPrecio(valor: Numero, moneda: Moneda): string {
  return formatosDePrecio[moneda].format(comoNumero(valor))
}

const formatosDeVariacion: Record<Moneda, Intl.NumberFormat> = {
  ARS: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, signDisplay: 'exceptZero' }),
  USD: new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, signDisplay: 'exceptZero' }),
}

/** Cuánto ganó o perdió algo, con su moneda y su signo: "+$ 97.297,50" o "-US$ 21,00" (C42). */
export function formatearVariacion(valor: Numero, moneda: Moneda): string {
  return formatosDeVariacion[moneda].format(comoNumero(valor))
}

const formatoDePorcentaje = new Intl.NumberFormat('es-AR', {
  style: 'percent',
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
})

/** Una fracción como porcentaje con signo: 0,125 → "+12,5%" (C42). */
export function formatearPorcentaje(fraccion: Numero): string {
  return formatoDePorcentaje.format(comoNumero(fraccion))
}

const formatoDePeso = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatoDeVariacionDePeso = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

/** Un peso de Pesaje, en kilogramos con dos decimales: "57,30 kg" (C55). */
export function formatearPeso(valor: Numero): string {
  return `${formatoDePeso.format(comoNumero(valor))} kg`
}

/** Cuánto cambió un peso, con su signo salvo el cero: "+0,30 kg" o "-0,15 kg" (C56). */
export function formatearVariacionDePeso(valor: Numero): string {
  return `${formatoDeVariacionDePeso.format(comoNumero(valor))} kg`
}

const formatoDeCantidad = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 8 })

/** Una cantidad de un instrumento, con hasta 8 decimales y sin ceros de más. */
export function formatearCantidad(valor: Numero): string {
  return formatoDeCantidad.format(comoNumero(valor))
}

/** Un número de 1 o 2 cifras con dos dígitos: 3 → "03". */
export const dosDigitos = (n: number) => String(n).padStart(2, '0')

/** "2026-03-01" → "01/03/2026", sin pasar por la zona horaria. */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

/** "2026-11-02" → "02/11", para la fecha de un valor: "Valor al 02/11" (C34). */
export function formatearDiaYMes(fecha: string): string {
  const [, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}/${mes}`
}

const formatoDeMes =new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })

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
