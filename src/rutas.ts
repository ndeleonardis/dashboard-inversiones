// Las direcciones de cada pantalla.
export const RUTAS = {
  entrar: '/entrar',
  privacidad: '/privacidad',
  resumen: '/',
  gastos: '/gastos',
  gastoNuevo: '/gastos/nuevo',
  ingresos: '/ingresos',
  ingresoNuevo: '/ingresos/nuevo',
  operaciones: '/operaciones',
  operacionNueva: '/operaciones/nueva',
  cuentas: '/cuentas',
  cuentaNueva: '/cuentas/nueva',
  personas: '/personas',
  personaNueva: '/personas/nueva',
  instrumentos: '/instrumentos',
  instrumentoNuevo: '/instrumentos/nuevo',
  categorias: '/categorias',
} as const

/** Las categorías de gastos y las de ingresos tienen cada una sus direcciones. */
export type ClaseDeCategoria = 'gastos' | 'ingresos'
export const rutaDeNuevaCategoria = (clase: ClaseDeCategoria) => `${RUTAS.categorias}/${clase}/nueva`
export const rutaDeCategoria = (clase: ClaseDeCategoria, id: string) => `${RUTAS.categorias}/${clase}/${id}`

export const rutaDePersona = (id: string) => `${RUTAS.personas}/${id}`
export const rutaDeCuenta = (id: string) => `${RUTAS.cuentas}/${id}`
export const rutaDeInstrumento = (id: string) => `${RUTAS.instrumentos}/${id}`
export const rutaDeOperacion = (id: string) => `${RUTAS.operaciones}/${id}`
/** La lista de operaciones ya filtrada (C15), por ejemplo por cuenta e instrumento. */
export const rutaDeOperacionesFiltradas = (filtro: { persona?: string; cuenta?: string; instrumento?: string }) =>
  `${RUTAS.operaciones}?${new URLSearchParams(filtro)}`
export const rutaDeGasto = (id: string) => `${RUTAS.gastos}/${id}`
export const rutaDeIngreso = (id: string) => `${RUTAS.ingresos}/${id}`
/** Una lista de a un mes, en el mes de esa fecha: rutaDelMes(RUTAS.gastos, '2026-03-10') → "/gastos?mes=2026-03". */
export const rutaDelMes = (ruta: string, fecha: string) => `${ruta}?mes=${fecha.slice(0, 7)}`
/** Cargar una operación con la cuenta ya elegida. */
export const rutaDeNuevaOperacion = (cuentaId: string) => `${RUTAS.operacionNueva}?cuenta=${cuentaId}`
