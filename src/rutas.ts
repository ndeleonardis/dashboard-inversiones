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
} as const

export const rutaDePersona = (id: string) => `${RUTAS.personas}/${id}`
export const rutaDeCuenta = (id: string) => `${RUTAS.cuentas}/${id}`
