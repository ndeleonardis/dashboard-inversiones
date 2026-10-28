// Mientras los datos llegan dice "Cargando…". Si no llegan, lo dice y deja
// probar de nuevo. Cuando están, muestra la pantalla.
import type { ReactNode } from 'react'
import type { Cargado } from '../datos/consultas.ts'

export function Carga<D>({ cargado, children }: { cargado: Cargado<D>; children: (datos: D) => ReactNode }) {
  if (cargado.estado === 'cargando') {
    return (
      <p role="status" className="cargando">
        Cargando…
      </p>
    )
  }
  if (cargado.estado === 'error') {
    return (
      <div role="alert" className="error-al-cargar">
        <p>No se pudieron cargar los datos. Revisá la conexión y probá de nuevo.</p>
        <button type="button" className="boton boton-secundario" onClick={cargado.reintentar}>
          Probar de nuevo
        </button>
      </div>
    )
  }
  return children(cargado.datos)
}
