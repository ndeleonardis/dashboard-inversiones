// Pesaje: el registro semanal de peso de personas y mascotas. Es un módulo
// opcional, fuera de lo financiero, que solo existe si la copia lo prende (C43).
import { Link } from 'react-router'
import { Encabezado } from '../../componentes/Encabezado.tsx'
import { RUTAS } from '../../rutas.ts'

export function ListaDePesajes() {
  return (
    <>
      <Encabezado titulo="Pesaje" />
      <Link to={RUTAS.pesajeIntegrantes} className="boton boton-secundario">
        Quiénes se pesan
      </Link>
    </>
  )
}
