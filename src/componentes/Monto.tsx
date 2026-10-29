// Un monto con su moneda siempre visible (C24). La moneda es obligatoria: no
// hay forma de mostrar un monto sin decir si son pesos o dólares.
import { formatearMonto, formatearPrecio } from '../dominio/formato.ts'
import type { Moneda } from '../dominio/moneda.ts'

type PropsMonto = {
  valor: number | string
  moneda: Moneda
  /** Un precio unitario, que muestra hasta 8 decimales en lugar de redondear a centavos. */
  precio?: boolean
}

export function Monto({ valor, moneda, precio = false }: PropsMonto) {
  return <span className="monto">{(precio ? formatearPrecio : formatearMonto)(valor, moneda)}</span>
}
