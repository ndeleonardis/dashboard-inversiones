import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { abrirApp, cargarEjemplo } from '../../../tests/interfaz/abrir-app.tsx'
import { crearRepositorioFalso } from '../../../tests/interfaz/repositorio-falso.ts'

async function conEjemplo() {
  const repositorio = crearRepositorioFalso()
  return { repositorio, ...(await cargarEjemplo(repositorio)) }
}

const menu = () => within(screen.getByRole('navigation', { name: 'Secciones' }))

describe('cuentas', () => {
  it('cada cuenta muestra su tipo y su dueño', async () => {
    const { repositorio } = await conEjemplo()
    abrirApp('/cuentas', repositorio)
    const tarjeta = await screen.findByRole('link', { name: /Banco Uno/ })
    expect(tarjeta).toHaveTextContent('Caja de ahorro')
    expect(tarjeta).toHaveTextContent('Banco')
    expect(tarjeta).toHaveTextContent('De Ana')
  })

  it('el formulario pide dueño, tipo y entidad antes de enviar (C6)', async () => {
    const { repositorio } = await conEjemplo()
    const crear = vi.spyOn(repositorio, 'crear')
    const { usuario } = abrirApp('/cuentas/nueva', repositorio)

    await usuario.click(await screen.findByRole('button', { name: 'Guardar' }))

    expect(screen.getByLabelText('Dueño')).toHaveAccessibleDescription('Elegí una persona')
    expect(screen.getByLabelText('Tipo')).toHaveAccessibleDescription('Elegí el tipo de cuenta')
    expect(screen.getByLabelText('Entidad')).toHaveAccessibleDescription(/Poné el banco o broker/)
    expect(crear).not.toHaveBeenCalled()
  })

  it('se carga una cuenta y aparece con su dueño, sin nombre si no se pone', async () => {
    const { repositorio } = await conEjemplo()
    const { usuario } = abrirApp('/cuentas/nueva', repositorio)

    await usuario.selectOptions(await screen.findByLabelText('Dueño'), 'Beto')
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'Billetera')
    await usuario.type(screen.getByLabelText('Entidad'), '  Billetera Dos ')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    const tarjeta = await screen.findByRole('link', { name: /Billetera Dos/ })
    expect(tarjeta).toHaveTextContent('De Beto')
    expect((await repositorio.listar('cuenta')).find((c) => c.entidad === 'Billetera Dos')).toMatchObject({ nombre: null })
  })

  it('se edita, y el detalle dice quién la cargó (C27)', async () => {
    const { repositorio, cuenta } = await conEjemplo()
    const { usuario } = abrirApp(`/cuentas/${cuenta.id}`, repositorio)

    expect(await screen.findByText(/^Cargado por Ana el /)).toBeInTheDocument()
    expect(screen.getByLabelText('Dueño')).toHaveDisplayValue('Ana')
    const entidad = screen.getByLabelText('Entidad')
    await usuario.clear(entidad)
    await usuario.type(entidad, 'Banco Tres')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('link', { name: /Banco Tres/ })).toBeInTheDocument()
  })

  it('al borrar una cuenta en uso, muestra qué la usa y la cuenta sigue en la lista (C7)', async () => {
    const { repositorio, cuenta } = await conEjemplo()
    vi.spyOn(repositorio, 'borrar').mockRejectedValueOnce({
      code: '23503',
      message: 'update or delete on table "cuenta" violates foreign key constraint "operacion_cuenta_fk" on table "operacion"',
    })
    const { usuario } = abrirApp(`/cuentas/${cuenta.id}`, repositorio)

    await usuario.click(await screen.findByRole('button', { name: 'Borrar' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede borrar: esta cuenta tiene operaciones cargadas')
    await usuario.click(menu().getByRole('link', { name: 'Cuentas' }))
    expect(await screen.findByRole('link', { name: /Banco Uno/ })).toBeInTheDocument()
  })

  it('sin personas, pide cargar una antes', async () => {
    abrirApp('/cuentas/nueva')
    expect(await screen.findByText(/primero cargá a su dueño/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nueva persona' })).toHaveAttribute('href', '/personas/nueva')
  })

  it('si la cuenta ya no existe, lo dice', async () => {
    abrirApp('/cuentas/no-existe')
    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró. Puede que alguien lo haya borrado')
  })
})
