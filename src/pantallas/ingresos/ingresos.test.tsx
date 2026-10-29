import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { abrirApp, cargarEjemplo } from '../../../tests/interfaz/abrir-app.tsx'
import { crearRepositorioFalso } from '../../../tests/interfaz/repositorio-falso.ts'
import { hoy } from '../../dominio/fechas.ts'

async function conEjemplo() {
  const repositorio = crearRepositorioFalso()
  const ejemplo = await cargarEjemplo(repositorio)
  const salario = await repositorio.crear('tipo_ingreso', { nombre: 'Salario' })
  return { repositorio, ...ejemplo, salario }
}

type Usuario = ReturnType<typeof abrirApp>['usuario']
type Carga = { categoria?: string; persona?: string; moneda?: string; monto?: string; fecha?: string; cuenta?: string }

const CUENTA = 'Cuenta donde se cobró (opcional)'

async function completar(usuario: Usuario, carga: Carga) {
  const escribir = async (etiqueta: string, texto: string) => {
    const campo = screen.getByLabelText(etiqueta)
    await usuario.clear(campo)
    await usuario.type(campo, texto)
  }
  if (carga.categoria) await usuario.selectOptions(await screen.findByLabelText('Categoría'), carga.categoria)
  if (carga.persona) await usuario.selectOptions(screen.getByLabelText('Persona'), carga.persona)
  if (carga.moneda) await usuario.selectOptions(screen.getByLabelText('Moneda'), carga.moneda)
  if (carga.monto) await escribir('Monto', carga.monto)
  if (carga.fecha) await escribir('Fecha', carga.fecha)
  if (carga.cuenta !== undefined) await usuario.selectOptions(screen.getByLabelText(CUENTA), carga.cuenta)
}

const guardar = () => screen.getByRole('button', { name: 'Guardar' })

describe('ingresos', () => {
  it('el ingreso pide persona y no pide cuenta (C17)', async () => {
    const { repositorio, ana, salario } = await conEjemplo()
    const crear = vi.spyOn(repositorio, 'crear')
    const { usuario } = abrirApp('/ingresos/nuevo', repositorio)

    await usuario.click(await screen.findByRole('button', { name: 'Guardar' }))
    expect(screen.getByLabelText('Persona')).toHaveAccessibleDescription('Elegí una persona')
    expect(screen.getByLabelText('Categoría')).toHaveAccessibleDescription('Elegí la categoría')
    expect(screen.getByLabelText('Moneda')).toHaveAccessibleDescription('Elegí la moneda')
    expect(screen.getByLabelText('Monto')).toHaveAccessibleDescription(/Poné el monto/)
    expect(screen.getByLabelText(CUENTA)).not.toHaveAttribute('aria-invalid')
    expect(crear).not.toHaveBeenCalled()

    await completar(usuario, { categoria: 'Salario', persona: 'Ana', moneda: 'Pesos', monto: '1.500.000' })
    await usuario.click(guardar())

    const tarjeta = await screen.findByRole('link', { name: /^Salario/ })
    expect(tarjeta).toHaveTextContent('$ 1.500.000,00')
    expect(tarjeta).toHaveTextContent('Ana')
    expect(await repositorio.listar('ingreso')).toEqual([
      expect.objectContaining({
        tipo_ingreso_id: salario.id,
        persona_id: ana.id,
        cuenta_id: null,
        monto: 1500000,
        moneda: 'ARS',
        fecha: hoy(),
        descripcion: null,
      }),
    ])
  })

  it('con la cuenta donde se cobró, la lista la muestra', async () => {
    const { repositorio, cuenta } = await conEjemplo()
    const { usuario } = abrirApp('/ingresos/nuevo', repositorio)

    await completar(usuario, { categoria: 'Salario', persona: 'Ana', moneda: 'Dólares', monto: '3000', cuenta: cuenta.id })
    await usuario.click(guardar())

    const tarjeta = await screen.findByRole('link', { name: /^Salario/ })
    expect(tarjeta).toHaveTextContent('US$ 3.000,00')
    expect(tarjeta).toHaveTextContent('Cobrado en Banco Uno · Caja de ahorro')
    expect((await repositorio.listar('ingreso'))[0]).toMatchObject({ cuenta_id: cuenta.id, moneda: 'USD' })
  })

  it('un monto negativo queda marcado en su campo', async () => {
    const { repositorio } = await conEjemplo()
    const crear = vi.spyOn(repositorio, 'crear')
    const { usuario } = abrirApp('/ingresos/nuevo', repositorio)

    await completar(usuario, { categoria: 'Salario', persona: 'Ana', moneda: 'Pesos', monto: '-100' })
    await usuario.click(guardar())

    expect(screen.getByLabelText('Monto')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Monto')).toHaveAccessibleDescription(/Tiene que ser mayor que cero/)
    expect(crear).not.toHaveBeenCalled()
  })

  it('una fecha futura pide confirmar dentro de la pantalla', async () => {
    const { repositorio } = await conEjemplo()
    const crear = vi.spyOn(repositorio, 'crear')
    const { usuario } = abrirApp('/ingresos/nuevo', repositorio)

    await completar(usuario, { categoria: 'Salario', persona: 'Beto', moneda: 'Pesos', monto: '100', fecha: '2099-02-01' })
    await usuario.click(guardar())

    expect(screen.getByRole('alertdialog')).toHaveTextContent('La fecha 01/02/2099 es posterior a hoy.')
    expect(crear).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: 'Guardar igual' }))
    expect(await screen.findByRole('link', { name: /^Salario/ })).toHaveTextContent('01/02/2099')
  })

  it('se edita, el detalle dice quién lo cargó (C27), y se borra', async () => {
    const { repositorio, beto, cuenta, salario } = await conEjemplo()
    const ingreso = await repositorio.crear('ingreso', {
      tipo_ingreso_id: salario.id,
      persona_id: beto.id,
      cuenta_id: cuenta.id,
      fecha: '2026-04-30',
      monto: '2500.5',
      moneda: 'USD',
      descripcion: 'Bono',
    })
    const { usuario } = abrirApp(`/ingresos/${ingreso.id}`, repositorio)

    expect(await screen.findByText(/^Cargado por Ana el /)).toBeInTheDocument()
    expect(screen.getByLabelText('Monto')).toHaveValue('2.500,5')
    expect(screen.getByLabelText('Persona')).toHaveDisplayValue('Beto')
    expect(screen.getByLabelText('Descripción (opcional)')).toHaveValue('Bono')

    // Sin cuenta también se guarda.
    await completar(usuario, { cuenta: '' })
    await usuario.click(guardar())
    const tarjeta = await screen.findByRole('link', { name: /^Salario/ })
    expect(tarjeta).toHaveTextContent('US$ 2.500,50')
    expect(tarjeta).not.toHaveTextContent('Cobrado en')
    expect(window.location.search).toBe('?mes=2026-04')

    await usuario.click(tarjeta)
    await usuario.click(await screen.findByRole('button', { name: 'Borrar' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, borrar' }))
    expect(await screen.findByText('No hay ingresos en abril de 2026.')).toBeInTheDocument()
  })

  it('si el ingreso ya no existe, lo dice', async () => {
    abrirApp('/ingresos/no-existe')
    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró. Puede que alguien lo haya borrado')
  })
})
