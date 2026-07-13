// Capa de datos (T4). Fuente ÚNICA que consume la app.
//
// Reglas duras (constitución):
//  - NUNCA se suman montos de monedas distintas: todos los totales son por moneda.
//  - Solo se consideran posiciones ABIERTA (decisión 2026-07-12); las CERRADA se
//    descartan del detalle y de cualquier cálculo derivado.
//
// El JSON importado se ensancha a `string` (import de JSON), por eso se narrowa
// una sola vez acá a `Datos`. El sample está validado en T2; el importador (T3)
// valida el JSON real antes de escribirlo.
//
// Para la app familiar se cambia la línea del import por `data/real/data.json`.
import type { Cuenta, Datos, Moneda, Tenencia, TipoActivo, Titular } from './types'
import datosRaw from '../data/sample/data.json'

export const datos = datosRaw as unknown as Datos

export const fechaActualizacion: string = datos.fechaActualizacion
export const titulares: Titular[] = datos.titulares

/** Tenencias actuales = solo posiciones ABIERTA. */
export const tenenciasActivas: Tenencia[] = datos.tenencias.filter(
  (t) => t.estado === 'ABIERTA',
)

/** Total de saldos de cuentas de un titular en UNA moneda. Nunca mezcla monedas. */
export function totalPorTitular(titular: Titular, moneda: Moneda): number {
  return datos.cuentas
    .filter((c) => c.titular === titular)
    .flatMap((c) => c.saldos)
    .filter((s) => s.moneda === moneda)
    .reduce((acc, s) => acc + s.monto, 0)
}

/** Total combinado de ambos titulares en UNA moneda. Nunca mezcla monedas. */
export function totalCombinado(moneda: Moneda): number {
  return titulares.reduce((acc, t) => acc + totalPorTitular(t, moneda), 0)
}

/** Cuentas de un titular; sin argumento, todas. */
export function porCuenta(titular?: Titular): Cuenta[] {
  return titular ? datos.cuentas.filter((c) => c.titular === titular) : datos.cuentas
}

/** Tenencias ABIERTA de un tipo de activo. */
export function tenenciasPorTipo(tipo: TipoActivo): Tenencia[] {
  return tenenciasActivas.filter((t) => t.tipo === tipo)
}

/** Cantidad de tenencias ABIERTA por tipo (para los accesos del menú). */
export function conteoPorTipo(tipo: TipoActivo): number {
  return tenenciasPorTipo(tipo).length
}

/** Cuenta/broker por id; undefined si no existe. */
export function cuentaPorId(id: string): Cuenta | undefined {
  return datos.cuentas.find((c) => c.id === id)
}

/** Monedas presentes en los saldos de una cuenta (para render por moneda). */
export function monedasDeCuenta(cuenta: Cuenta): Moneda[] {
  return cuenta.saldos.map((s) => s.moneda)
}
