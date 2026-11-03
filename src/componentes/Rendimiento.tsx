// Cuánto ganó o perdió una posición o un total, en monto y en porcentaje (C42).
// Verde si gana y rojo si pierde, siempre con el signo, así no depende solo
// del color. Sin precio, o con un total parcial, no se muestra.
import { formatearPorcentaje, formatearVariacion } from '../dominio/formato.ts'
import type { Moneda } from '../dominio/moneda.ts'

type PropsRendimiento = {
  monto: number | string | null
  /** Como fracción del costo: 0,125 es 12,5 %. */
  fraccion: number | string | null
  moneda: Moneda
}

export function Rendimiento({ monto, fraccion, moneda }: PropsRendimiento) {
  if (monto === null || fraccion === null) return null
  const signo = Math.sign(Number(monto))
  const clase = signo > 0 ? 'rendimiento rendimiento-gana' : signo < 0 ? 'rendimiento rendimiento-pierde' : 'rendimiento'
  return (
    <span className={clase}>
      {formatearVariacion(monto, moneda)} ({formatearPorcentaje(fraccion)})
    </span>
  )
}
