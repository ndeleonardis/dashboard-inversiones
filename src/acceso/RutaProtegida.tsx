// Las pantallas con datos. Sin la sesión de un miembro no se muestran, y se
// va a la pantalla de entrar (C1).
import { Navigate, Outlet } from 'react-router'
import { RUTAS } from '../rutas.ts'
import { useSesion } from './Sesion.tsx'

export function RutaProtegida() {
  const { estado } = useSesion()
  if (estado === 'afuera') return <Navigate to={RUTAS.entrar} replace />
  if (estado === 'cargando') {
    return (
      <p role="status" className="cargando">
        Cargando…
      </p>
    )
  }
  return <Outlet />
}
