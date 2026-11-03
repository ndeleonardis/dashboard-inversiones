// Pesaje T15. Editar o borrar un peso cargado. La tabla, la variación y el
// gráfico lo reflejan sin ningún paso extra (C54).
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrirApp, cargarEjemplo } from '../../../tests/interfaz/abrir-app.tsx'
import { crearRepositorioFalso } from '../../../tests/interfaz/repositorio-falso.ts'
import { hoy } from '../../dominio/fechas.ts'

async function conPesajes() {
  const repositorio = crearRepositorioFalso()
  await cargarEjemplo(repositorio)
  const mascota = await repositorio.crear('pesaje_integrante', { nombre: 'Mascota de ejemplo', objetivo: 'bajar' })
  for (const [fecha, peso] of [
    ['2026-10-04', '4.35'],
    ['2026-10-11', '4.4'],
    ['2026-10-18', '4.3'],
  ] as const) {
    await repositorio.guardarPesajes(fecha, [{ pesaje_integrante_id: mascota.id, peso, observaciones: null }])
  }
  const pesajes = await repositorio.listar('pesaje')
  const del = (fecha: string) => pesajes.find((p) => p.fecha === fecha)!.id
  return { repositorio, mascota, del }
}

const abrir = (ruta: string, repositorio: Awaited<ReturnType<typeof conPesajes>>['repositorio']) =>
  abrirApp(ruta, repositorio, { pesaje: true })

const variaciones = async () => {
  const tabla = await screen.findByRole('table', { name: 'Pesajes' })
  return within(tabla)
    .getAllByRole('row')
    .slice(1)
    .map((fila) => fila.querySelector('.variacion-peso')?.textContent)
}

describe('editar un peso (C54)', () => {
  it('trae lo cargado y dice de quién es', async () => {
    const { repositorio, del } = await conPesajes()
    abrir(`/pesaje/${del('2026-10-11')}`, repositorio)
    expect(await screen.findByRole('heading', { name: 'Pesaje de Mascota de ejemplo', level: 1 })).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-10-11')
    expect(screen.getByLabelText('Peso')).toHaveValue('4,4')
  })

  it('al cambiar un peso, cambia también la variación del siguiente', async () => {
    const { repositorio, del } = await conPesajes()
    const { usuario } = abrir(`/pesaje/${del('2026-10-11')}`, repositorio)
    const peso = await screen.findByLabelText('Peso')
    await usuario.clear(peso)
    await usuario.type(peso, '4,5')
    await usuario.type(screen.getByLabelText('Observaciones'), 'Corregido')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await variaciones()).toEqual(['↓-0,20 kg', '↑+0,15 kg', 'Primer pesaje'])
    expect(screen.getByText('Corregido')).toBeInTheDocument()
  })

  it('al borrarlo, sale de la tabla y el siguiente se compara con el anterior', async () => {
    const { repositorio, del } = await conPesajes()
    const { usuario } = abrir(`/pesaje/${del('2026-10-11')}`, repositorio)
    await usuario.click(await screen.findByRole('button', { name: 'Borrar' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    expect(await variaciones()).toEqual(['↓-0,05 kg', 'Primer pesaje'])
  })

  it('no se pasa a una fecha en la que ya tiene otro peso (C52)', async () => {
    const { repositorio, del } = await conPesajes()
    const { usuario } = abrir(`/pesaje/${del('2026-10-11')}`, repositorio)
    const fecha = await screen.findByLabelText('Fecha')
    await usuario.clear(fecha)
    await usuario.type(fecha, '2026-10-18')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Ya tiene un pesaje ese día')).toBeInTheDocument()
  })

  it('no se pasa a una fecha futura (C53)', async () => {
    const { repositorio, del } = await conPesajes()
    const { usuario } = abrir(`/pesaje/${del('2026-10-11')}`, repositorio)
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    const fecha = await screen.findByLabelText('Fecha')
    await usuario.clear(fecha)
    await usuario.type(fecha, hoy(manana))
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('La fecha no puede ser posterior a hoy')).toBeInTheDocument()
  })

  it('un peso inválido no se guarda (C51)', async () => {
    const { repositorio, del } = await conPesajes()
    const { usuario } = abrir(`/pesaje/${del('2026-10-11')}`, repositorio)
    const peso = await screen.findByLabelText('Peso')
    await usuario.clear(peso)
    await usuario.type(peso, '0')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Tiene que ser mayor que cero')).toBeInTheDocument()
  })

  it('muestra quién lo cargó y cuándo (C59)', async () => {
    const { repositorio, del } = await conPesajes()
    abrir(`/pesaje/${del('2026-10-11')}`, repositorio)
    expect(await screen.findByText(/^Cargado por Ana el /)).toBeInTheDocument()
  })

  it('un pesaje que ya no existe lo dice', async () => {
    const { repositorio } = await conPesajes()
    abrir('/pesaje/0b6c1f4e-7a52-4c3e-9d1a-2f8e5b7c9a10', repositorio)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró')
  })
})
