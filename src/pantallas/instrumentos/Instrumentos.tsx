// Instrumentos: la especie exacta que se opera (C8). El ticker define la
// moneda: AAPL en pesos y AAPLD en dólares son dos instrumentos. Una ON
// necesita vencimiento, y los demás tipos no lo llevan (C9).
import { Link, useNavigate, useParams } from 'react-router'
import { Autoria } from '../../componentes/Autoria.tsx'
import { Borrar } from '../../componentes/Borrar.tsx'
import { Campo } from '../../componentes/Campo.tsx'
import { Carga } from '../../componentes/Carga.tsx'
import { Encabezado } from '../../componentes/Encabezado.tsx'
import { Formulario, useFormulario, type Errores, type Valores } from '../../componentes/Formulario.tsx'
import { useCambios, useListas } from '../../datos/consultas.ts'
import { MENSAJE_NO_SE_ENCONTRO, MENSAJES_DE_COLUMNA, MENSAJES_DE_RESTRICCION } from '../../datos/errores.ts'
import type { Fila } from '../../datos/repositorio.ts'
import { formatearFecha } from '../../dominio/formato.ts'
import { NOMBRE_DE_MONEDA, OPCIONES_DE_MONEDA, type Moneda } from '../../dominio/moneda.ts'
import { compararTextos, porNombre } from '../../dominio/nombres.ts'
import { RUTAS, rutaDeInstrumento } from '../../rutas.ts'

// El código fijo de la ON en tipo_instrumento. Las reglas de la base lo usan.
const ON = 'ON'

const volverALaLista = { a: RUTAS.instrumentos, texto: 'Instrumentos' }

type ValoresDeInstrumento = { tipo: string; ticker: string; nombre: string; moneda: string; vencimiento: string }

function validar(valores: Valores): Errores {
  const falta = (campo: string) => (valores[campo]?.trim() ? undefined : MENSAJES_DE_COLUMNA[campo])
  const sinVencimiento = valores.tipo === ON && !valores.vencimiento
  return {
    tipo: falta('tipo'),
    ticker: falta('ticker'),
    nombre: falta('nombre'),
    moneda: falta('moneda'),
    vencimiento: sinVencimiento ? MENSAJES_DE_RESTRICCION.instrumento_on_con_vencimiento?.mensaje : undefined,
  }
}

function datosDe({ tipo, ticker, nombre, moneda, vencimiento }: ValoresDeInstrumento) {
  return {
    tipo,
    ticker: ticker.trim(),
    nombre: nombre.trim(),
    moneda: moneda as Moneda,
    // Si se eligió ON y después otro tipo, la fecha que quedó escrita no va.
    vencimiento: tipo === ON ? vencimiento : null,
  }
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
    </>
  )
}

export function ListaDeInstrumentos() {
  const cargado = useListas({ instrumentos: 'instrumento', tipos: 'tipo_instrumento' })

  return (
    <>
      <Encabezado titulo="Instrumentos" accion={{ a: RUTAS.instrumentoNuevo, texto: 'Nuevo instrumento' }} />
      <Carga cargado={cargado}>
        {({ instrumentos, tipos }) => {
          if (instrumentos.length === 0) return <p className="vacio">Todavía no hay instrumentos cargados.</p>
          const tipo = (instrumento: Fila<'instrumento'>) => tipos.find((t) => t.codigo === instrumento.tipo)?.nombre ?? ''
          return (
            <ul className="grilla">
              {[...instrumentos]
                .sort((a, b) => compararTextos(a.ticker, b.ticker))
                .map((instrumento) => (
                  <li key={instrumento.id}>
                    <Link to={rutaDeInstrumento(instrumento.id)} className="tarjeta tarjeta-enlace">
                      <span className="tarjeta-titulo">{instrumento.ticker}</span>
                      <span>{instrumento.nombre}</span>
                      <span className="tarjeta-detalle">{`${tipo(instrumento)} · ${NOMBRE_DE_MONEDA[instrumento.moneda]}`}</span>
                      {instrumento.vencimiento && (
                        <span className="tarjeta-detalle">{`Vence el ${formatearFecha(instrumento.vencimiento)}`}</span>
                      )}
                    </Link>
                  </li>
                ))}
            </ul>
          )
        }}
      </Carga>
    </>
  )
}

export function NuevoInstrumento() {
  const cargado = useListas({ tipos: 'tipo_instrumento' })
  const { crear } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo="Nuevo instrumento" volver={volverALaLista} />
      <Carga cargado={cargado}>
        {({ tipos }) => (
          <Formulario
            clave="instrumento-nuevo"
            inicial={{ tipo: '', ticker: '', nombre: '', moneda: '', vencimiento: '' }}
            validar={validar}
            guardar={async (valores) => {
              await crear('instrumento', datosDe(valores))
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
  const cargado = useListas({ instrumentos: 'instrumento', tipos: 'tipo_instrumento', personas: 'persona' })
  const { editar, borrar } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo="Editar instrumento" volver={volverALaLista} />
      <Carga cargado={cargado}>
        {({ instrumentos, tipos, personas }) => {
          const instrumento = instrumentos.find((i) => i.id === id)
          if (!instrumento) {
            return (
              <p role="alert" className="formulario-error">
                {MENSAJE_NO_SE_ENCONTRO}
              </p>
            )
          }
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
                }}
                validar={validar}
                guardar={async (valores) => {
                  await editar('instrumento', instrumento.id, datosDe(valores))
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
