// Layout global (T7) + montaje de la vista Resumen (T5).
// Elementos transversales: fecha de última actualización siempre visible y
// nota fija de que es una foto a una fecha (no en vivo) y read-only (§5.5, §6).
import { fechaActualizacion } from './data'
import { formatFecha } from './format'
import Resumen from './vistas/Resumen'

export default function App() {
  return (
    <div className="layout">
      <header className="cabecera">
        <div className="cabecera-titulo">
          <h1>Inversiones</h1>
          <p className="subtitulo">Sergio y Noelia</p>
        </div>
        <p className="fecha" title="Fecha de la foto de datos">
          Datos al <strong>{formatFecha(fechaActualizacion)}</strong>
        </p>
      </header>

      <p className="aviso" role="note">
        Es una <strong>foto</strong> de esa fecha, no son precios en vivo. La carga de
        datos sigue en el Excel.
      </p>

      <main className="contenido">
        <Resumen />
      </main>
    </div>
  )
}
