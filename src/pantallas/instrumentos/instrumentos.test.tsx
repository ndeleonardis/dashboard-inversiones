import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { abrirApp, cargarEjemplo, TIPOS_DE_INSTRUMENTO } from '../../../tests/interfaz/abrir-app.tsx'
import { crearRepositorioFalso } from '../../../tests/interfaz/repositorio-falso.ts'

async function conEjemplo() {
  const repositorio = crearRepositorioFalso({ tipo_instrumento: TIPOS_DE_INSTRUMENTO })
  await cargarEjemplo(repositorio)
  const cedear = await repositorio.crear('instrumento', { tipo: 'CEDEAR', ticker: 'AAPL', nombre: 'Apple', moneda: 'ARS' })
  const on = await repositorio.crear('instrumento', {
    tipo: 'ON',
    ticker: 'ONX1D',
    nombre: 'ON Ejemplo',
    moneda: 'USD',
    vencimiento: '2028-03-01',
  })
  return { repositorio, cedear, on }
}

const menu = () => within(screen.getByRole('navigation', { name: 'Secciones' }))

describe('instrumentos', () => {
  it('la lista muestra ticker, nombre, tipo y moneda, y el vencimiento de las ON', async () => {
    const { repositorio } = await conEjemplo()
    abrirApp('/instrumentos', repositorio)
    const cedear = await screen.findByRole('link', { name: /AAPL/ })
    expect(within(cedear).getByText('Apple')).toBeInTheDocument()
    expect(within(cedear).getByText('CEDEAR · Pesos')).toBeInTheDocument()
    const on = screen.getByRole('link', { name: /ONX1D/ })
    expect(within(on).getByText('ON · Dólares')).toBeInTheDocument()
    expect(within(on).getByText('Vence el 01/03/2028')).toBeInTheDocument()
  })

  it('se cargan tipo, ticker en mayúsculas, nombre y moneda (C8)', async () => {
    const { repositorio } = await conEjemplo()
    const { usuario } = abrirApp('/instrumentos/nuevo', repositorio)

    await usuario.selectOptions(await screen.findByLabelText('Tipo'), 'CEDEAR')
    await usuario.type(screen.getByLabelText('Ticker'), 'aapld')
    expect(screen.getByLabelText('Ticker')).toHaveValue('AAPLD')
    await usuario.type(screen.getByLabelText('Nombre'), 'Apple')
    await usuario.selectOptions(screen.getByLabelText('Moneda'), 'Dólares')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('link', { name: /AAPLD/ })).toHaveTextContent('CEDEAR · Dólares')
    expect((await repositorio.listar('instrumento')).find((i) => i.ticker === 'AAPLD')).toMatchObject({
      tipo: 'CEDEAR',
      nombre: 'Apple',
      moneda: 'USD',
      vencimiento: null,
    })
  })

  it('pide tipo, ticker, nombre y moneda antes de enviar', async () => {
    const { repositorio } = await conEjemplo()
    const crear = vi.spyOn(repositorio, 'crear')
    const { usuario } = abrirApp('/instrumentos/nuevo', repositorio)

    await usuario.click(await screen.findByRole('button', { name: 'Guardar' }))

    expect(screen.getByLabelText('Tipo')).toHaveAccessibleDescription('Elegí el tipo')
    expect(screen.getByLabelText('Ticker')).toHaveAccessibleDescription(/Poné el ticker/)
    expect(screen.getByLabelText('Nombre')).toHaveAccessibleDescription('Poné un nombre')
    expect(screen.getByLabelText('Moneda')).toHaveAccessibleDescription('Elegí la moneda')
    expect(crear).not.toHaveBeenCalled()
  })

  it('el mismo ticker en la misma moneda se rechaza en el campo del ticker (C8)', async () => {
    const { repositorio } = await conEjemplo()
    vi.spyOn(repositorio, 'crear').mockRejectedValueOnce({
      code: '23505',
      message: 'duplicate key value violates unique constraint "instrumento_ticker_moneda_unico"',
    })
    const { usuario } = abrirApp('/instrumentos/nuevo', repositorio)

    await usuario.selectOptions(await screen.findByLabelText('Tipo'), 'CEDEAR')
    await usuario.type(screen.getByLabelText('Ticker'), 'AAPL')
    await usuario.type(screen.getByLabelText('Nombre'), 'Apple')
    await usuario.selectOptions(screen.getByLabelText('Moneda'), 'Pesos')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ya existe ese ticker en esa moneda')).toBeInTheDocument()
    expect(screen.getByLabelText('Ticker')).toHaveAttribute('aria-invalid', 'true')
  })

  it('al elegir ON aparece el vencimiento, y sin él el formulario no se envía (C9)', async () => {
    const { repositorio } = await conEjemplo()
    const crear = vi.spyOn(repositorio, 'crear')
    const { usuario } = abrirApp('/instrumentos/nuevo', repositorio)

    expect(await screen.findByLabelText('Tipo')).toBeInTheDocument()
    expect(screen.queryByLabelText('Vencimiento')).not.toBeInTheDocument()

    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'ON')
    await usuario.type(screen.getByLabelText('Ticker'), 'onx2d')
    await usuario.type(screen.getByLabelText('Nombre'), 'Otra ON')
    await usuario.selectOptions(screen.getByLabelText('Moneda'), 'Dólares')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByLabelText('Vencimiento')).toHaveAccessibleDescription('Una ON necesita fecha de vencimiento')
    expect(crear).not.toHaveBeenCalled()

    await usuario.type(screen.getByLabelText('Vencimiento'), '2029-06-15')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('link', { name: /ONX2D/ })).toHaveTextContent('Vence el 15/06/2029')
  })

  it('si deja de ser ON, el vencimiento no se guarda', async () => {
    const { repositorio } = await conEjemplo()
    const { usuario } = abrirApp('/instrumentos/nuevo', repositorio)

    await usuario.selectOptions(await screen.findByLabelText('Tipo'), 'ON')
    await usuario.type(screen.getByLabelText('Vencimiento'), '2029-06-15')
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'ACCION')
    expect(screen.queryByLabelText('Vencimiento')).not.toBeInTheDocument()
    await usuario.type(screen.getByLabelText('Ticker'), 'DEMO2')
    await usuario.type(screen.getByLabelText('Nombre'), 'Demo')
    await usuario.selectOptions(screen.getByLabelText('Moneda'), 'Pesos')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await screen.findByRole('link', { name: /DEMO2/ })
    expect((await repositorio.listar('instrumento')).find((i) => i.ticker === 'DEMO2')).toMatchObject({ vencimiento: null })
  })

  it('se edita, el detalle dice quién lo cargó (C27), y en uso no se borra (C7)', async () => {
    const { repositorio, on } = await conEjemplo()
    vi.spyOn(repositorio, 'borrar').mockRejectedValueOnce({
      code: '23503',
      message: 'update or delete on table "instrumento" violates foreign key constraint "operacion_instrumento_fk" on table "operacion"',
    })
    const { usuario } = abrirApp(`/instrumentos/${on.id}`, repositorio)

    expect(await screen.findByText(/^Cargado por Ana el /)).toBeInTheDocument()
    expect(screen.getByLabelText('Vencimiento')).toHaveValue('2028-03-01')

    await usuario.click(screen.getByRole('button', { name: 'Borrar' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, borrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede borrar: este instrumento tiene operaciones cargadas')

    const nombre = screen.getByLabelText('Nombre')
    await usuario.clear(nombre)
    await usuario.type(nombre, 'ON Ejemplo 2028')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('link', { name: /ON Ejemplo 2028/ })).toBeInTheDocument()

    await usuario.click(menu().getByRole('link', { name: 'Instrumentos' }))
    expect(await screen.findByRole('link', { name: /ONX1D/ })).toBeInTheDocument()
  })
})
