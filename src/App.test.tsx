import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { crearAutenticacionFalsa } from '../tests/interfaz/autenticacion-falsa.ts'
import { crearRepositorioFalso } from '../tests/interfaz/repositorio-falso.ts'
import App from './App'

describe('App', () => {
  it('con sesión, monta con el nombre de la app, el menú y la barra para cargar', async () => {
    window.history.replaceState(null, '', '/')
    render(<App autenticacion={crearAutenticacionFalsa('ana@example.com')} repositorio={crearRepositorioFalso()} />)
    expect(await screen.findByRole('link', { name: 'LemonHouse' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Secciones' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Cargar' })).toBeInTheDocument()
  })
})
