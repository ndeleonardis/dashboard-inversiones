import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { abrirApp } from '../../tests/interfaz/abrir-app.tsx'
import { crearRepositorioFalso } from '../../tests/interfaz/repositorio-falso.ts'
import type { Fila, FilaResumenMes } from '../datos/repositorio.ts'
import { hoy, mesActual, mesAnterior } from '../dominio/fechas.ts'
import { formatearMes } from '../dominio/formato.ts'
import type { Moneda } from '../dominio/moneda.ts'

const delMes = (moneda: Moneda, ingresos: number, gastos: number): FilaResumenMes => ({
  moneda,
  ingresos,
  gastos,
  queda: ingresos - gastos,
})
const SIN_MOVIMIENTOS = [delMes('ARS', 0, 0), delMes('USD', 0, 0)]

const invertido = (persona_id: string, nombre: string, moneda: Moneda, costo: number): Fila<'invertido_por_persona'> => ({
  persona_id,
  nombre,
  moneda,
  costo,
  tiene_inversiones: costo > 0,
})

// Ana invirtió en las dos monedas y Beto nunca invirtió.
const INVERSIONES = {
  invertido_por_persona: [
    invertido('ana', 'Ana', 'ARS', 247702.5),
    invertido('ana', 'Ana', 'USD', 301),
    invertido('beto', 'Beto', 'ARS', 0),
    invertido('beto', 'Beto', 'USD', 0),
  ],
  invertido_grupo: [
    { moneda: 'ARS', costo: 247702.5 },
    { moneda: 'USD', costo: 301 },
  ] satisfies Fila<'invertido_grupo'>[],
}

const bloque = (nombre: string) => screen.findByRole('region', { name: nombre })

/** El monto que va con una etiqueta dentro de una tarjeta, con espacios comunes. */
function monto(tarjeta: HTMLElement, etiqueta: string): string {
  const valor = within(tarjeta).getByText(etiqueta).nextElementSibling
  return valor?.textContent?.replace(/\s/g, ' ') ?? ''
}

describe('resumen', () => {
  it('muestra ingresos, gastos y lo que queda del mes, en pesos y en dólares por separado (C21)', async () => {
    const repositorio = crearRepositorioFalso({
      resumenMes: [delMes('ARS', 1500000, 162000.5), delMes('USD', 3000, 120)],
      ...INVERSIONES,
    })
    abrirApp('/', repositorio)

    const mes = await bloque('El mes')
    const pesos = await within(mes).findByRole('group', { name: 'Pesos' })
    expect(monto(pesos, 'Ingresos')).toBe('$ 1.500.000,00')
    expect(monto(pesos, 'Gastos')).toBe('$ 162.000,50')
    expect(monto(pesos, 'Queda para invertir')).toBe('$ 1.337.999,50')
    const dolares = within(mes).getByRole('group', { name: 'Dólares' })
    expect(monto(dolares, 'Ingresos')).toBe('US$ 3.000,00')
    expect(monto(dolares, 'Gastos')).toBe('US$ 120,00')
    expect(monto(dolares, 'Queda para invertir')).toBe('US$ 2.880,00')
    expect(screen.queryByText('Sin movimientos este mes')).not.toBeInTheDocument()
  })

  it('no hay ningún monto sin su moneda en la pantalla (C24)', async () => {
    const repositorio = crearRepositorioFalso({
      resumenMes: [delMes('ARS', 1000, 2500.75), delMes('USD', 3000, 120)],
      ...INVERSIONES,
    })
    abrirApp('/', repositorio)

    await within(await bloque('El mes')).findByRole('group', { name: 'Pesos' })
    await within(await bloque('Inversiones')).findByRole('group', { name: 'Ana' })
    const texto = document.body.textContent?.replace(/\s/g, ' ') ?? ''
    expect(texto).toContain('-$ 1.500,75')
    const sinLosMontos = texto.replace(/-?(US)?\$ [\d.]+,\d{2}/g, '')
    expect(sinLosMontos).not.toMatch(/\d,\d/)
  })

  it('arranca en el mes actual y cambia al elegir otro (C22)', async () => {
    const actual = mesActual()
    const anterior = mesAnterior(actual)
    const repositorio = crearRepositorioFalso(INVERSIONES)
    const resumenMes = vi
      .spyOn(repositorio, 'resumenMes')
      .mockImplementation(async (mes) =>
        mes === anterior ? [delMes('ARS', 900, 100), delMes('USD', 0, 0)] : [delMes('ARS', 500, 200), delMes('USD', 0, 0)],
      )
    const { usuario } = abrirApp('/', repositorio)

    const mes = await bloque('El mes')
    expect(within(mes).getByText(new RegExp(`^${formatearMes(actual)}$`, 'i'))).toBeInTheDocument()
    const pesos = await within(mes).findByRole('group', { name: 'Pesos' })
    expect(monto(pesos, 'Queda para invertir')).toBe('$ 300,00')
    expect(resumenMes).toHaveBeenCalledWith(actual)

    await usuario.click(within(mes).getByRole('button', { name: 'Mes anterior' }))
    expect(await within(mes).findByText(new RegExp(`^${formatearMes(anterior)}$`, 'i'))).toBeInTheDocument()
    expect(await within(mes).findByText('$ 800,00')).toBeInTheDocument()
    expect(resumenMes).toHaveBeenLastCalledWith(anterior)
  })

  it('un mes sin movimientos dice "Sin movimientos este mes" y muestra ceros en cada moneda', async () => {
    const repositorio = crearRepositorioFalso({ resumenMes: SIN_MOVIMIENTOS, ...INVERSIONES })
    abrirApp('/', repositorio)

    const mes = await bloque('El mes')
    expect(await within(mes).findByText('Sin movimientos este mes')).toBeInTheDocument()
    const pesos = within(mes).getByRole('group', { name: 'Pesos' })
    const dolares = within(mes).getByRole('group', { name: 'Dólares' })
    for (const etiqueta of ['Ingresos', 'Gastos', 'Queda para invertir']) {
      expect(monto(pesos, etiqueta)).toBe('$ 0,00')
      expect(monto(dolares, etiqueta)).toBe('US$ 0,00')
    }
  })

  it('cada persona y el grupo tienen su total en cada moneda, y quien no invirtió dice "Sin inversiones" (C23)', async () => {
    const repositorio = crearRepositorioFalso({ resumenMes: SIN_MOVIMIENTOS, ...INVERSIONES })
    abrirApp('/', repositorio)

    const inversiones = await bloque('Inversiones')
    const grupo = await within(inversiones).findByRole('group', { name: 'Todo el grupo' })
    expect(monto(grupo, 'Pesos')).toBe('$ 247.702,50')
    expect(monto(grupo, 'Dólares')).toBe('US$ 301,00')
    const ana = within(inversiones).getByRole('group', { name: 'Ana' })
    expect(monto(ana, 'Pesos')).toBe('$ 247.702,50')
    expect(monto(ana, 'Dólares')).toBe('US$ 301,00')
    const beto = within(inversiones).getByRole('group', { name: 'Beto' })
    expect(beto).toHaveTextContent('Sin inversiones')
    expect(within(beto).queryByText('Pesos')).not.toBeInTheDocument()
  })

  it('después de editar un gasto, el resumen lo refleja (C19)', async () => {
    const repositorio = crearRepositorioFalso(INVERSIONES)
    const comida = await repositorio.crear('tipo_gasto', { nombre: 'Comida' })
    await repositorio.crear('gasto', { tipo_gasto_id: comida.id, fecha: hoy(), monto: '100', moneda: 'ARS' })
    // La base suma (T12). Acá alcanza con sumar los gastos en pesos del mes.
    vi.spyOn(repositorio, 'resumenMes').mockImplementation(async (mes) => {
      const gastos = await repositorio.listarDelMes('gasto', mes)
      return [delMes('ARS', 0, gastos.reduce((total, gasto) => total + gasto.monto, 0)), delMes('USD', 0, 0)]
    })
    const { usuario } = abrirApp('/', repositorio)
    const menu = () => within(screen.getByRole('navigation', { name: 'Secciones' }))
    const gastosEnPesos = async () => monto(await within(await bloque('El mes')).findByRole('group', { name: 'Pesos' }), 'Gastos')

    expect(await gastosEnPesos()).toBe('$ 100,00')

    await usuario.click(menu().getByRole('link', { name: 'Gastos' }))
    await usuario.click(await screen.findByRole('link', { name: /^Comida/ }))
    const campo = await screen.findByLabelText('Monto')
    await usuario.clear(campo)
    await usuario.type(campo, '250')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await screen.findByRole('link', { name: /^Comida/ })

    await usuario.click(menu().getByRole('link', { name: 'Resumen' }))
    expect(await within(await bloque('El mes')).findByText('$ 250,00')).toBeInTheDocument()
  })
})
