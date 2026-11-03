// Las reglas del peso de Pesaje, el módulo opcional fuera de lo financiero.
import { leerNumero, type NumeroLeido } from './numeros.ts'

/** El tope del peso, el mismo que pone la base (C51). Frena un peso escrito en gramos por error. */
export const PESO_MAXIMO = 300

/**
 * Lee un peso en kilogramos con hasta 2 decimales (C51). A diferencia de los
 * montos, un punto sin coma se toma como decimal: un peso nunca llega a los
 * miles, así que "57.3" solo puede ser 57,3. "4.350" da error por decimales,
 * y nunca se guarda como 4.350 kg.
 */
export function leerPeso(texto: string): NumeroLeido {
  const limpio = texto.trim()
  const conComa = !limpio.includes(',') && limpio.split('.').length === 2 ? limpio.replace('.', ',') : limpio
  const leido = leerNumero(conComa, { decimales: 2 })
  if (leido.ok && Number(leido.valor) > PESO_MAXIMO) {
    return { ok: false, error: `No puede pasar de ${PESO_MAXIMO} kg` }
  }
  return leido
}

/** La dirección en la que conviene que vaya el peso de alguien (C61). */
export type Objetivo = 'bajar' | 'subir' | 'ninguno'

export const OBJETIVOS: { valor: Objetivo; nombre: string }[] = [
  { valor: 'ninguno', nombre: 'Sin objetivo' },
  { valor: 'bajar', nombre: 'Bajar' },
  { valor: 'subir', nombre: 'Subir' },
]

/** Cómo se muestra el objetivo de alguien: "Objetivo: bajar" o "Sin objetivo" (C58). */
export function etiquetaDeObjetivo(objetivo: string): string {
  return objetivo === 'bajar' || objetivo === 'subir' ? `Objetivo: ${objetivo}` : 'Sin objetivo'
}

export type SentidoDeVariacion = 'buena' | 'mala' | 'neutra'

/**
 * Si una variación va hacia el objetivo de quien se pesó (C62). Sin objetivo, o
 * si el peso no cambió, es neutra: subir o bajar no es bueno ni malo por sí mismo.
 */
/** El signo de la variación ya redondeada a 10 gramos, como se lee: 1, -1 o 0. */
export function signoDeVariacion(variacion: number | string): number {
  return Math.sign(Math.round(Number(variacion) * 100))
}

export function sentidoDeVariacion(variacion: number | string, objetivo: string): SentidoDeVariacion {
  const signo = signoDeVariacion(variacion)
  if (signo === 0) return 'neutra'
  if (objetivo === 'bajar') return signo < 0 ? 'buena' : 'mala'
  if (objetivo === 'subir') return signo > 0 ? 'buena' : 'mala'
  return 'neutra'
}
