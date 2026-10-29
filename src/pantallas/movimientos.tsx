// Lo que comparten gastos e ingresos: la moneda, el monto, la fecha y la
// descripción del formulario, y el orden de la lista. La moneda se elige
// siempre: nunca se da por sentada (regla 2).
import { Campo } from '../componentes/Campo.tsx'
import { useFormulario, type Errores, type Valores } from '../componentes/Formulario.tsx'
import { ErrorDeLaApp, MENSAJES_DE_COLUMNA } from '../datos/errores.ts'
import type { Fila } from '../datos/repositorio.ts'
import { avisoDeFechaFutura } from '../dominio/fechas.ts'
import { formatearCantidad } from '../dominio/formato.ts'
import { MONEDAS, NOMBRE_DE_MONEDA, OPCIONES_DE_MONEDA, type Moneda } from '../dominio/moneda.ts'
import { leerNumero } from '../dominio/numeros.ts'

type Movimiento = Fila<'gasto'> | Fila<'ingreso'>

// Lo que admite la base: hasta 2 decimales, y mayor que cero.
const REGLAS_DE_MONTO = { decimales: 2 }

export type ValoresDeMovimiento = { moneda: string; monto: string; fecha: string; descripcion: string }

export function validarMovimiento(valores: Valores): Errores {
  const falta = (campo: string) => (valores[campo]?.trim() ? undefined : MENSAJES_DE_COLUMNA[campo])
  const monto = valores.monto ?? ''
  const leido = leerNumero(monto, REGLAS_DE_MONTO)
  return {
    moneda: falta('moneda'),
    monto: leido.ok ? undefined : monto.trim() ? leido.error : MENSAJES_DE_COLUMNA.monto,
    fecha: falta('fecha'),
  }
}

/** Moneda, monto, fecha y descripción, listos para la base. */
export function datosDeMovimiento({ moneda, monto, fecha, descripcion }: ValoresDeMovimiento) {
  const leido = leerNumero(monto, REGLAS_DE_MONTO)
  if (!leido.ok) throw new ErrorDeLaApp(leido.error, 'monto')
  return { moneda: moneda as Moneda, monto: leido.valor, fecha, descripcion: descripcion.trim() || null }
}

/** Los valores del formulario para un gasto o un ingreso guardado. */
export function valoresDeMovimiento({ moneda, monto, fecha, descripcion }: Movimiento): ValoresDeMovimiento {
  // El monto en formato argentino, que es lo que lee el formulario.
  return { moneda, monto: formatearCantidad(monto), fecha, descripcion: descripcion ?? '' }
}

/** Pide confirmar una fecha futura. Al editar, si la fecha no cambió, ya se confirmó antes. */
export const confirmarFecha =
  (original?: string) =>
  ({ fecha = '' }: Valores) =>
    fecha === original ? null : avisoDeFechaFutura(fecha)

export function CamposDeMonto() {
  const { valores } = useFormulario()
  const moneda = MONEDAS.find((m) => m === valores.moneda)
  return (
    <>
      <Campo nombre="moneda" etiqueta="Moneda" opciones={OPCIONES_DE_MONEDA} sinElegir="Elegí la moneda" />
      <Campo
        nombre="monto"
        etiqueta="Monto"
        inputMode="decimal"
        autoComplete="off"
        ayuda={moneda ? `En ${NOMBRE_DE_MONEDA[moneda].toLowerCase()}` : undefined}
      />
      <Campo nombre="fecha" etiqueta="Fecha" type="date" />
    </>
  )
}

export function CampoDeDescripcion() {
  return <Campo nombre="descripcion" etiqueta="Descripción (opcional)" autoComplete="off" />
}

/** El más nuevo primero. En un mismo día, el último cargado. */
export function masNuevosPrimero<M extends Movimiento>(movimientos: M[]): M[] {
  return [...movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado_en.localeCompare(a.creado_en))
}
