// Layout global (T7) + navegación entre Resumen y Detalle por activo (T6).
// Navegación por estado (sin router): una barra persistente con Resumen y los
// 4 tipos de activo. Elementos transversales: fecha de última actualización
// siempre visible y aviso fijo de foto/read-only (§5.5, §6).
import { useState } from 'react'
import { conteoPorTipo, fechaActualizacion } from './data'
import { formatFecha } from './format'
import { ETIQUETA_TIPO, TIPOS_ACTIVO } from './activos'
import type { TipoActivo } from './types'
import Resumen from './vistas/Resumen'
import DetalleActivo from './vistas/DetalleActivo'

type Vista = 'resumen' | TipoActivo

export default function App() {
  const [vista, setVista] = useState<Vista>('resumen')

  return (
    <div className="layout">
      <header className="cabecera">
        <div className="cabecera-titulo">
          <h1>🍋 Lemon House</h1>
          <p className="subtitulo">Cuánto tengo, cuánto tenés, cuánto tenemos</p>
        </div>
        <p className="fecha" title="Fecha de la foto de datos">
          Datos al <strong>{formatFecha(fechaActualizacion)}</strong>
        </p>
      </header>

      <nav className="nav" aria-label="Secciones">
        <button
          className={vista === 'resumen' ? 'nav-btn activo' : 'nav-btn'}
          onClick={() => setVista('resumen')}
          aria-current={vista === 'resumen' ? 'page' : undefined}
        >
          Resumen
        </button>
        {TIPOS_ACTIVO.map((t) => (
          <button
            key={t}
            className={vista === t ? 'nav-btn activo' : 'nav-btn'}
            onClick={() => setVista(t)}
            aria-current={vista === t ? 'page' : undefined}
          >
            {ETIQUETA_TIPO[t]}
            <span className="nav-conteo">{conteoPorTipo(t)}</span>
          </button>
        ))}
      </nav>

      <main className="contenido">
        {vista === 'resumen' ? <Resumen /> : <DetalleActivo tipo={vista} />}
      </main>
    </div>
  )
}
