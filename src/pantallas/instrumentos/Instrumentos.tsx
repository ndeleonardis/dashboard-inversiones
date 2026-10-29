// Instrumentos: la especie exacta que se opera (C8). El ticker define la
// moneda: AAPL en pesos y AAPLD en dólares son dos instrumentos. Una ON
// necesita vencimiento, y los demás tipos no lo llevan (C9). El FCI, el CEDEAR
// y la ON tienen además sus datos propios, que son opcionales (C10).
import { Link, useNavigate, useParams } from 'react-router'
import { Autoria } from '../../componentes/Autoria.tsx'
import { Borrar } from '../../componentes/Borrar.tsx'
import { Campo } from '../../componentes/Campo.tsx'
import { Carga } from '../../componentes/Carga.tsx'
import { Encabezado } from '../../componentes/Encabezado.tsx'
import { Formulario, useFormulario, type Errores, type Valores } from '../../componentes/Formulario.tsx'
import { useCambios, useListas } from '../../datos/consultas.ts'
import { ErrorDeLaApp, MENSAJE_NO_SE_ENCONTRO, MENSAJES_DE_COLUMNA, MENSAJES_DE_RESTRICCION } from '../../datos/errores.ts'
import type { DatosDeInstrumento, Fila } from '../../datos/repositorio.ts'
import { formatearCantidad, formatearFecha } from '../../dominio/formato.ts'
import { NOMBRE_DE_MONEDA, OPCIONES_DE_MONEDA, type Moneda } from '../../dominio/moneda.ts'
import { compararTextos, porNombre } from '../../dominio/nombres.ts'
import { leerNumero } from '../../dominio/numeros.ts'
import { RUTAS, rutaDeInstrumento } from '../../rutas.ts'

// Los códigos fijos de tipo_instrumento que usan las reglas de la base.
const ON = 'ON'
const FCI = 'FCI'
const CEDEAR = 'CEDEAR'

const volverALaLista = { a: RUTAS.instrumentos, texto: 'Instrumentos' }

const DETALLES = { fci: 'instrumento_fci', cedear: 'instrumento_cedear', on: 'instrumento_on' } as const

type Detalles = {
  fci: Fila<'instrumento_fci'>[]
  cedear: Fila<'instrumento_cedear'>[]
  on: Fila<'instrumento_on'>[]
}

type ValoresDeInstrumento = {
  tipo: string
  ticker: string
  nombre: string
  moneda: string
  vencimiento: string
  codigo_cafci: string
  ratio: string
  subyacente: string
  emisor: string
  valor_nominal_residual: string
}

const SIN_DATOS_PROPIOS = { codigo_cafci: '', ratio: '', subyacente: '', emisor: '', valor_nominal_residual: '' }

// El ratio y el valor residual admiten hasta 8 decimales, como en la base.
const REGLAS_DE_DETALLE = { decimales: 8 }
const RESIDUAL_FUERA_DE_RANGO = MENSAJES_DE_RESTRICCION.instrumento_on_valor_residual_valido?.mensaje

function validar(valores: Valores): Errores {
  const falta = (campo: string) => (valores[campo]?.trim() ? undefined : MENSAJES_DE_COLUMNA[campo])
  const numero = (campo: string) => {
    const texto = valores[campo]?.trim()
    if (!texto) return undefined
    const leido = leerNumero(texto, REGLAS_DE_DETALLE)
    if (!leido.ok) return leido.error
    return campo === 'valor_nominal_residual' && Number(leido.valor) > 100 ? RESIDUAL_FUERA_DE_RANGO : undefined
  }
  const sinVencimiento = valores.tipo === ON && !valores.vencimiento
  return {
    tipo: falta('tipo'),
    ticker: falta('ticker'),
    nombre: falta('nombre'),
    moneda: falta('moneda'),
    vencimiento: sinVencimiento ? MENSAJES_DE_RESTRICCION.instrumento_on_con_vencimiento?.mensaje : undefined,
    // Solo cuentan los datos propios del tipo elegido. Los otros no se guardan.
    ratio: valores.tipo === CEDEAR ? numero('ratio') : undefined,
    valor_nominal_residual: valores.tipo === ON ? numero('valor_nominal_residual') : undefined,
  }
}

function datosDe(valores: ValoresDeInstrumento): DatosDeInstrumento {
  const { tipo } = valores
  const texto = (campo: keyof ValoresDeInstrumento) => valores[campo].trim() || null
  const numero = (campo: 'ratio' | 'valor_nominal_residual') => {
    if (!valores[campo].trim()) return null
    const leido = leerNumero(valores[campo], REGLAS_DE_DETALLE)
    if (!leido.ok) throw new ErrorDeLaApp(leido.error, campo)
    return leido.valor
  }
  return {
    tipo,
    ticker: valores.ticker.trim(),
    nombre: valores.nombre.trim(),
    moneda: valores.moneda as Moneda,
    // Si se eligió un tipo y después otro, lo que quedó escrito del primero no va.
    vencimiento: tipo === ON ? valores.vencimiento : null,
    codigo_cafci: tipo === FCI ? texto('codigo_cafci') : null,
    ratio: tipo === CEDEAR ? numero('ratio') : null,
    subyacente: tipo === CEDEAR ? texto('subyacente') : null,
    emisor: tipo === ON ? texto('emisor') : null,
    valor_nominal_residual: tipo === ON ? numero('valor_nominal_residual') : null,
  }
}

/** Los datos propios del instrumento en una línea, o null si no tiene. */
function datosPropios(instrumento: Fila<'instrumento'>, { fci, cedear, on }: Detalles): string | null {
  const deEste = <D extends { instrumento_id: string }>(filas: D[]) => filas.find((d) => d.instrumento_id === instrumento.id)
  const partes = (lista: (string | null | false | undefined)[]) => lista.filter(Boolean).join(' · ') || null
  const delFci = deEste(fci)
  const delCedear = deEste(cedear)
  const deLaOn = deEste(on)
  if (delFci) return `CAFCI ${delFci.codigo_cafci}`
  if (delCedear) {
    return partes([
      delCedear.ratio !== null && `Ratio ${formatearCantidad(delCedear.ratio)}`,
      delCedear.subyacente && `Subyacente ${delCedear.subyacente}`,
    ])
  }
  if (deLaOn) {
    return partes([
      deLaOn.emisor,
      deLaOn.valor_nominal_residual !== null && `Valor residual ${formatearCantidad(deLaOn.valor_nominal_residual)} %`,
    ])
  }
  return null
}

function CamposDeInstrumento({ tipos }: { tipos: Fila<'tipo_instrumento'>[] }) {
  const { valores } = useFormulario()
  return (
    <>
      <Campo
        nombre="tipo"
        etiqueta="Tipo"
        opciones={porNombre(tipos).map((tipo) => ({ valor: tipo.codigo, texto: tipo.nombre }))}
        sinElegir="Elegí el tipo"
      />
      <Campo
        nombre="ticker"
        etiqueta="Ticker"
        ayuda="Con su sufijo: AAPL en pesos y AAPLD en dólares son dos instrumentos"
        transformar={(valor) => valor.toUpperCase()}
        autoComplete="off"
      />
      <Campo nombre="nombre" etiqueta="Nombre" autoComplete="off" />
      <Campo nombre="moneda" etiqueta="Moneda" opciones={OPCIONES_DE_MONEDA} sinElegir="Elegí la moneda" />
      {valores.tipo === ON && <Campo nombre="vencimiento" etiqueta="Vencimiento" type="date" />}
      {valores.tipo === FCI && (
        <Campo
          nombre="codigo_cafci"
          etiqueta="Código CAFCI (opcional)"
          ayuda="Va a servir para traer el valor de la cuotaparte"
          autoComplete="off"
        />
      )}
      {valores.tipo === CEDEAR && (
        <>
          <Campo
            nombre="ratio"
            etiqueta="Ratio (opcional)"
            ayuda="Cuántos CEDEAR equivalen a una acción. Por ejemplo, 20"
            inputMode="decimal"
            autoComplete="off"
          />
          <Campo
            nombre="subyacente"
            etiqueta="Subyacente (opcional)"
            ayuda="El ticker de la acción en su mercado de origen"
            transformar={(valor) => valor.toUpperCase()}
            autoComplete="off"
          />
        </>
      )}
      {valores.tipo === ON && (
        <>
          <Campo nombre="emisor" etiqueta="Emisor (opcional)" autoComplete="off" />
          <Campo
            nombre="valor_nominal_residual"
            etiqueta="Valor residual (opcional)"
            ayuda="El porcentaje del valor nominal que queda después de las amortizaciones: 100 si todavía no amortizó"
            inputMode="decimal"
            autoComplete="off"
          />
        </>
      )}
    </>
  )
}

export function ListaDeInstrumentos() {
  const cargado = useListas({ instrumentos: 'instrumento', tipos: 'tipo_instrumento', ...DETALLES })

  return (
    <>
      <Encabezado titulo="Instrumentos" accion={{ a: RUTAS.instrumentoNuevo, texto: 'Nuevo instrumento' }} />
      <Carga cargado={cargado}>
        {({ instrumentos, tipos, ...detalles }) => {
          if (instrumentos.length === 0) return <p className="vacio">Todavía no hay instrumentos cargados.</p>
          const tipo = (instrumento: Fila<'instrumento'>) => tipos.find((t) => t.codigo === instrumento.tipo)?.nombre ?? ''
          return (
            <ul className="grilla">
              {[...instrumentos]
                .sort((a, b) => compararTextos(a.ticker, b.ticker))
                .map((instrumento) => {
                  const propios = datosPropios(instrumento, detalles)
                  return (
                    <li key={instrumento.id}>
                      <Link to={rutaDeInstrumento(instrumento.id)} className="tarjeta tarjeta-enlace">
                        <span className="tarjeta-titulo">{instrumento.ticker}</span>
                        <span>{instrumento.nombre}</span>
                        <span className="tarjeta-detalle">{`${tipo(instrumento)} · ${NOMBRE_DE_MONEDA[instrumento.moneda]}`}</span>
                        {instrumento.vencimiento && (
                          <span className="tarjeta-detalle">{`Vence el ${formatearFecha(instrumento.vencimiento)}`}</span>
                        )}
                        {propios && <span className="tarjeta-detalle">{propios}</span>}
                      </Link>
                    </li>
                  )
                })}
            </ul>
          )
        }}
      </Carga>
    </>
  )
}

export function NuevoInstrumento() {
  const cargado = useListas({ tipos: 'tipo_instrumento' })
  const { guardarInstrumento } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo="Nuevo instrumento" volver={volverALaLista} />
      <Carga cargado={cargado}>
        {({ tipos }) => (
          <Formulario
            clave="instrumento-nuevo"
            inicial={{ tipo: '', ticker: '', nombre: '', moneda: '', vencimiento: '', ...SIN_DATOS_PROPIOS }}
            validar={validar}
            guardar={async (valores) => {
              await guardarInstrumento(datosDe(valores))
            }}
            alGuardar={() => navegar(RUTAS.instrumentos)}
          >
            <CamposDeInstrumento tipos={tipos} />
          </Formulario>
        )}
      </Carga>
    </>
  )
}

export function EditarInstrumento() {
  const { id = '' } = useParams()
  const cargado = useListas({
    instrumentos: 'instrumento',
    tipos: 'tipo_instrumento',
    personas: 'persona',
    ...DETALLES,
  })
  const { guardarInstrumento, borrar } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo="Editar instrumento" volver={volverALaLista} />
      <Carga cargado={cargado}>
        {({ instrumentos, tipos, personas, fci, cedear, on }) => {
          const instrumento = instrumentos.find((i) => i.id === id)
          if (!instrumento) {
            return (
              <p role="alert" className="formulario-error">
                {MENSAJE_NO_SE_ENCONTRO}
              </p>
            )
          }
          const delFci = fci.find((d) => d.instrumento_id === id)
          const delCedear = cedear.find((d) => d.instrumento_id === id)
          const deLaOn = on.find((d) => d.instrumento_id === id)
          // En formato argentino, que es lo que lee el formulario.
          const comoTexto = (numero: number | null | undefined) => (numero == null ? '' : formatearCantidad(numero))
          return (
            <div className="detalle">
              <Formulario
                key={instrumento.id}
                clave={`instrumento-${instrumento.id}`}
                inicial={{
                  tipo: instrumento.tipo,
                  ticker: instrumento.ticker,
                  nombre: instrumento.nombre,
                  moneda: instrumento.moneda,
                  vencimiento: instrumento.vencimiento ?? '',
                  codigo_cafci: delFci?.codigo_cafci ?? '',
                  ratio: comoTexto(delCedear?.ratio),
                  subyacente: delCedear?.subyacente ?? '',
                  emisor: deLaOn?.emisor ?? '',
                  valor_nominal_residual: comoTexto(deLaOn?.valor_nominal_residual),
                }}
                validar={validar}
                guardar={async (valores) => {
                  await guardarInstrumento(datosDe(valores), instrumento.id)
                }}
                alGuardar={() => navegar(RUTAS.instrumentos)}
              >
                <CamposDeInstrumento tipos={tipos} />
              </Formulario>
              <Autoria fila={instrumento} personas={personas} />
              <Borrar
                pregunta={`¿Borrar ${instrumento.ticker}?`}
                borrar={() => borrar('instrumento', instrumento.id)}
                alBorrar={() => navegar(RUTAS.instrumentos)}
              />
            </div>
          )
        }}
      </Carga>
    </>
  )
}
