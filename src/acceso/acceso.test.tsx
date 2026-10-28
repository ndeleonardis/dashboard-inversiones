import { QueryClient } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearAutenticacionFalsa } from '../../tests/interfaz/autenticacion-falsa.ts'
import { crearRepositorioFalso } from '../../tests/interfaz/repositorio-falso.ts'
import App from '../App.tsx'
import { leerAvisoDeLaUrl, type AvisoDeEntrada } from './aviso-de-entrada.ts'

const TEXTO_C3 = 'Este email no tiene acceso a LemonHouse. Pedile acceso a quien administra la app'
const FALLO_GOOGLE = 'No se pudo entrar con Google. Probá de nuevo.'

type Opciones = { email?: string | null; miembro?: boolean; avisoInicial?: AvisoDeEntrada | null }

function abrir(ruta: string, { email = null, miembro = true, avisoInicial = null }: Opciones = {}) {
  window.history.replaceState(null, '', ruta)
  const autenticacion = crearAutenticacionFalsa(email)
  const repositorio = crearRepositorioFalso({ esMiembro: miembro })
  const esMiembro = vi.spyOn(repositorio, 'esMiembro')
  render(<App autenticacion={autenticacion} repositorio={repositorio} avisoInicial={avisoInicial} />)
  return { autenticacion, esMiembro }
}

const volvioDeGoogleCon = (descripcion: string) =>
  leerAvisoDeLaUrl(`http://localhost:5173/?error=access_denied&error_description=${encodeURIComponent(descripcion)}`)

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('sin sesión (C1)', () => {
  it.each(['/', '/gastos', '/personas', '/cualquier-cosa'])('%s muestra la pantalla de entrar y ningún dato', async (ruta) => {
    const { esMiembro } = abrir(ruta)
    expect(await screen.findByRole('button', { name: 'Entrar con Google' })).toBeEnabled()
    expect(window.location.pathname).toBe('/entrar')
    expect(screen.queryByRole('navigation', { name: 'Secciones' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Resumen' })).not.toBeInTheDocument()
    expect(esMiembro).not.toHaveBeenCalled()
  })

  it('"Entrar con Google" lleva a Google', async () => {
    const usuario = userEvent.setup()
    const { autenticacion } = abrir('/')
    await usuario.click(await screen.findByRole('button', { name: 'Entrar con Google' }))
    expect(autenticacion.intentos).toBe(1)
    expect(screen.getByRole('button', { name: 'Abriendo Google…' })).toBeDisabled()
  })
})

describe('con sesión (C2)', () => {
  it('una persona invitada llega al resumen', async () => {
    abrir('/', { email: 'ana@example.com' })
    expect(await screen.findByRole('heading', { name: 'Resumen' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Secciones' })).toBeInTheDocument()
  })

  it('si ya entró, la pantalla de entrar la lleva al resumen', async () => {
    abrir('/entrar', { email: 'ana@example.com' })
    expect(await screen.findByRole('heading', { name: 'Resumen' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })
})

describe('sin invitación (C3)', () => {
  it('el rechazo del hook muestra el texto exacto de C3 y con qué email probó', async () => {
    abrir('/', { avisoInicial: volvioDeGoogleCon(`${TEXTO_C3} [intruso@example.com]`) })
    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent(TEXTO_C3)
    expect(aviso).toHaveTextContent('Probaste con intruso@example.com')
  })

  it('una persona que dejó de estar invitada sale de la app y ve el mismo texto', async () => {
    const { autenticacion } = abrir('/', { email: 'ex@example.com', miembro: false })
    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent(TEXTO_C3)
    expect(aviso).toHaveTextContent('Probaste con ex@example.com')
    expect(autenticacion.email).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Resumen' })).not.toBeInTheDocument()
  })
})

describe('salir (C4)', () => {
  it('lleva a entrar, borra lo que había en memoria, y el botón de atrás no muestra datos', async () => {
    const usuario = userEvent.setup()
    const vaciarConsultas = vi.spyOn(QueryClient.prototype, 'clear')
    abrir('/', { email: 'ana@example.com' })
    await screen.findByRole('heading', { name: 'Resumen' })
    localStorage.setItem('lemonhouse:borrador:gasto-nuevo', '{"monto":"10"}')

    await usuario.click(screen.getByRole('button', { name: 'Salir' }))

    expect(await screen.findByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument()
    expect(vaciarConsultas).toHaveBeenCalled()
    expect(localStorage.getItem('lemonhouse:borrador:gasto-nuevo')).toBeNull()

    act(() => window.history.back())
    await waitFor(() => expect(window.location.pathname).toBe('/entrar'))
    expect(screen.queryByRole('heading', { name: 'Resumen' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument()
  })
})

describe('errores al entrar', () => {
  it('si Google se cancela o se cae, sale el mensaje genérico', async () => {
    abrir('/', { avisoInicial: volvioDeGoogleCon('The user denied access') })
    expect(await screen.findByRole('alert')).toHaveTextContent(FALLO_GOOGLE)
  })

  it('un texto inventado en la URL no se muestra', async () => {
    abrir('/', { avisoInicial: volvioDeGoogleCon('Tu cuenta fue suspendida. Llamá al 0800') })
    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent(FALLO_GOOGLE)
    expect(aviso).not.toHaveTextContent('0800')
  })

  it('si no se puede ir a Google, avisa y deja probar de nuevo', async () => {
    const usuario = userEvent.setup()
    const { autenticacion } = abrir('/')
    autenticacion.fallarAlEntrar(new TypeError('Failed to fetch'))
    await usuario.click(await screen.findByRole('button', { name: 'Entrar con Google' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(FALLO_GOOGLE)
    expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeEnabled()
  })
})
