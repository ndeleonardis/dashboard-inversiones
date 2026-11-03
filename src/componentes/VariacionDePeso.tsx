// Cuánto cambió un peso desde el pesaje anterior de quien se pesó (C56). El
// color sale de su objetivo y no del signo (C62): con "Bajar", bajar es verde.
// Siempre va con el signo y una flecha, así no depende solo del color.
import { formatearVariacionDePeso } from '../dominio/formato.ts'
import { sentidoDeVariacion } from '../dominio/pesaje.ts'

type PropsVariacionDePeso = {
  /** Null en el primer pesaje, que no tiene anterior. */
  variacion: number | string | null
  objetivo: string
}

export function VariacionDePeso({ variacion, objetivo }: PropsVariacionDePeso) {
  if (variacion === null) return <span className="variacion-peso variacion-neutra">Primer pesaje</span>

  const signo = Math.sign(Math.round(Number(variacion) * 100))
  const flecha = signo > 0 ? '↑' : signo < 0 ? '↓' : null
  return (
    <span className={`variacion-peso variacion-${sentidoDeVariacion(variacion, objetivo)}`}>
      {flecha && <span aria-hidden="true">{flecha}</span>}
      {formatearVariacionDePeso(variacion)}
    </span>
  )
}
