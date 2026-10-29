// Las dos monedas de LemonHouse. Nunca se suman entre sí (regla 2).
export const MONEDAS = ['ARS', 'USD'] as const

export type Moneda = (typeof MONEDAS)[number]

/** Cómo se nombra cada moneda en las pantallas. */
export const NOMBRE_DE_MONEDA: Record<Moneda, string> = { ARS: 'Pesos', USD: 'Dólares' }

/** Las monedas para elegir en un formulario. */
export const OPCIONES_DE_MONEDA = MONEDAS.map((moneda) => ({ valor: moneda, texto: NOMBRE_DE_MONEDA[moneda] }))
