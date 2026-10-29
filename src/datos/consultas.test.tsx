import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { crearRepositorioFalso } from '../../tests/interfaz/repositorio-falso.ts'
import { useCambios, useResumenMes } from './consultas.ts'
import { ProveedorDeRepositorio } from './contexto.tsx'

function Resumen() {
  const cargado = useResumenMes('2026-10-01')
  return <p>{cargado.estado === 'listo' ? 'Resumen a la vista' : 'Cargando'}</p>
}

function Cambios({ id }: { id: string }) {
  const { editar, borrar } = useCambios()
  return (
    <>
      <button type="button" onClick={() => void editar('gasto', id, { monto: '200' })}>
        Editar
      </button>
      <button type="button" onClick={() => void borrar('gasto', id)}>
        Borrar
      </button>
    </>
  )
}

describe('consultas', () => {
  it('después de editar o borrar un gasto, el resumen se vuelve a pedir (C19)', async () => {
    const repositorio = crearRepositorioFalso()
    const gasto = await repositorio.crear('gasto', {
      tipo_gasto_id: crypto.randomUUID(),
      fecha: '2026-10-05',
      monto: '100',
      moneda: 'ARS',
    })
    const resumenMes = vi.spyOn(repositorio, 'resumenMes')
    const usuario = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ProveedorDeRepositorio repositorio={repositorio}>
          <Resumen />
          <Cambios id={gasto.id} />
        </ProveedorDeRepositorio>
      </QueryClientProvider>,
    )

    await screen.findByText('Resumen a la vista')
    expect(resumenMes).toHaveBeenCalledTimes(1)
    expect(resumenMes).toHaveBeenCalledWith('2026-10-01')

    await usuario.click(screen.getByRole('button', { name: 'Editar' }))
    await waitFor(() => expect(resumenMes).toHaveBeenCalledTimes(2))

    await usuario.click(screen.getByRole('button', { name: 'Borrar' }))
    await waitFor(() => expect(resumenMes).toHaveBeenCalledTimes(3))
  })
})
