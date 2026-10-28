// Abre la app entera, con la sesión de un miembro y el repositorio falso, en la
// ruta pedida. Así los tests de pantallas recorren la app como una persona.
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App.tsx'
import type { Repositorio } from '../../src/datos/repositorio.ts'
import { crearAutenticacionFalsa } from './autenticacion-falsa.ts'
import { crearRepositorioFalso } from './repositorio-falso.ts'

/** El email de quien está conectado en los tests. Es el de Ana en cargarEjemplo. */
export const EMAIL_CONECTADO = 'ana@example.com'

export function abrirApp(ruta: string, repositorio: Repositorio = crearRepositorioFalso({ email: EMAIL_CONECTADO })) {
  window.history.replaceState(null, '', ruta)
  const usuario = userEvent.setup()
  render(<App autenticacion={crearAutenticacionFalsa(EMAIL_CONECTADO)} repositorio={repositorio} />)
  return { usuario, repositorio }
}

/** Ana entra a la app y Beto no. Dos tipos de cuenta y una cuenta de Ana. */
export async function cargarEjemplo(repositorio: Repositorio) {
  const ana = await repositorio.crear('persona', { nombre: 'Ana', email: EMAIL_CONECTADO })
  const beto = await repositorio.crear('persona', { nombre: 'Beto' })
  const banco = await repositorio.crear('tipo_cuenta', { nombre: 'Banco' })
  const billetera = await repositorio.crear('tipo_cuenta', { nombre: 'Billetera' })
  const cuenta = await repositorio.crear('cuenta', {
    persona_id: ana.id,
    tipo_cuenta_id: banco.id,
    entidad: 'Banco Uno',
    nombre: 'Caja de ahorro',
  })
  return { ana, beto, banco, billetera, cuenta }
}
