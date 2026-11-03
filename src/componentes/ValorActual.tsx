// Lo que vale hoy una posición o un total, con la fecha del valor (C34). Sin
// precio dice "Sin precio" y nunca $ 0 (C37, regla 5): por eso el valor puede
// ser null acá, y en Monto no.
import { estaDesactualizado } from '../dominio/fechas.ts'
import { formatearDiaYMes } from '../dominio/formato.ts'
import type { Moneda } from '../dominio/moneda.ts'
import { Monto } from './Monto.tsx'

type PropsValorActual = {
  valor: number | string | null
  moneda: Moneda
  /** La fecha del valor. Un total no tiene una sola fecha, y va null. */
  fecha: string | null
  /** En un total, cuántos instrumentos no tienen precio (C41). */
  sinPrecio?: number
  reloj?: Date
}

export function ValorActual({ valor, moneda, fecha, sinPrecio = 0, reloj }: PropsValorActual) {
  return (
    <span className="valor-actual">
      {valor === null ? <span className="sin-precio">Sin precio</span> : <Monto valor={valor} moneda={moneda} />}
      {valor !== null && fecha !== null && (
        <span className="valor-fecha">
          Valor al {formatearDiaYMes(fecha)}
          {estaDesactualizado(fecha, reloj) && <span className="valor-desactualizado"> · desactualizado</span>}
        </span>
      )}
      {sinPrecio > 0 && (
        <span className="valor-parcial">
          Parcial: {sinPrecio} {sinPrecio === 1 ? 'instrumento' : 'instrumentos'} sin precio
        </span>
      )}
    </span>
  )
}
