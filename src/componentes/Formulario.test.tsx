import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MENSAJE_SESION_VENCIDA, MENSAJE_SIN_CONEXION } from '../datos/errores.ts'
import { Campo } from './Campo.tsx'
import { Formulario, type Valores } from './Formulario.tsx'

const INICIAL = { monto: '', categoria: '' }
const CATEGORIAS = [
  { valor: 'c1', texto: 'Categoría uno' },
  { valor: 'c2', texto: 'Categoría dos' },
]

type Props = {
  guardar?: (valores: Valores) => Promise<void>
  validar?: (valores: Valores) => Record<string, string | undefined>
  confirmar?: (valores: Valores) => string | null
  alGuardar?: () => void
}

function FormularioDePrueba({ guardar = async () => {}, ...resto }: Props) {
  return (
    <Formulario clave="prueba" inicial={INICIAL} guardar={guardar} {...resto}>
      <Campo nombre="monto" etiqueta="Monto" inputMode="decimal" />
      <Campo nombre="categoria" etiqueta="Categoría" opciones={CATEGORIAS} />
    </Formulario>
  )
}

const sinConexion = { message: 'TypeError: Failed to fetch' }
const sesionVencida = { code: 'PGRST303', message: 'JWT expired' }

describe('Formulario: error al guardar', () => {
  it('muestra el error, conserva lo escrito y no dice "Guardado"', async () => {
    const usuario = userEvent.setup()
    render(<FormularioDePrueba guardar={() => Promise.reject(sinConexion)} />)

    await usuario.type(screen.getByLabelText('Monto'), '1.234,56')
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'c2')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAJE_SIN_CONEXION)
    expect(screen.getByLabelText('Monto')).toHaveValue('1.234,56')
    expect(screen.getByLabelText('Categoría')).toHaveValue('c2')
    expect(screen.queryByText('Guardado')).not.toBeInTheDocument()
  })

  it('si la sesión venció, lo escrito queda en el navegador y vuelve al entrar', async () => {
    const usuario = userEvent.setup()
    const { unmount } = render(<FormularioDePrueba guardar={() => Promise.reject(sesionVencida)} />)

    await usuario.type(screen.getByLabelText('Monto'), '1.234,56')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAJE_SESION_VENCIDA)

    // La app manda a entrar de nuevo y el formulario se desmonta.
    unmount()
    const guardar = vi.fn(async () => {})
    const segundo = render(<FormularioDePrueba guardar={guardar} />)
    expect(screen.getByLabelText('Monto')).toHaveValue('1.234,56')
    expect(screen.getByText(/Recuperamos lo que habías escrito/)).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(guardar).toHaveBeenCalledWith({ monto: '1.234,56', categoria: '' })

    // Guardado, el borrador ya no vuelve.
    segundo.unmount()
    render(<FormularioDePrueba />)
    expect(screen.getByLabelText('Monto')).toHaveValue('')
  })

  it('un error de la base que es de un campo queda marcado en ese campo', async () => {
    const usuario = userEvent.setup()
    const montoEnCero = {
      code: '23514',
      message: 'new row for relation "gasto" violates check constraint "gasto_monto_positivo"',
    }
    render(<FormularioDePrueba guardar={() => Promise.reject(montoEnCero)} />)

    await usuario.type(screen.getByLabelText('Monto'), '0')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    const monto = screen.getByLabelText('Monto')
    expect(await screen.findByText('El monto tiene que ser mayor que cero')).toBeInTheDocument()
    expect(monto).toHaveAttribute('aria-invalid', 'true')
    expect(monto).toHaveAccessibleDescription('El monto tiene que ser mayor que cero')
  })
})

describe('Formulario: al guardar', () => {
  it('valida antes de guardar, marca el campo con su error y lleva el foco ahí', async () => {
    const usuario = userEvent.setup()
    const guardar = vi.fn(async () => {})
    render(<FormularioDePrueba guardar={guardar} validar={(v) => ({ monto: v.monto ? undefined : 'Falta el número' })} />)

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    const monto = screen.getByLabelText('Monto')
    expect(monto).toHaveAccessibleDescription('Falta el número')
    expect(monto).toHaveFocus()
    expect(guardar).not.toHaveBeenCalled()

    // Al corregirlo, el error se va.
    await usuario.type(monto, '5')
    expect(monto).not.toHaveAttribute('aria-invalid')
  })

  it('con todo bien dice "Guardado" y avisa a la pantalla', async () => {
    const usuario = userEvent.setup()
    const alGuardar = vi.fn()
    render(<FormularioDePrueba alGuardar={alGuardar} />)

    await usuario.type(screen.getByLabelText('Monto'), '10')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Guardado')).toBeInTheDocument()
    expect(alGuardar).toHaveBeenCalledOnce()
  })

  it('mientras guarda no se puede mandar dos veces', async () => {
    const usuario = userEvent.setup()
    let terminar = () => {}
    const guardar = vi.fn(() => new Promise<void>((resolver) => (terminar = resolver)))
    render(<FormularioDePrueba guardar={guardar} />)

    const boton = screen.getByRole('button', { name: 'Guardar' })
    await usuario.dblClick(boton)
    await usuario.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    expect(guardar).toHaveBeenCalledOnce()
    terminar()
    expect(await screen.findByText('Guardado')).toBeInTheDocument()
  })
})

describe('Formulario: confirmar dentro de la pantalla', () => {
  const confirmar = (v: Valores) => (v.monto === '999' ? 'El monto es muy alto. ¿Lo guardo igual?' : null)

  it('pide confirmar sin ventanas del navegador y guarda solo si se confirma', async () => {
    const usuario = userEvent.setup()
    const ventana = vi.spyOn(window, 'confirm')
    const guardar = vi.fn(async () => {})
    render(<FormularioDePrueba guardar={guardar} confirmar={confirmar} />)

    await usuario.type(screen.getByLabelText('Monto'), '999')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByRole('alertdialog')).toHaveTextContent('El monto es muy alto. ¿Lo guardo igual?')
    expect(guardar).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Guardar igual' }))
    expect(guardar).toHaveBeenCalledOnce()
    expect(ventana).not.toHaveBeenCalled()
  })

  it('"Revisar" vuelve al formulario sin guardar', async () => {
    const usuario = userEvent.setup()
    const guardar = vi.fn(async () => {})
    render(<FormularioDePrueba guardar={guardar} confirmar={confirmar} />)

    await usuario.type(screen.getByLabelText('Monto'), '999')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await usuario.click(screen.getByRole('button', { name: 'Revisar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Monto')).toHaveValue('999')
    expect(guardar).not.toHaveBeenCalled()
  })
})

describe('Campo', () => {
  it('con opciones es una lista para elegir, que arranca sin elegir', () => {
    render(<FormularioDePrueba />)
    const categoria = screen.getByLabelText('Categoría')
    expect(categoria.tagName).toBe('SELECT')
    expect(screen.getByRole('option', { name: 'Elegí una opción' })).toBeInTheDocument()
    expect(categoria).toHaveValue('')
  })
})
