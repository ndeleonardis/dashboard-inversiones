// Contrato de datos del dashboard (T2).
// Fuente: Excel "Investments Lemon House" (hojas Ctas_Titulares, FCI, ON,
// Acciones, Criptomonedas). Ver docs/plans/2026-07-12-*.md §5.
//
// Regla dura de la constitución: NUNCA se suman montos de monedas distintas.
// Por eso los saldos se guardan como lista por moneda y los totales se
// calculan siempre por moneda (eso lo hace la capa de datos en T4).

/** Moneda del monto. "ARS" = pesos, "USD" = dólares. Jamás se agregan entre sí. */
export type Moneda = 'ARS' | 'USD'

/** Titular de la cuenta o tenencia. En v1: "Sergio" o "Noelia". */
export type Titular = 'Sergio' | 'Noelia'

/** Tipo de activo, una hoja del Excel por tipo. */
export type TipoActivo = 'FCI' | 'ON' | 'Accion' | 'Cripto'

/** Estado de la posición según el Excel. */
export type Estado = 'ABIERTA' | 'CERRADA'

/** Monto en una moneda concreta. */
export interface Saldo {
  moneda: Moneda
  monto: number
}

/** Cuenta/broker/banco de un titular (hoja Ctas_Titulares). */
export interface Cuenta {
  id: string
  /** Nombre visible del broker o banco. */
  nombre: string
  titular: Titular
  /** Saldos por moneda. Puede tener ARS, USD o ambos. */
  saldos: Saldo[]
}

/** Una tenencia (fila de las hojas FCI/ON/Acciones/Criptomonedas). */
export interface Tenencia {
  tipo: TipoActivo
  titular: Titular
  /** Referencia a Cuenta.id donde está la tenencia. */
  cuentaId: string
  ticker: string
  moneda: Moneda
  /** Cantidad / unidades / cuotapartes. */
  cantidad: number
  /** Valor unitario de compra. */
  valorCompra: number
  /** Valor unitario actual (foto del Excel, no en vivo). */
  valorActual: number
  /** Rendimiento como fracción: 0.0925 = +9,25 %. */
  rendimiento: number
  estado: Estado
  comentario?: string
}

/** Documento raíz: única fuente de datos que carga la app. */
export interface Datos {
  /** Fecha de última actualización de los datos (ISO YYYY-MM-DD). */
  fechaActualizacion: string
  titulares: Titular[]
  cuentas: Cuenta[]
  tenencias: Tenencia[]
}
