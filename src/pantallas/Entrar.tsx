// La pantalla de entrar. Es lo único que ve alguien sin sesión (C1). Si Google
// o el hook rechazaron el intento, dice por qué y con qué email se probó (C3).
import { useState } from 'react'
import { Navigate } from 'react-router'
import { useSesion } from '../acceso/Sesion.tsx'
import { RUTAS } from '../rutas.ts'

export function Entrar() {
  const { estado, aviso, entrar } = useSesion()
  const [yendo, setYendo] = useState(false)

  if (estado === 'adentro') return <Navigate to={RUTAS.resumen} replace />

  async function irAGoogle() {
    setYendo(true)
    if (!(await entrar())) setYendo(false)
  }

  return (
    <main className="entrar">
      <h1 className="entrar-marca">LemonHouse</h1>
      <p className="entrar-bajada">Ingresos, gastos e inversiones, en pesos y en dólares.</p>
      {aviso && (
        <div role="alert" className="entrar-aviso">
          <p>{aviso.mensaje}</p>
          {aviso.email && <p>Probaste con {aviso.email}</p>}
        </div>
      )}
      <button
        type="button"
        className="boton boton-principal"
        onClick={() => void irAGoogle()}
        disabled={yendo || estado === 'cargando'}
      >
        {yendo ? 'Abriendo Google…' : 'Entrar con Google'}
      </button>
    </main>
  )
}
