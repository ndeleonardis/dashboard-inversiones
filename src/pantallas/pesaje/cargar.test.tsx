// Pesaje T13. La carga de todos juntos: una fecha y un renglón por cada
// integrante activo. Los renglones vacíos no se guardan.
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrirApp, cargarEjemplo } from '../../../tests/interfaz/abrir-app.tsx'
import { crearRepositorioFalso } from '../../../tests/interfaz/repositorio-falso.ts'
import { hoy } from '../../dominio/fechas.ts'

async function conLista() {
  const repositorio = crearRepositorioFalso()
  await cargarEjemplo(repositorio)
  const mascota = await repositorio.crear('pesaje_integrante', { nombre: 'Mascota de ejemplo', objetivo: 'bajar' })
  const caro = await repositorio.crear('pesaje_integrante', { nombre: 'Caro Ejemplo' })
  const anterior = await repositorio.crear('pesaje_integrante', { nombre: 'Mascota anterior' })
  await repositorio.editar('pesaje_integrante', anterior.id, { activo: false })
  return { repositorio, mascota, caro, anterior }
}

const abrir = (repositorio: Awaited<ReturnType<typeof conLista>>['repositorio']) =>
  abrirApp('/pesaje/cargar', repositorio, { pesaje: true })

const manana = () => {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + 1)
  return hoy(fecha)
}

const pesajesGuardados = async (repositorio: Awaited<ReturnType<typeof conLista>>['repositorio']) =>
  (await repositorio.listar('pesaje_con_variacion')).map(({ nombre, fecha, peso, observaciones }) => ({
    nombre,
    fecha,
    peso,
    observaciones,
  }))

describe('cargar un pesaje', () => {
  it('se llega desde Pesaje', async () => {
    const { repositorio } = await conLista()
    const { usuario } = abrirApp('/pesaje', repositorio, { pesaje: true })
    await usuario.click(await screen.findByRole('link', { name: 'Cargar pesaje' }))
    expect(await screen.findByRole('heading', { name: 'Cargar pesaje', level: 1 })).toBeInTheDocument()
  })

  it('la fecha viene en hoy y hay un renglón por integrante activo (C45, C48, C50)', async () => {
    const { repositorio } = await conLista()
    abrir(repositorio)
    expect(await screen.findByLabelText('Fecha')).toHaveValue(hoy())
    const renglones = screen.getAllByRole('group')
    expect(renglones.map((r) => within(r).getByRole('heading').textContent)).toEqual(['Caro Ejemplo', 'Mascota de ejemplo'])
    expect(screen.queryByText('Mascota anterior')).toBeNull()
  })

  it('guarda a los que tienen peso, cada uno con sus observaciones, y no a los vacíos (C50)', async () => {
    const { repositorio } = await conLista()
    const { usuario } = abrir(repositorio)
    await usuario.type(await screen.findByLabelText('Peso de Mascota de ejemplo'), '4.35')
    await usuario.type(screen.getByLabelText('Observaciones de Mascota de ejemplo'), 'Comió antes')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await screen.findByRole('heading', { name: 'Pesaje', level: 1 })
    expect(await pesajesGuardados(repositorio)).toEqual([
      { nombre: 'Mascota de ejemplo', fecha: hoy(), peso: 4.35, observaciones: 'Comió antes' },
    ])
  })

  it('sin ningún peso no guarda nada y lo dice (C50)', async () => {
    const { repositorio } = await conLista()
    const { usuario } = abrir(repositorio)
    await usuario.click(await screen.findByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Cargá al menos un peso')
    expect(await repositorio.listar('pesaje')).toEqual([])
  })

  it('observaciones sin peso no se pierden en silencio: pide el peso', async () => {
    const { repositorio } = await conLista()
    const { usuario } = abrir(repositorio)
    await usuario.type(await screen.findByLabelText('Observaciones de Caro Ejemplo'), 'No quiso subir')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Poné el peso, o borrá las observaciones')).toBeInTheDocument()
    expect(await repositorio.listar('pesaje')).toEqual([])
  })

  it('un peso fuera de rango marca su renglón y no guarda ninguno (C51)', async () => {
    const { repositorio } = await conLista()
    const { usuario } = abrir(repositorio)
    await usuario.type(await screen.findByLabelText('Peso de Caro Ejemplo'), '30,5')
    await usuario.type(screen.getByLabelText('Peso de Mascota de ejemplo'), '4350')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('No puede pasar de 300 kg')).toBeInTheDocument()
    expect(screen.getByLabelText('Peso de Mascota de ejemplo')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Peso de Caro Ejemplo')).not.toHaveAttribute('aria-invalid')
    expect(await repositorio.listar('pesaje')).toEqual([])
  })

  it('si alguien ya tiene peso esa fecha, marca su renglón y ofrece editar el existente (C52)', async () => {
    const { repositorio, mascota } = await conLista()
    await repositorio.guardarPesajes(hoy(), [{ pesaje_integrante_id: mascota.id, peso: '4.3', observaciones: null }])
    const [existente] = await repositorio.listar('pesaje')
    const { usuario } = abrir(repositorio)
    await usuario.type(await screen.findByLabelText('Peso de Mascota de ejemplo'), '4,35')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ya tiene un pesaje ese día')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar el pesaje de ese día' })).toHaveAttribute(
      'href',
      `/pesaje/${existente!.id}`,
    )
    expect(await repositorio.listar('pesaje')).toHaveLength(1)
  })

  it('una fecha futura no se guarda (C53)', async () => {
    const { repositorio } = await conLista()
    const { usuario } = abrir(repositorio)
    const fecha = await screen.findByLabelText('Fecha')
    await usuario.clear(fecha)
    await usuario.type(fecha, manana())
    await usuario.type(screen.getByLabelText('Peso de Caro Ejemplo'), '30,5')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('La fecha no puede ser posterior a hoy')).toBeInTheDocument()
    expect(await repositorio.listar('pesaje')).toEqual([])
  })
})
