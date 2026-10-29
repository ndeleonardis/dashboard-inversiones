import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  abrirApp,
  cargarEjemplo,
  TIPOS_DE_INSTRUMENTO,
  TIPOS_DE_OPERACION,
} from '../../../tests/interfaz/abrir-app.tsx'
import { crearRepositorioFalso } from '../../../tests/interfaz/repositorio-falso.ts'
import type { Fila, Origen, Repositorio } from '../../datos/repositorio.ts'

async function conEjemplo() {
  const repositorio = crearRepositorioFalso({ tipo_instrumento: TIPOS_DE_INSTRUMENTO, tipo_operacion: TIPOS_DE_OPERACION })
  const ejemplo = await cargarEjemplo(repositorio)
  const aapl = await repositorio.crear('instrumento', { tipo: 'CEDEAR', ticker: 'AAPL', nombre: 'Apple', moneda: 'ARS' })
  const aapld = await repositorio.crear('instrumento', { tipo: 'CEDEAR', ticker: 'AAPLD', nombre: 'Apple', moneda: 'USD' })
  const on = await repositorio.crear('instrumento', {
    tipo: 'ON',
    ticker: 'ONX1D',
    nombre: 'ON Ejemplo',
    moneda: 'USD',
    vencimiento: '2028-03-01',
  })
  return { repositorio, ...ejemplo, aapl, aapld, on }
}

/** El ejemplo, con una compra de 10 AAPL a $ 100 en la cuenta de Ana. */
async function conUnaCompra() {
  const ejemplo = await conEjemplo()
  const compra = await ejemplo.repositorio.crear('operacion', {
    cuenta_id: ejemplo.cuenta.id,
    instrumento_id: ejemplo.aapl.id,
    tipo: 'COMPRA',
    fecha: '2026-03-15',
    cantidad: '10',
    precio_unitario: '100',
    moneda: 'ARS',
  })
  return { ...ejemplo, compra }
}

// La vista posicion la calcula la base (T7). En estos tests la arma cada test.
function conPosicion(repositorio: Repositorio, calcular: () => Promise<Fila<'posicion'>[]>) {
  const listar = repositorio.listar.bind(repositorio)
  vi.spyOn(repositorio, 'listar').mockImplementation(((origen: Origen) =>
    origen === 'posicion' ? calcular() : listar(origen)) as Repositorio['listar'])
}

type Usuario = ReturnType<typeof abrirApp>['usuario']
type Carga = { tipo?: string; cuenta?: string; instrumento?: string; fecha?: string; cantidad?: string; precio?: string; comision?: string }

async function completar(usuario: Usuario, carga: Carga) {
  const escribir = async (etiqueta: string, texto: string) => {
    const campo = screen.getByLabelText(etiqueta)
    await usuario.clear(campo)
    await usuario.type(campo, texto)
  }
  if (carga.tipo) await usuario.selectOptions(await screen.findByLabelText('Tipo'), carga.tipo)
  if (carga.cuenta) await usuario.selectOptions(await screen.findByLabelText('Cuenta'), carga.cuenta)
  if (carga.instrumento) await usuario.selectOptions(await screen.findByLabelText('Instrumento'), carga.instrumento)
  if (carga.fecha) await escribir('Fecha', carga.fecha)
  if (carga.cantidad) await escribir('Cantidad', carga.cantidad)
  if (carga.precio) await escribir('Precio unitario', carga.precio)
  if (carga.comision) await escribir('Comisión (opcional)', carga.comision)
}

const menu = () => within(screen.getByRole('navigation', { name: 'Secciones' }))
const guardar = () => screen.getByRole('button', { name: 'Guardar' })
const tarjetas = () => screen.getAllByRole('link', { name: /^(Compra|Venta) · / })
const filaDe = (tabla: HTMLElement, ticker: string) => within(tabla).getByText(ticker).closest('tr')!

describe('operaciones', () => {
  it('el formulario pide cuenta, instrumento, fecha, cantidad y precio, y la comisión es opcional (C11)', async () => {
    const { repositorio, beto, billetera, cuenta, aapl } = await conEjemplo()
    // Con dos cuentas, ninguna queda elegida de entrada.
    await repositorio.crear('cuenta', { persona_id: beto.id, tipo_cuenta_id: billetera.id, entidad: 'Billetera Dos' })
    const crear = vi.spyOn(repositorio, 'crear')
    const { usuario } = abrirApp('/operaciones/nueva', repositorio)

    await usuario.clear(await screen.findByLabelText('Fecha'))
    await usuario.click(guardar())

    expect(screen.getByLabelText('Cuenta')).toHaveAccessibleDescription('Elegí la cuenta')
    expect(screen.getByLabelText('Instrumento')).toHaveAccessibleDescription(/Elegí el instrumento/)
    expect(screen.getByLabelText('Fecha')).toHaveAccessibleDescription('Poné la fecha')
    expect(screen.getByLabelText('Cantidad')).toHaveAccessibleDescription(/Poné la cantidad/)
    expect(screen.getByLabelText('Precio unitario')).toHaveAccessibleDescription(/Poné el precio/)
    expect(screen.getByLabelText('Comisión (opcional)')).not.toHaveAttribute('aria-invalid')
    expect(crear).not.toHaveBeenCalled()

    await completar(usuario, { cuenta: cuenta.id, instrumento: aapl.id, fecha: '2026-03-15', cantidad: '10', precio: '100' })
    await usuario.click(guardar())

    expect(await screen.findByRole('link', { name: /^Compra · AAPL/ })).toBeInTheDocument()
    expect(await repositorio.listar('operacion')).toEqual([
      expect.objectContaining({
        tipo: 'COMPRA',
        cuenta_id: cuenta.id,
        instrumento_id: aapl.id,
        fecha: '2026-03-15',
        cantidad: 10,
        precio_unitario: 100,
        comision: 0,
        moneda: 'ARS',
      }),
    ])
  })

  it('una cantidad en cero o un precio con punto decimal quedan marcados en su campo', async () => {
    const { repositorio, aapl } = await conEjemplo()
    const crear = vi.spyOn(repositorio, 'crear')
    const { usuario } = abrirApp('/operaciones/nueva', repositorio)

    await completar(usuario, { instrumento: aapl.id, cantidad: '0', precio: '0.5', comision: '-1' })
    await usuario.click(guardar())

    expect(screen.getByLabelText('Cantidad')).toHaveAccessibleDescription(/Tiene que ser mayor que cero/)
    expect(screen.getByLabelText('Precio unitario')).toHaveAccessibleDescription(/Usá coma para los decimales/)
    expect(screen.getByLabelText('Comisión (opcional)')).toHaveAccessibleDescription(/No puede ser negativo/)
    expect(crear).not.toHaveBeenCalled()
  })

  it('al elegir el instrumento, la moneda queda fija y se ve el total antes de guardar', async () => {
    const { repositorio, aapld, on } = await conEjemplo()
    const { usuario } = abrirApp('/operaciones/nueva', repositorio)

    expect(await screen.findByLabelText('Instrumento')).toHaveAccessibleDescription('La moneda sale del instrumento')
    await completar(usuario, { instrumento: aapld.id, cantidad: '10', precio: '15,5', comision: '1' })
    expect(screen.getByLabelText('Instrumento')).toHaveAccessibleDescription('Se opera en dólares')
    expect(screen.getByText('US$ 156,00')).toBeInTheDocument()

    // Una ON cotiza cada 100 de valor nominal: 1.000 a 102,50 son 1.025, más la comisión.
    await completar(usuario, { instrumento: on.id, cantidad: '1.000', precio: '102,50' })
    expect(screen.getByText('US$ 1.026,00')).toBeInTheDocument()

    // En una venta la comisión se resta.
    await completar(usuario, { tipo: 'VENTA' })
    expect(screen.getByText('US$ 1.024,00')).toBeInTheDocument()

    await completar(usuario, { tipo: 'COMPRA' })
    await usuario.click(guardar())
    await screen.findByRole('link', { name: /^Compra · ONX1D/ })
    expect(await repositorio.listar('operacion')).toEqual([
      expect.objectContaining({ instrumento_id: on.id, moneda: 'USD', cantidad: 1000, precio_unitario: 102.5, comision: 1 }),
    ])
  })

  it('una venta rechazada dice cuánto tiene la cuenta y el formulario no se cierra (C14)', async () => {
    const { repositorio, aapl } = await conUnaCompra()
    vi.spyOn(repositorio, 'crear').mockRejectedValueOnce({
      code: 'LH001',
      message: 'La cuenta solo tiene 10 AAPL al 20/03/2026 y la venta es de 15',
      details: JSON.stringify({ operacion_id: 'x', fecha: '2026-03-20', cantidad: 15, disponible: 10, ticker: 'AAPL' }),
    })
    const { usuario } = abrirApp('/operaciones/nueva', repositorio)

    await completar(usuario, { tipo: 'VENTA', instrumento: aapl.id, fecha: '2026-03-20', cantidad: '15', precio: '120' })
    await usuario.click(guardar())

    expect(await screen.findByText('La cuenta solo tiene 10 AAPL al 20/03/2026 y la venta es de 15')).toBeInTheDocument()
    expect(screen.getByLabelText('Cantidad')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Cantidad')).toHaveValue('15')
    expect(screen.getByRole('heading', { name: 'Nueva operación' })).toBeInTheDocument()
    expect(screen.queryByText('Guardado')).not.toBeInTheDocument()
    expect(await repositorio.listar('operacion')).toHaveLength(1)
  })

  it('una fecha futura pide confirmar dentro de la pantalla', async () => {
    const { repositorio, aapl } = await conEjemplo()
    const crear = vi.spyOn(repositorio, 'crear')
    const { usuario } = abrirApp('/operaciones/nueva', repositorio)

    await completar(usuario, { instrumento: aapl.id, fecha: '2099-01-15', cantidad: '10', precio: '100' })
    await usuario.click(guardar())

    expect(screen.getByRole('alertdialog')).toHaveTextContent('La fecha 15/01/2099 es posterior a hoy.')
    expect(crear).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Guardar igual' }))
    expect(await screen.findByRole('link', { name: /^Compra · AAPL/ })).toHaveTextContent('15/01/2099')
  })

  it('la lista muestra cada operación con su cuenta, de la más nueva a la más vieja', async () => {
    const { repositorio, cuenta, aapl, aapld } = await conUnaCompra()
    const conCuenta = { cuenta_id: cuenta.id }
    await repositorio.crear('operacion', {
      ...conCuenta,
      instrumento_id: aapld.id,
      tipo: 'COMPRA',
      fecha: '2026-04-02',
      cantidad: '20',
      precio_unitario: '15.5',
      moneda: 'USD',
    })
    // El mismo día que la compra, cargada después: va antes en la lista.
    await repositorio.crear('operacion', {
      ...conCuenta,
      instrumento_id: aapl.id,
      tipo: 'VENTA',
      fecha: '2026-03-15',
      cantidad: '4',
      precio_unitario: '120',
      moneda: 'ARS',
    })
    abrirApp('/operaciones', repositorio)

    await screen.findAllByRole('link', { name: /^Compra · AAPLD/ })
    const [primera, segunda, tercera] = tarjetas()
    expect(primera).toHaveTextContent(/^Compra · AAPLD/)
    expect(primera).toHaveTextContent('20 a US$ 15,50')
    expect(primera).toHaveTextContent('02/04/2026')
    expect(primera).toHaveTextContent('Banco Uno · Caja de ahorro (de Ana)')
    expect(segunda).toHaveTextContent(/^Venta · AAPL/)
    expect(segunda).toHaveTextContent('4 a $ 120,00')
    expect(tercera).toHaveTextContent(/^Compra · AAPL/)
  })

  it('se edita con los números en formato argentino, y el detalle dice quién la cargó (C27)', async () => {
    const { repositorio, compra } = await conUnaCompra()
    await repositorio.editar('operacion', compra.id, { cantidad: '1234.5', comision: '2.5' })
    const { usuario } = abrirApp(`/operaciones/${compra.id}`, repositorio)

    expect(await screen.findByText(/^Cargado por Ana el /)).toBeInTheDocument()
    expect(screen.getByLabelText('Cantidad')).toHaveValue('1.234,5')
    expect(screen.getByLabelText('Precio unitario')).toHaveValue('100')
    expect(screen.getByLabelText('Comisión (opcional)')).toHaveValue('2,5')

    await completar(usuario, { precio: '110,25' })
    await usuario.click(guardar())

    expect(await screen.findByRole('link', { name: /^Compra · AAPL/ })).toHaveTextContent('1.234,5 a $ 110,25')
    expect((await repositorio.listar('operacion'))[0]).toMatchObject({ cantidad: 1234.5, precio_unitario: 110.25, comision: 2.5 })
  })

  it('el detalle de la cuenta muestra la cantidad y el costo de cada instrumento (C12)', async () => {
    const { repositorio, beto, billetera, cuenta, aapl, aapld, on } = await conEjemplo()
    const otra = await repositorio.crear('cuenta', { persona_id: beto.id, tipo_cuenta_id: billetera.id, entidad: 'Billetera Dos' })
    const fila = (de: Fila<'cuenta'>, instrumento: Fila<'instrumento'>, cantidad: number, costo: number) => ({
      cuenta_id: de.id,
      persona_id: de.persona_id,
      instrumento_id: instrumento.id,
      moneda: instrumento.moneda,
      cantidad,
      costo,
    })
    conPosicion(repositorio, async () => [fila(cuenta, aapl, 15, 2250), fila(cuenta, aapld, 20, 311), fila(otra, on, 1000, 1027)])
    const { usuario } = abrirApp(`/cuentas/${cuenta.id}`, repositorio)

    expect(await screen.findByRole('heading', { level: 1, name: 'Banco Uno · Caja de ahorro' })).toBeInTheDocument()
    const posicion = await screen.findByRole('table', { name: 'Posición' })
    expect(within(filaDe(posicion, 'AAPL')).getByText('15')).toBeInTheDocument()
    expect(within(filaDe(posicion, 'AAPL')).getByText('$ 2.250,00')).toBeInTheDocument()
    expect(within(filaDe(posicion, 'AAPLD')).getByText('20')).toBeInTheDocument()
    expect(within(filaDe(posicion, 'AAPLD')).getByText('US$ 311,00')).toBeInTheDocument()
    expect(within(posicion).queryByText('ONX1D')).not.toBeInTheDocument()

    // Cargar una operación desde la cuenta la deja elegida, aunque haya otras.
    await usuario.click(screen.getByRole('link', { name: 'Nueva operación' }))
    expect(await screen.findByLabelText('Cuenta')).toHaveValue(cuenta.id)
  })

  it('una cuenta sin posición lo dice', async () => {
    const { repositorio, cuenta } = await conEjemplo()
    abrirApp(`/cuentas/${cuenta.id}`, repositorio)
    expect(await screen.findByText('Sin inversiones en esta cuenta.')).toBeInTheDocument()
  })

  it('después de editar o borrar una operación, la posición de la cuenta cambia (C13)', async () => {
    const { repositorio, ana } = await conUnaCompra()
    // Para la pantalla alcanza con una cuenta simple: cada compra es una fila.
    conPosicion(repositorio, async () =>
      (await repositorio.listar('operacion')).map((operacion) => ({
        cuenta_id: operacion.cuenta_id,
        persona_id: ana.id,
        instrumento_id: operacion.instrumento_id,
        moneda: operacion.moneda,
        cantidad: operacion.cantidad,
        costo: operacion.cantidad * operacion.precio_unitario + operacion.comision,
      })),
    )
    const { usuario } = abrirApp('/cuentas', repositorio)
    await screen.findByRole('navigation', { name: 'Secciones' })
    const abrirLaCuenta = async () => {
      await usuario.click(menu().getByRole('link', { name: 'Cuentas' }))
      await usuario.click(await screen.findByRole('link', { name: /Banco Uno/ }))
    }
    const abrirLaCompra = async () => {
      await usuario.click(menu().getByRole('link', { name: 'Operaciones' }))
      await usuario.click(await screen.findByRole('link', { name: /^Compra · AAPL/ }))
    }

    await abrirLaCuenta()
    expect(await screen.findByText('$ 1.000,00')).toBeInTheDocument()

    await abrirLaCompra()
    await completar(usuario, { cantidad: '12' })
    await usuario.click(guardar())
    await screen.findByRole('link', { name: /^Compra · AAPL/ })

    await abrirLaCuenta()
    expect(await screen.findByText('$ 1.200,00')).toBeInTheDocument()
    expect(within(filaDe(screen.getByRole('table', { name: 'Posición' }), 'AAPL')).getByText('12')).toBeInTheDocument()

    await abrirLaCompra()
    await usuario.click(await screen.findByRole('button', { name: 'Borrar' }))
    await usuario.click(screen.getByRole('button', { name: 'Sí, borrar' }))
    expect(await screen.findByText('Todavía no hay operaciones cargadas.')).toBeInTheDocument()

    await abrirLaCuenta()
    expect(await screen.findByText('Sin inversiones en esta cuenta.')).toBeInTheDocument()
  })

  it('sin cuentas o sin instrumentos, pide cargarlos antes', async () => {
    abrirApp('/operaciones/nueva')
    expect(await screen.findByText(/primero cargá la cuenta/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nueva cuenta' })).toHaveAttribute('href', '/cuentas/nueva')
    expect(screen.getByText(/primero cargá el instrumento/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nuevo instrumento' })).toHaveAttribute('href', '/instrumentos/nuevo')
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
  })

  it('si la operación ya no existe, lo dice', async () => {
    abrirApp('/operaciones/no-existe')
    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró. Puede que alguien lo haya borrado')
  })
})
