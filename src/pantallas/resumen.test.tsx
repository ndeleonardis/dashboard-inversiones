import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { abrirApp, cargarEjemplo } from '../../tests/interfaz/abrir-app.tsx'
import { crearRepositorioFalso } from '../../tests/interfaz/repositorio-falso.ts'
import type { Fila, FilaResumenMes } from '../datos/repositorio.ts'
import { hoy, mesActual, mesAnterior } from '../dominio/fechas.ts'
import { formatearMes } from '../dominio/formato.ts'
import type { Moneda } from '../dominio/moneda.ts'

const delMes = (moneda: Moneda, ingresos: number, gastos: number, comunitarios = 0): FilaResumenMes => ({
  moneda,
  ingresos,
  gastos_asignados: gastos - comunitarios,
  gastos_comunitarios: comunitarios,
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
  ...sinPrecio(costo),
})

// Lo invertido todavía sin ningún precio: el valor falta y no hay rendimiento.
// Sin inversiones, el valor es 0 (cambio valor-actual).
function sinPrecio(costo: number) {
  return {
    valor: costo > 0 ? null : 0,
    instrumentos_sin_precio: costo > 0 ? 1 : 0,
    rendimiento: null,
    rendimiento_pct: null,
  }
}

// Ana invirtió en las dos monedas y Beto nunca invirtió.
const INVERSIONES = {
  invertido_por_persona: [
    invertido('ana', 'Ana', 'ARS', 247702.5),
    invertido('ana', 'Ana', 'USD', 301),
    invertido('beto', 'Beto', 'ARS', 0),
    invertido('beto', 'Beto', 'USD', 0),
  ],
  invertido_grupo: [
    { moneda: 'ARS', costo: 247702.5, ...sinPrecio(247702.5) },
    { moneda: 'USD', costo: 301, ...sinPrecio(301) },
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
    expect(monto(grupo, 'Costo en pesos')).toBe('$ 247.702,50')
    expect(monto(grupo, 'Costo en dólares')).toBe('US$ 301,00')
    const ana = within(inversiones).getByRole('group', { name: 'Ana' })
    expect(monto(ana, 'Costo en pesos')).toBe('$ 247.702,50')
    expect(monto(ana, 'Costo en dólares')).toBe('US$ 301,00')
    const beto = within(inversiones).getByRole('group', { name: 'Beto' })
    expect(beto).toHaveTextContent('Sin inversiones')
    expect(within(beto).queryByText('Costo en pesos')).not.toBeInTheDocument()
  })

  describe('valor actual de lo invertido (cambio valor-actual)', () => {
    // Ana tiene precio de todo en pesos, y en dólares le falta uno.
    const CON_VALORES = {
      invertido_por_persona: [
        { ...invertido('ana', 'Ana', 'ARS', 247702.5), valor: 345000, instrumentos_sin_precio: 0, rendimiento: 97297.5, rendimiento_pct: 0.3928 },
        { ...invertido('ana', 'Ana', 'USD', 301), valor: 280, instrumentos_sin_precio: 1 },
        invertido('beto', 'Beto', 'ARS', 0),
        invertido('beto', 'Beto', 'USD', 0),
      ],
      invertido_grupo: [
        { moneda: 'ARS', costo: 247702.5, valor: 345000, instrumentos_sin_precio: 0, rendimiento: 97297.5, rendimiento_pct: 0.3928 },
        { moneda: 'USD', costo: 301, valor: null, instrumentos_sin_precio: 2, rendimiento: null, rendimiento_pct: null },
      ] satisfies Fila<'invertido_grupo'>[],
    }

    async function inversiones() {
      abrirApp('/', crearRepositorioFalso({ resumenMes: SIN_MOVIMIENTOS, ...CON_VALORES }))
      const bloqueDeInversiones = await bloque('Inversiones')
      return {
        grupo: await within(bloqueDeInversiones).findByRole('group', { name: 'Todo el grupo' }),
        ana: within(bloqueDeInversiones).getByRole('group', { name: 'Ana' }),
      }
    }

    it('cada persona y el grupo tienen costo y valor actual en cada moneda (C40)', async () => {
      const { grupo, ana } = await inversiones()
      expect(monto(ana, 'Costo en pesos')).toBe('$ 247.702,50')
      expect(monto(ana, 'Valor en pesos')).toMatch(/^\$ 345\.000,00/)
      expect(monto(grupo, 'Valor en pesos')).toMatch(/^\$ 345\.000,00/)
    })

    it('un total con instrumentos sin precio se marca como parcial y dice cuántos faltan (C41)', async () => {
      const { grupo, ana } = await inversiones()
      expect(monto(ana, 'Valor en dólares')).toBe('US$ 280,00Parcial: 1 instrumento sin precio')
      expect(monto(grupo, 'Valor en dólares')).toBe('Sin precioParcial: 2 instrumentos sin precio')
    })

    it('el total completo muestra su rendimiento, y el parcial no (C42)', async () => {
      const { ana } = await inversiones()
      expect(within(ana).getByText('+$ 97.297,50 (+39,3%)')).toHaveClass('rendimiento-gana')
      expect(monto(ana, 'Valor en dólares')).not.toMatch(/%/)
    })
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

describe('el mes de una persona (C25)', () => {
  it('al elegir una persona se ven sus ingresos, sus gastos y los comunitarios del grupo', async () => {
    const repositorio = crearRepositorioFalso(INVERSIONES)
    const { ana } = await cargarEjemplo(repositorio)
    const resumenMes = vi
      .spyOn(repositorio, 'resumenMes')
      .mockImplementation(async (_mes, persona) =>
        persona === ana.id
          ? [delMes('ARS', 1000, 400, 300), delMes('USD', 50, 10, 10)]
          : [delMes('ARS', 3000, 600, 300), delMes('USD', 50, 10, 10)],
      )
    const { usuario } = abrirApp('/', repositorio)

    const mes = await bloque('El mes')
    const personas = await within(mes).findByRole('group', { name: 'Ver el mes de' })
    expect(await within(personas).findByRole('button', { name: 'Todo el grupo' })).toHaveAttribute('aria-pressed', 'true')
    expect(monto(await within(mes).findByRole('group', { name: 'Pesos' }), 'Gastos')).toBe('$ 600,00')

    await usuario.click(within(personas).getByRole('button', { name: 'Ana' }))
    expect(within(personas).getByRole('button', { name: 'Ana' })).toHaveAttribute('aria-pressed', 'true')
    // Uno por moneda.
    expect(await within(mes).findAllByText('Gastos propios')).toHaveLength(2)
    const pesos = within(mes).getByRole('group', { name: 'Pesos' })
    expect(monto(pesos, 'Ingresos')).toBe('$ 1.000,00')
    expect(monto(pesos, 'Gastos propios')).toBe('$ 100,00')
    expect(monto(pesos, 'Gastos comunitarios')).toBe('$ 300,00')
    expect(monto(pesos, 'Queda para invertir')).toBe('$ 600,00')
    expect(resumenMes).toHaveBeenLastCalledWith(mesActual(), ana.id)

    // Cambiar de mes no suelta a la persona elegida.
    await usuario.click(within(mes).getByRole('button', { name: 'Mes anterior' }))
    await waitFor(() => expect(resumenMes).toHaveBeenLastCalledWith(mesAnterior(mesActual()), ana.id))
    expect(within(personas).getByRole('button', { name: 'Ana' })).toHaveAttribute('aria-pressed', 'true')

    await usuario.click(within(personas).getByRole('button', { name: 'Todo el grupo' }))
    await waitFor(() => expect(resumenMes).toHaveBeenLastCalledWith(mesAnterior(mesActual())))
  })
})

describe('últimos movimientos (C26)', () => {
  const movimiento = (
    clase: 'gasto' | 'ingreso',
    fecha: string,
    monto: number,
    categoria: string,
    persona: string,
    creadoEn = `${fecha}T12:00:00Z`,
  ): Fila<'ultimos_movimientos'> => ({
    id: crypto.randomUUID(),
    clase,
    fecha,
    monto,
    moneda: 'ARS',
    categoria,
    persona,
    descripcion: '',
    creado_en: creadoEn,
  })

  it('lo último que se cargó va primero, aunque sea de otro mes', async () => {
    const ultimos = [
      movimiento('gasto', '2026-10-03', 45000, 'Combustible', 'Ana', '2026-10-03T12:00:00Z'),
      movimiento('gasto', '2026-07-15', 1200, 'Luz de julio', '', '2026-10-04T09:00:00Z'),
    ]
    const repositorio = crearRepositorioFalso({ resumenMes: SIN_MOVIMIENTOS, ...INVERSIONES, ultimos_movimientos: ultimos })
    abrirApp('/', repositorio)

    const seccion = await bloque('Últimos movimientos')
    const tarjetas = await within(seccion).findAllByRole('link')
    expect(tarjetas.map((t) => t.querySelector('.tarjeta-titulo')?.textContent)).toEqual(['Luz de julio', 'Combustible'])
  })

  it('se ven los últimos gastos e ingresos, del más nuevo al más viejo', async () => {
    const ultimos = [
      movimiento('gasto', '2026-10-03', 45000, 'Combustible', 'Ana'),
      movimiento('ingreso', '2026-10-05', 200000, 'Salario', 'Beto'),
      movimiento('gasto', '2026-10-01', 85000.5, 'Comida', ''),
    ]
    const repositorio = crearRepositorioFalso({ resumenMes: SIN_MOVIMIENTOS, ...INVERSIONES, ultimos_movimientos: ultimos })
    abrirApp('/', repositorio)

    const seccion = await bloque('Últimos movimientos')
    const tarjetas = await within(seccion).findAllByRole('link')
    expect(tarjetas.map((t) => t.querySelector('.tarjeta-titulo')?.textContent)).toEqual(['Salario', 'Combustible', 'Comida'])
    expect(tarjetas[0]).toHaveTextContent('Ingreso · 05/10/2026 · Beto')
    expect(tarjetas[1]).toHaveTextContent('Gasto · 03/10/2026 · Ana')
    expect(tarjetas[2]).toHaveTextContent('Gasto · 01/10/2026 · Comunitario')
    expect(tarjetas[2]).toHaveTextContent('$ 85.000,50')
    expect(tarjetas[0]).toHaveAttribute('href', `/ingresos/${ultimos[1]!.id}`)
    expect(tarjetas[1]).toHaveAttribute('href', `/gastos/${ultimos[0]!.id}`)
  })

  it('sin movimientos lo dice', async () => {
    abrirApp('/', crearRepositorioFalso({ resumenMes: SIN_MOVIMIENTOS, ...INVERSIONES }))
    expect(await within(await bloque('Últimos movimientos')).findByText('Todavía no hay gastos ni ingresos cargados.')).toBeInTheDocument()
  })
})
