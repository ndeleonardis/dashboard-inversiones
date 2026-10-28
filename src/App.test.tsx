import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('monta con el nombre de la app, el menú y la barra para cargar', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'LemonHouse' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Secciones' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Cargar' })).toBeInTheDocument()
  })
})
