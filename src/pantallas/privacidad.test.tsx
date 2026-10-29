import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { crearAutenticacionFalsa } from '../../tests/interfaz/autenticacion-falsa.ts'
import { crearRepositorioFalso } from '../../tests/interfaz/repositorio-falso.ts'
import App from '../App.tsx'

// Google pide una política de privacidad pública, enlazada desde la página de
// inicio, para publicar la app de login (T29).
function abrir(ruta: string, email: string | null = null) {
  window.history.replaceState(null, '', ruta)
  render(<App autenticacion={crearAutenticacionFalsa(email)} repositorio={crearRepositorioFalso()} />)
  return userEvent.setup()
}

describe('privacidad', () => {
  it('sin sesión, /privacidad se puede leer y no muestra ningún dato', async () => {
    abrir('/privacidad')
    expect(await screen.findByRole('heading', { name: 'Privacidad', level: 1 })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/privacidad')
    expect(screen.getByRole('heading', { name: 'Qué datos se guardan' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cómo pedir que se borren tus datos' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Secciones' })).not.toBeInTheDocument()
  })

  it('la pantalla de entrar, que es la de inicio, enlaza a la privacidad y se puede volver', async () => {
    const usuario = abrir('/')
    await screen.findByRole('button', { name: 'Entrar con Google' })
    await usuario.click(screen.getByRole('link', { name: 'Privacidad' }))
    expect(await screen.findByRole('heading', { name: 'Privacidad', level: 1 })).toBeInTheDocument()

    await usuario.click(within(screen.getByRole('main')).getByRole('link', { name: 'Volver' }))
    expect(await screen.findByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument()
  })

  it('con sesión también se puede leer, y volver lleva al resumen', async () => {
    const usuario = abrir('/privacidad', 'ana@example.com')
    expect(await screen.findByRole('heading', { name: 'Privacidad', level: 1 })).toBeInTheDocument()
    await usuario.click(screen.getByRole('link', { name: 'Volver' }))
    expect(await screen.findByRole('heading', { name: 'Resumen' })).toBeInTheDocument()
  })
})
