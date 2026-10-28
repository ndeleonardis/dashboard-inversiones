// Lo que comparten todas las pantallas: la cabecera con el menú de secciones,
// el contenido y la barra flotante para cargar. En el celular el menú se abre
// con un botón. Desde 768 px queda siempre a la vista (C33).
import { useId, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { RUTAS } from '../rutas.ts'

const SECCIONES = [
  { ruta: RUTAS.resumen, nombre: 'Resumen' },
  { ruta: RUTAS.gastos, nombre: 'Gastos' },
  { ruta: RUTAS.ingresos, nombre: 'Ingresos' },
  { ruta: RUTAS.operaciones, nombre: 'Operaciones' },
  { ruta: RUTAS.cuentas, nombre: 'Cuentas' },
  { ruta: RUTAS.personas, nombre: 'Personas' },
  { ruta: RUTAS.instrumentos, nombre: 'Instrumentos' },
]

const ACCIONES = [
  { ruta: RUTAS.gastoNuevo, texto: 'Gasto', nombre: 'Cargar gasto' },
  { ruta: RUTAS.ingresoNuevo, texto: 'Ingreso', nombre: 'Cargar ingreso' },
  { ruta: RUTAS.operacionNueva, texto: 'Operación', nombre: 'Cargar operación' },
]

function IconoMas() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function IconoMenu() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      {[5, 15].flatMap((x) => [5, 15].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="2" />))}
    </svg>
  )
}

export function Estructura({ children }: { children: ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const idMenu = useId()

  return (
    <div className="estructura">
      <header className="cabecera">
        <Link to={RUTAS.resumen} className="marca">
          LemonHouse
        </Link>
        <button
          type="button"
          className="boton-menu"
          aria-expanded={menuAbierto}
          aria-controls={idMenu}
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          <IconoMenu />
          Menú
        </button>
        <nav id={idMenu} className="menu" aria-label="Secciones" data-abierto={menuAbierto}>
          <ul>
            {SECCIONES.map((seccion) => (
              <li key={seccion.ruta}>
                <NavLink to={seccion.ruta} end={seccion.ruta === RUTAS.resumen} onClick={() => setMenuAbierto(false)}>
                  {seccion.nombre}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="contenedor">{children}</main>

      <nav className="barra-flotante" aria-label="Cargar">
        {ACCIONES.map((accion) => (
          <Link key={accion.ruta} to={accion.ruta} className="barra-accion" aria-label={accion.nombre}>
            <span className="barra-icono">
              <IconoMas />
            </span>
            {accion.texto}
          </Link>
        ))}
      </nav>
    </div>
  )
}
