// Las direcciones de cada pantalla.
export const RUTAS = {
  entrar: '/entrar',
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
} as const

export const rutaDePersona = (id: string) => `${RUTAS.personas}/${id}`
export const rutaDeCuenta = (id: string) => `${RUTAS.cuentas}/${id}`
export const rutaDeInstrumento = (id: string) => `${RUTAS.instrumentos}/${id}`
export const rutaDeOperacion = (id: string) => `${RUTAS.operaciones}/${id}`
export const rutaDeGasto = (id: string) => `${RUTAS.gastos}/${id}`
export const rutaDeIngreso = (id: string) => `${RUTAS.ingresos}/${id}`
/** Una lista de a un mes, en el mes de esa fecha: rutaDelMes(RUTAS.gastos, '2026-03-10') → "/gastos?mes=2026-03". */
export const rutaDelMes = (ruta: string, fecha: string) => `${ruta}?mes=${fecha.slice(0, 7)}`
/** Cargar una operación con la cuenta ya elegida. */
export const rutaDeNuevaOperacion = (cuentaId: string) => `${RUTAS.operacionNueva}?cuenta=${cuentaId}`
