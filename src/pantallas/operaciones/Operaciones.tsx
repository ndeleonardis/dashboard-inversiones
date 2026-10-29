// Compras y ventas: lista con filtros (C15), alta, edición y baja. Toda
// operación sale de una cuenta (regla 4) y va en la moneda de su instrumento
// (decisión 1 del plan): la moneda no se elige, se ve apenas se elige el
// instrumento, junto con el total. Si una venta deja la cuenta en negativo, la
// base la rechaza y la pantalla dice cuánto había (C14).
import { useId } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Autoria } from '../../componentes/Autoria.tsx'
import { Borrar } from '../../componentes/Borrar.tsx'
import { Campo, type Opcion } from '../../componentes/Campo.tsx'
import { Carga } from '../../componentes/Carga.tsx'
import { Encabezado } from '../../componentes/Encabezado.tsx'
import { Formulario, useFormulario, type Errores, type Valores } from '../../componentes/Formulario.tsx'
import { Monto } from '../../componentes/Monto.tsx'
import { useCambios, useListas } from '../../datos/consultas.ts'
import {
  CLAVES_FORANEAS,
  ErrorDeLaApp,
  MENSAJE_GENERICO,
  MENSAJE_NO_SE_ENCONTRO,
  MENSAJES_DE_COLUMNA,
} from '../../datos/errores.ts'
import type { Fila } from '../../datos/repositorio.ts'
import { avisoDeFechaFutura, hoy } from '../../dominio/fechas.ts'
import { formatearCantidad, formatearFecha } from '../../dominio/formato.ts'
import { NOMBRE_DE_MONEDA } from '../../dominio/moneda.ts'
import { compararTextos, nombreDeCuentaConDueno, porNombre } from '../../dominio/nombres.ts'
import { leerNumero, type NumeroLeido, type ReglasDeNumero } from '../../dominio/numeros.ts'
import { RUTAS, rutaDeOperacion } from '../../rutas.ts'

// Los códigos fijos de tipo_operacion. La posición de la base los usa.
const COMPRA = 'COMPRA'
const VENTA = 'VENTA'

const volverALaLista = { a: RUTAS.operaciones, texto: 'Operaciones' }

const CATALOGOS = {
  cuentas: 'cuenta',
  personas: 'persona',
  instrumentos: 'instrumento',
  tiposDeInstrumento: 'tipo_instrumento',
  tiposDeOperacion: 'tipo_operacion',
} as const

type Catalogos = {
  cuentas: Fila<'cuenta'>[]
  personas: Fila<'persona'>[]
  instrumentos: Fila<'instrumento'>[]
  tiposDeInstrumento: Fila<'tipo_instrumento'>[]
  tiposDeOperacion: Fila<'tipo_operacion'>[]
}

type ValoresDeOperacion = {
  tipo: string
  cuenta_id: string
  instrumento_id: string
  fecha: string
  cantidad: string
  precio_unitario: string
  comision: string
}

type CampoNumerico = 'cantidad' | 'precio_unitario' | 'comision'

// Lo que admite la base: cantidad y precio con hasta 8 decimales, comisión con 2.
const REGLAS: Record<CampoNumerico, ReglasDeNumero> = {
  cantidad: { decimales: 8 },
  precio_unitario: { decimales: 8 },
  comision: { decimales: 2, admiteCero: true },
}

/** Lee un número del formulario. La comisión vacía es cero. */
function leer(valores: Valores, campo: CampoNumerico): NumeroLeido {
  const texto = valores[campo] ?? ''
  if (campo === 'comision' && !texto.trim()) return { ok: true, valor: '0' }
  return leerNumero(texto, REGLAS[campo])
}

function validar(valores: Valores): Errores {
  const falta = (campo: string) => (valores[campo]?.trim() ? undefined : MENSAJES_DE_COLUMNA[campo])
  const numero = (campo: CampoNumerico) => {
    const leido = leer(valores, campo)
    if (leido.ok) return undefined
    return valores[campo]?.trim() ? leido.error : MENSAJES_DE_COLUMNA[campo]
  }
  return {
    tipo: falta('tipo'),
    cuenta_id: falta('cuenta_id'),
    instrumento_id: falta('instrumento_id'),
    fecha: falta('fecha'),
    cantidad: numero('cantidad'),
    precio_unitario: numero('precio_unitario'),
    comision: numero('comision'),
  }
}

function datosDe(valores: ValoresDeOperacion, instrumentos: Fila<'instrumento'>[]) {
  const instrumento = instrumentos.find((i) => i.id === valores.instrumento_id)
  if (!instrumento) {
    const mensaje = CLAVES_FORANEAS.operacion_instrumento_fk?.alGuardar.mensaje ?? MENSAJE_GENERICO
    throw new ErrorDeLaApp(mensaje, 'instrumento_id')
  }
  const numero = (campo: CampoNumerico) => {
    const leido = leer(valores, campo)
    if (!leido.ok) throw new ErrorDeLaApp(leido.error, campo)
    return leido.valor
  }
  return {
    tipo: valores.tipo,
    cuenta_id: valores.cuenta_id,
    instrumento_id: instrumento.id,
    fecha: valores.fecha,
    cantidad: numero('cantidad'),
    precio_unitario: numero('precio_unitario'),
    comision: numero('comision'),
    // La de su instrumento. La base no acepta otra.
    moneda: instrumento.moneda,
  }
}

/** Lo que se paga en una compra o se cobra en una venta, antes de guardar. */
function Total({ instrumento, precioCada }: { instrumento?: Fila<'instrumento'>; precioCada: number }) {
  const { valores } = useFormulario()
  const cantidad = leer(valores, 'cantidad')
  const precio = leer(valores, 'precio_unitario')
  const comision = leer(valores, 'comision')

  if (!instrumento || !cantidad.ok || !precio.ok || !comision.ok) {
    return (
      <p className="total-operacion campo-ayuda">El total aparece cuando elegís el instrumento y ponés cantidad y precio.</p>
    )
  }
  // Solo para mostrar: el costo que vale es el que calcula la base.
  const monto = (Number(cantidad.valor) * Number(precio.valor)) / precioCada
  const esVenta = valores.tipo === VENTA
  const total = esVenta ? monto - Number(comision.valor) : monto + Number(comision.valor)
  const cuenta = precioCada === 1 ? 'Cantidad por precio' : `Cantidad por precio, dividido ${formatearCantidad(precioCada)}`
  return (
    <div className="total-operacion">
      <p className="total-operacion-cifra">
        <span>Total</span>
        <Monto valor={total} moneda={instrumento.moneda} />
      </p>
      <p className="campo-ayuda">{`${cuenta}, ${esVenta ? 'menos' : 'más'} la comisión`}</p>
    </div>
  )
}

function CamposDeOperacion({ cuentas, personas, instrumentos, tiposDeInstrumento, tiposDeOperacion }: Catalogos) {
  const { valores } = useFormulario()
  const instrumento = instrumentos.find((i) => i.id === valores.instrumento_id)
  // Una ON cotiza cada 100 de valor nominal. El resto, por unidad.
  const precioCada = tiposDeInstrumento.find((t) => t.codigo === instrumento?.tipo)?.precio_cada ?? 1
  const enNominales = precioCada !== 1

  const opcionesDeCuenta = cuentas
    .map((cuenta) => ({ valor: cuenta.id, texto: nombreDeCuentaConDueno(cuenta, personas) }))
    .sort((a, b) => compararTextos(a.texto, b.texto))
  const opcionesDeInstrumento = [...instrumentos]
    .sort((a, b) => compararTextos(a.ticker, b.ticker))
    .map((i) => ({ valor: i.id, texto: `${i.ticker} · ${i.nombre} · ${NOMBRE_DE_MONEDA[i.moneda]}` }))

  return (
    <>
      <Campo
        nombre="tipo"
        etiqueta="Tipo"
        opciones={porNombre(tiposDeOperacion).map((tipo) => ({ valor: tipo.codigo, texto: tipo.nombre }))}
        sinElegir="Elegí el tipo"
      />
      <Campo nombre="cuenta_id" etiqueta="Cuenta" opciones={opcionesDeCuenta} sinElegir="Elegí la cuenta" />
      <Campo
        nombre="instrumento_id"
        etiqueta="Instrumento"
        opciones={opcionesDeInstrumento}
        sinElegir="Elegí el instrumento"
        ayuda={
          instrumento
            ? `Se opera en ${NOMBRE_DE_MONEDA[instrumento.moneda].toLowerCase()}`
            : 'La moneda sale del instrumento'
        }
      />
      <Campo nombre="fecha" etiqueta="Fecha" type="date" />
      <Campo
        nombre="cantidad"
        etiqueta="Cantidad"
        inputMode="decimal"
        autoComplete="off"
        ayuda={enNominales ? 'En valor nominal' : undefined}
      />
      <Campo
        nombre="precio_unitario"
        etiqueta="Precio unitario"
        inputMode="decimal"
        autoComplete="off"
        ayuda={enNominales ? `Cada ${formatearCantidad(precioCada)} de valor nominal` : undefined}
      />
      <Campo nombre="comision" etiqueta="Comisión (opcional)" inputMode="decimal" autoComplete="off" />
      <Total instrumento={instrumento} precioCada={precioCada} />
    </>
  )
}

type CampoDeFiltro = 'persona' | 'cuenta' | 'instrumento'

/** Los filtros de la lista (C15). Van en la dirección, así volver de una operación no los pierde. */
function useFiltros() {
  const [busqueda, setBusqueda] = useSearchParams()
  const filtro = {
    persona: busqueda.get('persona') ?? '',
    cuenta: busqueda.get('cuenta') ?? '',
    instrumento: busqueda.get('instrumento') ?? '',
  }
  const cambiar = (cambios: Partial<Record<CampoDeFiltro, string>>) =>
    setBusqueda(
      Object.fromEntries(Object.entries({ ...filtro, ...cambios }).filter(([, valor]) => valor)),
      { replace: true },
    )
  return { filtro, cambiar, conFiltros: Object.values(filtro).some(Boolean) }
}

type PropsFiltro = { etiqueta: string; valor: string; todas: string; opciones: Opcion[]; alCambiar: (valor: string) => void }

function Filtro({ etiqueta, valor, todas, opciones, alCambiar }: PropsFiltro) {
  const id = useId()
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <select id={id} value={valor} onChange={(evento) => alCambiar(evento.target.value)}>
        <option value="">{todas}</option>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.texto}
          </option>
        ))}
      </select>
    </div>
  )
}

export function ListaDeOperaciones() {
  const cargado = useListas({
    operaciones: 'operacion',
    cuentas: 'cuenta',
    personas: 'persona',
    instrumentos: 'instrumento',
    tipos: 'tipo_operacion',
  })
  const { filtro, cambiar, conFiltros } = useFiltros()

  return (
    <>
      <Encabezado titulo="Operaciones" accion={{ a: RUTAS.operacionNueva, texto: 'Nueva operación' }} />
      <Carga cargado={cargado}>
        {({ operaciones, cuentas, personas, instrumentos, tipos }) => {
          if (operaciones.length === 0) return <p className="vacio">Todavía no hay operaciones cargadas.</p>
          const tipo = (o: Fila<'operacion'>) => tipos.find((t) => t.codigo === o.tipo)?.nombre ?? o.tipo
          const ticker = (o: Fila<'operacion'>) => instrumentos.find((i) => i.id === o.instrumento_id)?.ticker ?? ''
          const cuentaDe = (o: Fila<'operacion'>) => cuentas.find((c) => c.id === o.cuenta_id)
          const cuenta = (o: Fila<'operacion'>) => {
            const encontrada = cuentaDe(o)
            return encontrada ? nombreDeCuentaConDueno(encontrada, personas) : ''
          }
          // Con una persona elegida, solo se ofrecen sus cuentas.
          const cuentasParaElegir = filtro.persona ? cuentas.filter((c) => c.persona_id === filtro.persona) : cuentas
          const visibles = operaciones.filter(
            (o) =>
              (!filtro.persona || cuentaDe(o)?.persona_id === filtro.persona) &&
              (!filtro.cuenta || o.cuenta_id === filtro.cuenta) &&
              (!filtro.instrumento || o.instrumento_id === filtro.instrumento),
          )
          // La más nueva primero. En un mismo día, la última cargada.
          const ordenadas = visibles.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.orden - a.orden)
          return (
            <>
              <div className="filtros" role="group" aria-label="Filtros">
                <Filtro
                  etiqueta="Persona"
                  valor={filtro.persona}
                  todas="Todas"
                  opciones={porNombre(personas).map((p) => ({ valor: p.id, texto: p.nombre }))}
                  alCambiar={(persona) => {
                    // La cuenta elegida se suelta si no es de la persona nueva.
                    const sigue = cuentas.some((c) => c.id === filtro.cuenta && (!persona || c.persona_id === persona))
                    cambiar({ persona, cuenta: sigue ? filtro.cuenta : '' })
                  }}
                />
                <Filtro
                  etiqueta="Cuenta"
                  valor={filtro.cuenta}
                  todas="Todas"
                  opciones={cuentasParaElegir
                    .map((c) => ({ valor: c.id, texto: nombreDeCuentaConDueno(c, personas) }))
                    .sort((a, b) => compararTextos(a.texto, b.texto))}
                  alCambiar={(cuenta) => cambiar({ cuenta })}
                />
                <Filtro
                  etiqueta="Instrumento"
                  valor={filtro.instrumento}
                  todas="Todos"
                  opciones={[...instrumentos]
                    .sort((a, b) => compararTextos(a.ticker, b.ticker))
                    .map((i) => ({ valor: i.id, texto: `${i.ticker} · ${NOMBRE_DE_MONEDA[i.moneda]}` }))}
                  alCambiar={(instrumento) => cambiar({ instrumento })}
                />
                {conFiltros && (
                  <button
                    type="button"
                    className="boton boton-secundario"
                    onClick={() => cambiar({ persona: '', cuenta: '', instrumento: '' })}
                  >
                    Sacar los filtros
                  </button>
                )}
              </div>
              {ordenadas.length === 0 ? (
                <p className="vacio">No hay operaciones con estos filtros.</p>
              ) : (
                <ul className="grilla">
                  {ordenadas.map((operacion) => (
                    <li key={operacion.id}>
                      <Link to={rutaDeOperacion(operacion.id)} className="tarjeta tarjeta-enlace">
                        <span className="tarjeta-titulo">{`${tipo(operacion)} · ${ticker(operacion)}`}</span>
                        <span>
                          {formatearCantidad(operacion.cantidad)} a{' '}
                          <Monto valor={operacion.precio_unitario} moneda={operacion.moneda} />
                        </span>
                        <span className="tarjeta-detalle">{formatearFecha(operacion.fecha)}</span>
                        <span className="tarjeta-detalle">{cuenta(operacion)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )
        }}
      </Carga>
    </>
  )
}

function FaltaCargar({ cuentas, instrumentos }: Pick<Catalogos, 'cuentas' | 'instrumentos'>) {
  return (
    <div className="detalle">
      {cuentas.length === 0 && (
        <p className="vacio">
          Para cargar una operación, primero cargá la cuenta de donde sale. <Link to={RUTAS.cuentaNueva}>Nueva cuenta</Link>
        </p>
      )}
      {instrumentos.length === 0 && (
        <p className="vacio">
          Para cargar una operación, primero cargá el instrumento.{' '}
          <Link to={RUTAS.instrumentoNuevo}>Nuevo instrumento</Link>
        </p>
      )}
    </div>
  )
}

export function NuevaOperacion() {
  const cargado = useListas(CATALOGOS)
  const { crear } = useCambios()
  const navegar = useNavigate()
  const [busqueda] = useSearchParams()

  return (
    <>
      <Encabezado titulo="Nueva operación" volver={volverALaLista} />
      <Carga cargado={cargado}>
        {(catalogos) => {
          const { cuentas, instrumentos } = catalogos
          if (cuentas.length === 0 || instrumentos.length === 0) {
            return <FaltaCargar cuentas={cuentas} instrumentos={instrumentos} />
          }
          // Desde el detalle de una cuenta llega elegida. Si hay una sola, también.
          const pedida = cuentas.find((c) => c.id === busqueda.get('cuenta'))
          const cuenta = pedida ?? (cuentas.length === 1 ? cuentas[0] : undefined)
          return (
            <Formulario
              clave="operacion-nueva"
              inicial={{
                tipo: COMPRA,
                cuenta_id: cuenta?.id ?? '',
                instrumento_id: '',
                fecha: hoy(),
                cantidad: '',
                precio_unitario: '',
                comision: '',
              }}
              validar={validar}
              confirmar={({ fecha }) => avisoDeFechaFutura(fecha)}
              guardar={async (valores) => {
                await crear('operacion', datosDe(valores, instrumentos))
              }}
              alGuardar={() => navegar(RUTAS.operaciones)}
            >
              <CamposDeOperacion {...catalogos} />
            </Formulario>
          )
        }}
      </Carga>
    </>
  )
}

export function EditarOperacion() {
  const { id = '' } = useParams()
  const cargado = useListas({ operaciones: 'operacion', ...CATALOGOS })
  const { editar, borrar } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo="Editar operación" volver={volverALaLista} />
      <Carga cargado={cargado}>
        {({ operaciones, ...catalogos }) => {
          const operacion = operaciones.find((o) => o.id === id)
          if (!operacion) {
            return (
              <p role="alert" className="formulario-error">
                {MENSAJE_NO_SE_ENCONTRO}
              </p>
            )
          }
          const ticker = catalogos.instrumentos.find((i) => i.id === operacion.instrumento_id)?.ticker ?? ''
          return (
            <div className="detalle">
              <Formulario
                key={operacion.id}
                clave={`operacion-${operacion.id}`}
                inicial={{
                  tipo: operacion.tipo,
                  cuenta_id: operacion.cuenta_id,
                  instrumento_id: operacion.instrumento_id,
                  fecha: operacion.fecha,
                  // En formato argentino, que es lo que lee el formulario.
                  cantidad: formatearCantidad(operacion.cantidad),
                  precio_unitario: formatearCantidad(operacion.precio_unitario),
                  comision: operacion.comision ? formatearCantidad(operacion.comision) : '',
                }}
                validar={validar}
                // Una fecha futura ya confirmada no se vuelve a preguntar.
                confirmar={({ fecha }) => (fecha === operacion.fecha ? null : avisoDeFechaFutura(fecha))}
                guardar={async (valores) => {
                  await editar('operacion', operacion.id, datosDe(valores, catalogos.instrumentos))
                }}
                alGuardar={() => navegar(RUTAS.operaciones)}
              >
                <CamposDeOperacion {...catalogos} />
              </Formulario>
              <Autoria fila={operacion} personas={catalogos.personas} />
              <Borrar
                pregunta={`¿Borrar la operación de ${ticker} del ${formatearFecha(operacion.fecha)}?`}
                borrar={() => borrar('operacion', operacion.id)}
                alBorrar={() => navegar(RUTAS.operaciones)}
              />
            </div>
          )
        }}
      </Carga>
    </>
  )
}
