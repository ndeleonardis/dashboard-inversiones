// Las dos monedas de LemonHouse. Nunca se suman entre sí (regla 2).
export const MONEDAS = ['ARS', 'USD'] as const

export type Moneda = (typeof MONEDAS)[number]
