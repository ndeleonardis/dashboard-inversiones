import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { abrirApp, cargarEjemplo } from '../../../tests/interfaz/abrir-app.tsx'
import { crearRepositorioFalso } from '../../../tests/interfaz/repositorio-falso.ts'

async function conEjemplo() {
  const repositorio = crearRepositorioFalso()
  return { repositorio, ...(await cargarEjemplo(repositorio)) }
}

const menu = () => within(screen.getByRole('navigation', { name: 'Secciones' }))

describe('personas', () => {
  it('la lista marca quién entra a la app', async () => {
    const { repositorio } = await conEjemplo()
    abrirApp('/personas', repositorio)
    expect(await screen.findByRole('link', { name: /Ana/ })).toHaveTextContent('Entra a la app')
    expect(screen.getByRole('link', { name: /Beto/ })).toHaveTextContent('No entra a la app')
  })

  it('una persona recién creada aparece para elegir al crear una cuenta (C5)', async () => {
    const { repositorio } = await conEjemplo()
    const { usuario } = abrirApp('/personas/nueva', repositorio)

    await usuario.type(await screen.findByLabelText('Nombre'), 'Dani')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('link', { name: /Dani/ })).toHaveTextContent('No entra a la app')

    await usuario.click(menu().getByRole('link', { name: 'Cuentas' }))
    await usuario.click(await screen.findByRole('link', { name: 'Nueva cuenta' }))
    expect(await screen.findByRole('option', { name: 'Dani' })).toBeInTheDocument()
  })

  it('sin nombre no se guarda', async () => {
    const { repositorio } = await conEjemplo()
    const crear = vi.spyOn(repositorio, 'crear')
    const { usuario } = abrirApp('/personas/nueva', repositorio)
    await usuario.click(await screen.findByRole('button', { name: 'Guardar' }))
    expect(screen.getByLabelText('Nombre')).toHaveAccessibleDescription('Poné un nombre')
    expect(crear).not.toHaveBeenCalled()
  })

  it('se edita el nombre, y el detalle dice quién la cargó (C27)', async () => {
    const { repositorio, beto } = await conEjemplo()
    const { usuario } = abrirApp(`/personas/${beto.id}`, repositorio)

    expect(await screen.findByText(/^Cargado por Ana el /)).toBeInTheDocument()
    const nombre = screen.getByLabelText('Nombre')
    await usuario.clear(nombre)
    await usuario.type(nombre, 'Beto Pérez')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('link', { name: /Beto Pérez/ })).toBeInTheDocument()
  })

  it('una persona con cuentas no se borra y la pantalla dice por qué (C7)', async () => {
    const { repositorio, beto } = await conEjemplo()
    vi.spyOn(repositorio, 'borrar').mockRejectedValueOnce({
      code: '23503',
      message: 'update or delete on table "persona" violates foreign key constraint "cuenta_persona_fk" on table "cuenta"',
    })
    const { usuario } = abrirApp(`/personas/${beto.id}`, repositorio)

    await usuario.click(await screen.findByRole('button', { name: 'Borrar' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede borrar: esta persona tiene cuentas')
    await usuario.click(menu().getByRole('link', { name: 'Personas' }))
    expect(await screen.findByRole('link', { name: /Beto/ })).toBeInTheDocument()
  })

  it('una persona sin uso se borra después de confirmar', async () => {
    const { repositorio, beto } = await conEjemplo()
    const { usuario } = abrirApp(`/personas/${beto.id}`, repositorio)

    await usuario.click(await screen.findByRole('button', { name: 'Borrar' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('¿Borrar a Beto?')
    await usuario.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    expect(await screen.findByRole('link', { name: /Ana/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Beto/ })).not.toBeInTheDocument()
  })

  it('a quien entra a la app no se la puede borrar desde acá', async () => {
    const { repositorio, ana } = await conEjemplo()
    abrirApp(`/personas/${ana.id}`, repositorio)
    expect(await screen.findByText(/pedíselo a quien administra la copia/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument()
  })
})
