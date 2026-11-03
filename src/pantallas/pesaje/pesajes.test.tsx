// Pesaje T14. La tabla de pesajes, lo más reciente primero, con la variación
// contra el pesaje anterior de cada uno, el filtro por quién se pesó y su gráfico.
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrirApp, cargarEjemplo } from '../../../tests/interfaz/abrir-app.tsx'
import { crearRepositorioFalso } from '../../../tests/interfaz/repositorio-falso.ts'

async function conPesajes() {
  const repositorio = crearRepositorioFalso()
  await cargarEjemplo(repositorio)
  const mascota = await repositorio.crear('pesaje_integrante', { nombre: 'Mascota de ejemplo', objetivo: 'bajar' })
  const caro = await repositorio.crear('pesaje_integrante', { nombre: 'Caro Ejemplo', objetivo: 'subir' })
  const anterior = await repositorio.crear('pesaje_integrante', { nombre: 'Mascota anterior' })
  const pesar = (fecha: string, ...pesos: [string, string, string?][]) =>
    repositorio.guardarPesajes(
      fecha,
      pesos.map(([id, peso, observaciones]) => ({ pesaje_integrante_id: id, peso, observaciones: observaciones ?? null })),
    )
  await pesar('2026-10-04', [mascota.id, '4.35'], [caro.id, '30.1'], [anterior.id, '6'])
  await pesar('2026-10-11', [mascota.id, '4.4', 'Comió antes'], [caro.id, '30.25'])
  await pesar('2026-10-18', [mascota.id, '4.3'])
  await repositorio.editar('pesaje_integrante', anterior.id, { activo: false })
  return { repositorio, mascota, caro, anterior }
}

const abrir = (ruta: string, repositorio: Awaited<ReturnType<typeof conPesajes>>['repositorio']) =>
  abrirApp(ruta, repositorio, { pesaje: true })

const tabla = () => screen.findByRole('table', { name: 'Pesajes' })
const filas = async () => within(await tabla()).getAllByRole('row').slice(1)
const celdas = (fila: HTMLElement) => within(fila).getAllByRole('cell').map((c) => c.textContent)

describe('la tabla de pesajes', () => {
  it('muestra fecha, quién con sus observaciones y peso con su variación, lo más reciente primero (C55, C56)', async () => {
    const { repositorio } = await conPesajes()
    abrir('/pesaje', repositorio)
    expect(within(await tabla()).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Fecha', 'Quién', 'Peso'])
    expect((await filas()).map(celdas)).toEqual([
      ['18/10/2026', 'Mascota de ejemplo', '4,30 kg↓-0,10 kg'],
      ['11/10/2026', 'Caro Ejemplo', '30,25 kg↑+0,15 kg'],
      ['11/10/2026', 'Mascota de ejemploComió antes', '4,40 kg↑+0,05 kg'],
      ['04/10/2026', 'Caro Ejemplo', '30,10 kgPrimer pesaje'],
      ['04/10/2026', 'Mascota anterior', '6,00 kgPrimer pesaje'],
      ['04/10/2026', 'Mascota de ejemplo', '4,35 kgPrimer pesaje'],
    ])
  })

  it('la variación va en verde o en rojo según el objetivo de cada uno (C62)', async () => {
    const { repositorio } = await conPesajes()
    abrir('/pesaje', repositorio)
    const [bajaQuienQuiereBajar, subeQuienQuiereSubir, subeQuienQuiereBajar] = await filas()
    expect(bajaQuienQuiereBajar!.querySelector('.variacion-peso')).toHaveClass('variacion-buena')
    expect(subeQuienQuiereSubir!.querySelector('.variacion-peso')).toHaveClass('variacion-buena')
    expect(subeQuienQuiereBajar!.querySelector('.variacion-peso')).toHaveClass('variacion-mala')
  })

  it('cada pesaje lleva a editarlo', async () => {
    const { repositorio } = await conPesajes()
    abrir('/pesaje', repositorio)
    const [primera] = await filas()
    const [ultimo] = (await repositorio.listar('pesaje')).filter((p) => p.fecha === '2026-10-18')
    expect(within(primera!).getByRole('link', { name: 'Mascota de ejemplo' })).toHaveAttribute('href', `/pesaje/${ultimo!.id}`)
  })

  it('sin pesajes lo dice y lleva a cargar el primero', async () => {
    const repositorio = crearRepositorioFalso()
    abrir('/pesaje', repositorio)
    expect(await screen.findByText('Todavía no hay pesajes cargados.')).toBeInTheDocument()
  })
})

describe('el filtro por quién se pesó (C57)', () => {
  it('muestra solo sus pesajes, con la misma variación, y queda en la dirección', async () => {
    const { repositorio, mascota } = await conPesajes()
    const { usuario } = abrir('/pesaje', repositorio)
    await usuario.selectOptions(await screen.findByLabelText('Quién'), 'Mascota de ejemplo')

    expect((await filas()).map(celdas)).toEqual([
      ['18/10/2026', 'Mascota de ejemplo', '4,30 kg↓-0,10 kg'],
      ['11/10/2026', 'Mascota de ejemploComió antes', '4,40 kg↑+0,05 kg'],
      ['04/10/2026', 'Mascota de ejemplo', '4,35 kgPrimer pesaje'],
    ])
    expect(window.location.search).toBe(`?quien=${mascota.id}`)
  })

  it('también ofrece a quien está desactivado, y sus pesajes se ven (C48)', async () => {
    const { repositorio, anterior } = await conPesajes()
    abrir(`/pesaje?quien=${anterior.id}`, repositorio)
    expect(within(await screen.findByLabelText('Quién')).getByRole('option', { name: 'Mascota anterior (desactivado)' })).toBeInTheDocument()
    expect((await filas()).map(celdas)).toEqual([['04/10/2026', 'Mascota anterior', '6,00 kgPrimer pesaje']])
  })

  it('al sacar el filtro vuelven todos', async () => {
    const { repositorio, mascota } = await conPesajes()
    const { usuario } = abrir(`/pesaje?quien=${mascota.id}`, repositorio)
    await usuario.selectOptions(await screen.findByLabelText('Quién'), 'Todos')
    expect(await filas()).toHaveLength(6)
  })
})

describe('el gráfico (C58)', () => {
  it('aparece al filtrar por alguien, con sus pesajes y su objetivo', async () => {
    const { repositorio, mascota } = await conPesajes()
    abrir(`/pesaje?quien=${mascota.id}`, repositorio)
    const grafico = await screen.findByRole('img', { name: /^Peso de Mascota de ejemplo/ })
    expect(grafico.querySelectorAll('circle.grafico-punto')).toHaveLength(3)
    expect(screen.getByText('Objetivo: bajar')).toBeInTheDocument()
  })

  it('sin filtro no hay gráfico', async () => {
    const { repositorio } = await conPesajes()
    abrir('/pesaje', repositorio)
    await tabla()
    expect(screen.queryByRole('img', { name: /^Peso de/ })).toBeNull()
  })
})

describe('los datos de quien se pesó están al día', () => {
  it('después de renombrar a alguien, sus pesajes muestran el nombre nuevo (C47)', async () => {
    const { repositorio, caro } = await conPesajes()
    await repositorio.editar('pesaje_integrante', caro.id, { nombre: 'Carolina Ejemplo' })
    abrir('/pesaje', repositorio)
    expect((await filas()).map(celdas).filter(([, quien]) => quien === 'Carolina Ejemplo')).toHaveLength(2)
  })
})
