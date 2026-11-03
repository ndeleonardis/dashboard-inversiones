// Pesaje T12. La lista de quiénes se pesan: aparte de las personas del grupo,
// con su objetivo, y se desactiva en lugar de borrarse si tiene pesajes.
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { abrirApp, cargarEjemplo } from '../../../tests/interfaz/abrir-app.tsx'
import { crearRepositorioFalso } from '../../../tests/interfaz/repositorio-falso.ts'

async function conLista() {
  const repositorio = crearRepositorioFalso()
  await cargarEjemplo(repositorio)
  const mascota = await repositorio.crear('pesaje_integrante', { nombre: 'Mascota de ejemplo', objetivo: 'bajar' })
  const caro = await repositorio.crear('pesaje_integrante', { nombre: 'Caro Ejemplo' })
  return { repositorio, mascota, caro }
}

const abrir = (ruta: string, repositorio: Awaited<ReturnType<typeof conLista>>['repositorio']) =>
  abrirApp(ruta, repositorio, { pesaje: true })

const lista = () => screen.findByRole('list', { name: 'Quiénes se pesan' })

describe('quiénes se pesan', () => {
  it('se llega desde Pesaje y muestra a cada uno con su objetivo', async () => {
    const { repositorio } = await conLista()
    const { usuario } = abrir('/pesaje', repositorio)
    await usuario.click(await screen.findByRole('link', { name: 'Quiénes se pesan' }))
    const items = within(await lista()).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual(['Caro EjemploSin objetivo', 'Mascota de ejemploObjetivo: bajar'])
  })

  it('alguien nuevo arranca sin objetivo y no aparece en Personas (C45, C61)', async () => {
    const { repositorio } = await conLista()
    const { usuario } = abrir('/pesaje/integrantes', repositorio)
    await usuario.click(await screen.findByRole('link', { name: 'Agregar a la lista' }))
    expect(screen.getByLabelText('Objetivo')).toHaveValue('ninguno')
    await usuario.type(screen.getByLabelText('Nombre'), '  Beto Ejemplo ')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await within(await lista()).findByText('Beto Ejemplo')).toBeInTheDocument()
    expect(await repositorio.listar('pesaje_integrante')).toContainEqual(
      expect.objectContaining({ nombre: 'Beto Ejemplo', objetivo: 'ninguno', activo: true }),
    )
    await usuario.click(within(screen.getByRole('navigation', { name: 'Secciones' })).getByRole('link', { name: 'Personas' }))
    await screen.findByRole('heading', { name: 'Personas', level: 1 })
    expect(screen.queryByText('Beto Ejemplo')).toBeNull()
  })

  it('un nombre repetido avisa antes de guardar, sin importar mayúsculas ni espacios (C46)', async () => {
    const { repositorio } = await conLista()
    const { usuario } = abrir('/pesaje/integrantes/nuevo', repositorio)
    await usuario.type(await screen.findByLabelText('Nombre'), ' mascota de EJEMPLO')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Ya hay alguien con ese nombre en la lista')).toBeInTheDocument()
    expect(await repositorio.listar('pesaje_integrante')).toHaveLength(2)
  })

  it('se le cambia el nombre y el objetivo (C47, C61)', async () => {
    const { repositorio, caro } = await conLista()
    const { usuario } = abrir(`/pesaje/integrantes/${caro.id}`, repositorio)
    const nombre = await screen.findByLabelText('Nombre')
    await usuario.clear(nombre)
    await usuario.type(nombre, 'Carolina Ejemplo')
    await usuario.selectOptions(screen.getByLabelText('Objetivo'), 'Subir')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await within(await lista()).findByText('Carolina Ejemplo')).toBeInTheDocument()
    expect(await repositorio.obtener('pesaje_integrante', caro.id)).toMatchObject({
      nombre: 'Carolina Ejemplo',
      objetivo: 'subir',
    })
  })

  it('se desactiva y se vuelve a activar (C48)', async () => {
    const { repositorio, mascota } = await conLista()
    const { usuario } = abrir(`/pesaje/integrantes/${mascota.id}`, repositorio)
    await usuario.selectOptions(await screen.findByLabelText('En la carga'), 'No aparece')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await within(await lista()).findByText('Desactivado')).toBeInTheDocument()
    expect(await repositorio.obtener('pesaje_integrante', mascota.id)).toMatchObject({ activo: false })

    await usuario.click(screen.getByRole('link', { name: /Mascota de ejemplo/ }))
    await usuario.selectOptions(await screen.findByLabelText('En la carga'), 'Aparece')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await lista()
    expect(await repositorio.obtener('pesaje_integrante', mascota.id)).toMatchObject({ activo: true })
  })

  it('no se borra a alguien con pesajes: lo dice y sugiere desactivarlo (C49)', async () => {
    const { repositorio, mascota } = await conLista()
    await repositorio.guardarPesajes('2026-11-01', [{ pesaje_integrante_id: mascota.id, peso: '4.35', observaciones: null }])
    const { usuario } = abrir(`/pesaje/integrantes/${mascota.id}`, repositorio)
    await usuario.click(await screen.findByRole('button', { name: 'Borrar' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, borrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se puede borrar: tiene pesajes cargados. Desactivalo para que no aparezca en la carga',
    )
    expect(await repositorio.listar('pesaje_integrante')).toHaveLength(2)
  })

  it('sin pesajes sí se borra', async () => {
    const { repositorio, caro } = await conLista()
    const { usuario } = abrir(`/pesaje/integrantes/${caro.id}`, repositorio)
    await usuario.click(await screen.findByRole('button', { name: 'Borrar' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, borrar' }))
    await lista()
    expect(screen.queryByText('Caro Ejemplo')).toBeNull()
  })

  it('muestra quién lo agregó (C59)', async () => {
    const { repositorio, caro } = await conLista()
    abrir(`/pesaje/integrantes/${caro.id}`, repositorio)
    expect(await screen.findByText(/^Cargado por Ana el /)).toBeInTheDocument()
  })
})
