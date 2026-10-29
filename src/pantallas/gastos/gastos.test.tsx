import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { abrirApp, cargarEjemplo } from '../../../tests/interfaz/abrir-app.tsx'
import { crearRepositorioFalso } from '../../../tests/interfaz/repositorio-falso.ts'
import { hoy, mesActual, mesAnterior } from '../../dominio/fechas.ts'
import { formatearMes } from '../../dominio/formato.ts'

async function conEjemplo() {
  const repositorio = crearRepositorioFalso()
  const ejemplo = await cargarEjemplo(repositorio)
  const comida = await repositorio.crear('tipo_gasto', { nombre: 'Comida' })
  const servicios = await repositorio.crear('tipo_gasto', { nombre: 'Servicios' })
  return { repositorio, ...ejemplo, comida, servicios }
}

type Usuario = ReturnType<typeof abrirApp>['usuario']
type Carga = { categoria?: string; moneda?: string; monto?: string; fecha?: string; persona?: string; descripcion?: string }

async function completar(usuario: Usuario, carga: Carga) {
  const escribir = async (etiqueta: string, texto: string) => {
    const campo = screen.getByLabelText(etiqueta)
    await usuario.clear(campo)
    await usuario.type(campo, texto)
  }
  if (carga.categoria) await usuario.selectOptions(await screen.findByLabelText('Categoría'), carga.categoria)
  if (carga.moneda) await usuario.selectOptions(screen.getByLabelText('Moneda'), carga.moneda)
  if (carga.monto) await escribir('Monto', carga.monto)
  if (carga.fecha) await escribir('Fecha', carga.fecha)
  if (carga.persona) await usuario.selectOptions(screen.getByLabelText('Persona (opcional)'), carga.persona)
  if (carga.descripcion) await escribir('Descripción (opcional)', carga.descripcion)
}

const guardar = () => screen.getByRole('button', { name: 'Guardar' })
const tarjetas = () => screen.getAllByRole('link', { name: /^(Comida|Servicios)/ })

describe('gastos', () => {
  it('un gasto se guarda sin elegir persona, como comunitario (C16)', async () => {
    const { repositorio, comida } = await conEjemplo()
    const { usuario } = abrirApp('/gastos/nuevo', repositorio)

    expect(await screen.findByLabelText('Persona (opcional)')).toHaveDisplayValue('Comunitario')
    await completar(usuario, { categoria: 'Comida', moneda: 'Pesos', monto: '1.234,56' })
    await usuario.click(guardar())

    const tarjeta = await screen.findByRole('link', { name: /^Comida/ })
    expect(tarjeta).toHaveTextContent('$ 1.234,56')
    expect(tarjeta).toHaveTextContent('Comunitario')
    expect(await repositorio.listar('gasto')).toEqual([
      expect.objectContaining({
        tipo_gasto_id: comida.id,
        persona_id: null,
        monto: 1234.56,
        moneda: 'ARS',
        fecha: hoy(),
        descripcion: null,
      }),
    ])
  })

  it('con persona y descripción, la lista dice de quién es', async () => {
    const { repositorio, beto } = await conEjemplo()
    const { usuario } = abrirApp('/gastos/nuevo', repositorio)

    await completar(usuario, {
      categoria: 'Servicios',
      moneda: 'Dólares',
      monto: '120',
      persona: 'Beto',
      descripcion: '  Suscripción ',
    })
    await usuario.click(guardar())

    const tarjeta = await screen.findByRole('link', { name: /^Servicios/ })
    expect(tarjeta).toHaveTextContent('US$ 120,00')
    expect(tarjeta).toHaveTextContent('Beto')
    expect(tarjeta).toHaveTextContent('Suscripción')
    expect((await repositorio.listar('gasto'))[0]).toMatchObject({ persona_id: beto.id, moneda: 'USD', descripcion: 'Suscripción' })
  })

  it('pide categoría, moneda, monto y fecha, y un monto en cero o negativo queda marcado', async () => {
    const { repositorio } = await conEjemplo()
    const crear = vi.spyOn(repositorio, 'crear')
    const { usuario } = abrirApp('/gastos/nuevo', repositorio)

    await usuario.clear(await screen.findByLabelText('Fecha'))
    await usuario.click(guardar())

    expect(screen.getByLabelText('Categoría')).toHaveAccessibleDescription('Elegí la categoría')
    expect(screen.getByLabelText('Moneda')).toHaveAccessibleDescription('Elegí la moneda')
    expect(screen.getByLabelText('Monto')).toHaveAccessibleDescription(/Poné el monto/)
    expect(screen.getByLabelText('Fecha')).toHaveAccessibleDescription('Poné la fecha')
    expect(screen.getByLabelText('Persona (opcional)')).not.toHaveAttribute('aria-invalid')

    for (const monto of ['0', '-5']) {
      await completar(usuario, { monto })
      await usuario.click(guardar())
      expect(screen.getByLabelText('Monto')).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByLabelText('Monto')).toHaveAccessibleDescription(/Tiene que ser mayor que cero/)
    }
    expect(crear).not.toHaveBeenCalled()
  })

  it('una fecha futura pide confirmar dentro de la pantalla', async () => {
    const { repositorio } = await conEjemplo()
    const crear = vi.spyOn(repositorio, 'crear')
    const { usuario } = abrirApp('/gastos/nuevo', repositorio)

    await completar(usuario, { categoria: 'Comida', moneda: 'Pesos', monto: '500', fecha: '2099-01-15' })
    await usuario.click(guardar())
    expect(screen.getByRole('alertdialog')).toHaveTextContent('La fecha 15/01/2099 es posterior a hoy.')

    await usuario.click(screen.getByRole('button', { name: 'Revisar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(crear).not.toHaveBeenCalled()

    await usuario.click(guardar())
    await usuario.click(screen.getByRole('button', { name: 'Guardar igual' }))
    // Vuelve a la lista del mes del gasto.
    expect(await screen.findByRole('link', { name: /^Comida/ })).toHaveTextContent('15/01/2099')
    expect(screen.getByText(/^enero de 2099$/i)).toBeInTheDocument()
  })

  it('la lista muestra los gastos de un mes, del más nuevo al más viejo, y se puede cambiar de mes', async () => {
    const { repositorio, comida, servicios } = await conEjemplo()
    const este = mesActual()
    const anterior = mesAnterior(este)
    const datos = { moneda: 'ARS', monto: '100' } as const
    await repositorio.crear('gasto', { ...datos, tipo_gasto_id: comida.id, fecha: este })
    await repositorio.crear('gasto', { ...datos, tipo_gasto_id: servicios.id, fecha: `${este.slice(0, 8)}02` })
    await repositorio.crear('gasto', { ...datos, tipo_gasto_id: comida.id, fecha: anterior, descripcion: 'Del mes pasado' })
    const { usuario } = abrirApp('/gastos', repositorio)

    expect(await screen.findByText(new RegExp(`^${formatearMes(este)}$`, 'i'))).toBeInTheDocument()
    await screen.findByRole('link', { name: /^Servicios/ })
    expect(tarjetas().map((tarjeta) => tarjeta.textContent)).toEqual([
      expect.stringMatching(/^Servicios/),
      expect.stringMatching(/^Comida/),
    ])
    expect(screen.queryByText('Del mes pasado')).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(await screen.findByText('Del mes pasado')).toBeInTheDocument()
    expect(tarjetas()).toHaveLength(1)
    expect(window.location.search).toBe(`?mes=${anterior.slice(0, 7)}`)

    await usuario.click(screen.getByRole('button', { name: 'Ir al mes actual' }))
    expect(await screen.findByRole('link', { name: /^Servicios/ })).toBeInTheDocument()
  })

  it('un mes sin gastos lo dice', async () => {
    const { repositorio } = await conEjemplo()
    abrirApp('/gastos?mes=2020-01', repositorio)
    expect(await screen.findByText('No hay gastos en enero de 2020.')).toBeInTheDocument()
  })

  it('se edita, el detalle dice quién lo cargó (C27), y se borra', async () => {
    const { repositorio, comida } = await conEjemplo()
    const gasto = await repositorio.crear('gasto', { tipo_gasto_id: comida.id, fecha: '2026-03-10', monto: '1234.5', moneda: 'ARS' })
    const { usuario } = abrirApp(`/gastos/${gasto.id}`, repositorio)

    expect(await screen.findByText(/^Cargado por Ana el /)).toBeInTheDocument()
    expect(screen.getByLabelText('Monto')).toHaveValue('1.234,5')
    expect(screen.getByLabelText('Persona (opcional)')).toHaveDisplayValue('Comunitario')

    await completar(usuario, { monto: '2.000' })
    await usuario.click(guardar())
    expect(await screen.findByRole('link', { name: /^Comida/ })).toHaveTextContent('$ 2.000,00')
    expect(window.location.search).toBe('?mes=2026-03')

    await usuario.click(screen.getByRole('link', { name: /^Comida/ }))
    await usuario.click(await screen.findByRole('button', { name: 'Borrar' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, borrar' }))
    expect(await screen.findByText('No hay gastos en marzo de 2026.')).toBeInTheDocument()
    expect(await repositorio.listar('gasto')).toEqual([])
  })

  it('si el gasto ya no existe, lo dice', async () => {
    abrirApp('/gastos/no-existe')
    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró. Puede que alguien lo haya borrado')
  })
})
