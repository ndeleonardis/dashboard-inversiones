import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Confirmacion } from './Confirmacion.tsx'

describe('Confirmacion', () => {
  it('pregunta dentro de la pantalla, con el foco en la opción que no cambia nada', () => {
    render(
      <Confirmacion
        mensaje="¿Borrar este gasto?"
        textoConfirmar="Sí, borrar"
        textoCancelar="No"
        alConfirmar={() => {}}
        alCancelar={() => {}}
      />,
    )
    expect(screen.getByRole('alertdialog', { name: '¿Borrar este gasto?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No' })).toHaveFocus()
  })

  it('cada botón avisa lo que eligió la persona', async () => {
    const usuario = userEvent.setup()
    const alConfirmar = vi.fn()
    const alCancelar = vi.fn()
    render(
      <Confirmacion
        mensaje="¿Borrar este gasto?"
        textoConfirmar="Sí, borrar"
        textoCancelar="No"
        alConfirmar={alConfirmar}
        alCancelar={alCancelar}
      />,
    )
    await usuario.click(screen.getByRole('button', { name: 'Sí, borrar' }))
    expect(alConfirmar).toHaveBeenCalledOnce()
    await usuario.click(screen.getByRole('button', { name: 'No' }))
    expect(alCancelar).toHaveBeenCalledOnce()
  })
})
