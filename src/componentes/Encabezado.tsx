// El título de cada pantalla, con la acción principal a la derecha y, si hace
// falta, un enlace para volver a la lista.
import { Link } from 'react-router'

type Enlace = { a: string; texto: string }

export function Encabezado({ titulo, volver, accion }: { titulo: string; volver?: Enlace; accion?: Enlace }) {
  return (
    <header className="encabezado">
      {volver && (
        <Link to={volver.a} className="volver" aria-label={`Volver a ${volver.texto}`}>
          <span aria-hidden="true">←</span> {volver.texto}
        </Link>
      )}
      <div className="encabezado-fila">
        <h1>{titulo}</h1>
        {accion && (
          <Link to={accion.a} className="boton boton-principal">
            {accion.texto}
          </Link>
        )}
      </div>
    </header>
  )
}
