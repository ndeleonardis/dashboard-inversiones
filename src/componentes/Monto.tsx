// Un monto con su moneda siempre visible (C24). La moneda es obligatoria: no
// hay forma de mostrar un monto sin decir si son pesos o dólares.
import { formatearMonto } from '../dominio/formato.ts'
import type { Moneda } from '../dominio/moneda.ts'

export function Monto({ valor, moneda }: { valor: number | string; moneda: Moneda }) {
  return <span className="monto">{formatearMonto(valor, moneda)}</span>
}
