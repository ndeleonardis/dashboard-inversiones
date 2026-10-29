import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { abrirApp, cargarEjemplo } from '../../../tests/interfaz/abrir-app.tsx'
import { crearRepositorioFalso } from '../../../tests/interfaz/repositorio-falso.ts'
import { hoy } from '../../dominio/fechas.ts'

async function conEjemplo() {
  const repositorio = crearRepositorioFalso()
  const ejemplo = await cargarEjemplo(repositorio)
  const comida = await repositorio.crear('tipo_gasto', { nombre: 'Comida' })
  await repositorio.crear('tipo_gasto', { nombre: 'Servicios' })
  const salario = await repositorio.crear('tipo_ingreso', { nombre: 'Salario' })
  return { repositorio, ...ejemplo, comida, salario }
}

const menu = () => within(screen.getByRole('navigation', { name: 'Secciones' }))
const seccion = (nombre: string) => screen.findByRole('region', { name: nombre })

describe('categorías (C20)', () => {
  it('muestra las categorías de gastos y las de ingresos, cada una en su lista', async () => {
    const { repositorio } = await conEjemplo()
    abrirApp('/categorias', repositorio)

    const deGastos = await seccion('De gastos')
    expect(within(deGastos).getAllByRole('link', { name: /^(Comida|Servicios)$/ }).map((l) => l.textContent)).toEqual([
      'Comida',
      'Servicios',
    ])
    const deIngresos = await seccion('De ingresos')
    expect(within(deIngresos).getByRole('link', { name: 'Salario' })).toBeInTheDocument()
  })

  it('una categoría nueva aparece al cargar un gasto', async () => {
    const { repositorio } = await conEjemplo()
    const { usuario } = abrirApp('/categorias', repositorio)

    await usuario.click(await screen.findByRole('link', { name: 'Nueva categoría de gastos' }))
    await usuario.type(await screen.findByLabelText('Nombre'), '  Mascotas ')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await within(await seccion('De gastos')).findByRole('link', { name: 'Mascotas' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('link', { name: 'Cargar gasto' }))
    const categoria = await screen.findByLabelText('Categoría')
    expect(within(categoria).getByRole('option', { name: 'Mascotas' })).toBeInTheDocument()
  })

  it('al renombrar una categoría, los gastos anteriores muestran el nombre nuevo', async () => {
    const { repositorio, comida } = await conEjemplo()
    await repositorio.crear('gasto', { tipo_gasto_id: comida.id, fecha: hoy(), monto: '100', moneda: 'ARS' })
    const { usuario } = abrirApp('/categorias', repositorio)

    await usuario.click(await screen.findByRole('link', { name: 'Comida' }))
    expect(await screen.findByText(/^Cargado por Ana el /)).toBeInTheDocument()
    const nombre = screen.getByLabelText('Nombre')
    await usuario.clear(nombre)
    await usuario.type(nombre, 'Alimentos')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await within(await seccion('De gastos')).findByRole('link', { name: 'Alimentos' })

    await usuario.click(menu().getByRole('link', { name: 'Gastos' }))
    expect(await screen.findByRole('link', { name: /^Alimentos/ })).toHaveTextContent('$ 100,00')
  })

  it('un nombre repetido se rechaza antes de enviar, sin importar mayúsculas ni espacios', async () => {
    const { repositorio } = await conEjemplo()
    const crear = vi.spyOn(repositorio, 'crear')
    const { usuario } = abrirApp('/categorias', repositorio)

    await usuario.click(await screen.findByRole('link', { name: 'Nueva categoría de ingresos' }))
    await usuario.type(await screen.findByLabelText('Nombre'), ' salario ')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByLabelText('Nombre')).toHaveAccessibleDescription('Ya hay una categoría con ese nombre')
    expect(crear).not.toHaveBeenCalled()
  })

  it('si otra persona ya la cargó, el error de la base queda en el campo', async () => {
    const { repositorio } = await conEjemplo()
    vi.spyOn(repositorio, 'crear').mockRejectedValueOnce({
      code: '23505',
      message: 'duplicate key value violates unique constraint "tipo_gasto_nombre_unico"',
    })
    const { usuario } = abrirApp('/categorias/gastos/nueva', repositorio)

    await usuario.type(await screen.findByLabelText('Nombre'), 'Mascotas')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ya hay una categoría con ese nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true')
  })

  it('si la categoría ya no existe, lo dice', async () => {
    abrirApp('/categorias/ingresos/no-existe')
    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró. Puede que alguien lo haya borrado')
  })
})
