import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { Estructura } from './Estructura.tsx'

function enLaRuta(ruta: string, alSalir = () => {}) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Estructura alSalir={alSalir}>
        <h1>Contenido</h1>
      </Estructura>
    </MemoryRouter>,
  )
}

describe('Estructura', () => {
  it('muestra el contenido de la pantalla', () => {
    enLaRuta('/')
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { name: 'Contenido' }))
  })

  it('la barra flotante tiene cargar gasto, ingreso y operación', () => {
    enLaRuta('/')
    const barra = screen.getByRole('navigation', { name: 'Cargar' })
    const acciones = within(barra).getAllByRole('link')
    expect(acciones.map((a) => [a.getAttribute('aria-label'), a.getAttribute('href')])).toEqual([
      ['Cargar gasto', '/gastos/nuevo'],
      ['Cargar ingreso', '/ingresos/nuevo'],
      ['Cargar operación', '/operaciones/nueva'],
    ])
  })

  it('el menú lleva a cada sección y marca la actual', () => {
    enLaRuta('/gastos')
    const menu = screen.getByRole('navigation', { name: 'Secciones' })
    const secciones = within(menu).getAllByRole('link')
    expect(secciones.map((s) => [s.textContent, s.getAttribute('href')])).toEqual([
      ['Resumen', '/'],
      ['Gastos', '/gastos'],
      ['Ingresos', '/ingresos'],
      ['Operaciones', '/operaciones'],
      ['Cuentas', '/cuentas'],
      ['Personas', '/personas'],
      ['Instrumentos', '/instrumentos'],
    ])
    expect(within(menu).getByRole('link', { name: 'Gastos' })).toHaveAttribute('aria-current', 'page')
    expect(within(menu).getByRole('link', { name: 'Resumen' })).not.toHaveAttribute('aria-current')
  })

  it('en el celular, el botón abre el menú y elegir una sección lo cierra', async () => {
    const usuario = userEvent.setup()
    enLaRuta('/')
    const boton = screen.getByRole('button', { name: 'Menú' })
    expect(boton).toHaveAttribute('aria-expanded', 'false')

    await usuario.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')

    await usuario.click(screen.getByRole('link', { name: 'Cuentas' }))
    expect(boton).toHaveAttribute('aria-expanded', 'false')
  })

  it('el menú termina con "Salir"', async () => {
    const usuario = userEvent.setup()
    const alSalir = vi.fn()
    enLaRuta('/', alSalir)
    const menu = screen.getByRole('navigation', { name: 'Secciones' })
    await usuario.click(within(menu).getByRole('button', { name: 'Salir' }))
    expect(alSalir).toHaveBeenCalledOnce()
  })
})
