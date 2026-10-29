// Gastos: lista de a un mes, alta, edición y baja. Un gasto sin persona es
// comunitario (C16). Se lee de a un mes, porque la API corta en 1.000 filas.
import { Link, useNavigate, useParams } from 'react-router'
import { Autoria } from '../../componentes/Autoria.tsx'
import { Borrar } from '../../componentes/Borrar.tsx'
import { Campo } from '../../componentes/Campo.tsx'
import { Carga } from '../../componentes/Carga.tsx'
import { Encabezado } from '../../componentes/Encabezado.tsx'
import { Formulario, type Errores, type Valores } from '../../componentes/Formulario.tsx'
import { Monto } from '../../componentes/Monto.tsx'
import { SelectorDeMes, useMesDeLaRuta } from '../../componentes/SelectorDeMes.tsx'
import { delMes, useCambios, useFila, useListas } from '../../datos/consultas.ts'
import { MENSAJE_NO_SE_ENCONTRO, MENSAJES_DE_COLUMNA } from '../../datos/errores.ts'
import type { Fila } from '../../datos/repositorio.ts'
import { hoy } from '../../dominio/fechas.ts'
import { formatearFecha, formatearMes } from '../../dominio/formato.ts'
import { porNombre } from '../../dominio/nombres.ts'
import { RUTAS, rutaDeGasto, rutaDelMes } from '../../rutas.ts'
import {
  CampoDeDescripcion,
  CamposDeMonto,
  COMUNITARIO,
  confirmarFecha,
  datosDeMovimiento,
  masNuevosPrimero,
  validarMovimiento,
  valoresDeMovimiento,
  type ValoresDeMovimiento,
} from '../movimientos.tsx'

const volverALaLista = { a: RUTAS.gastos, texto: 'Gastos' }

type ValoresDeGasto = ValoresDeMovimiento & { tipo_gasto_id: string; persona_id: string }

function validar(valores: Valores): Errores {
  return {
    tipo_gasto_id: valores.tipo_gasto_id ? undefined : MENSAJES_DE_COLUMNA.tipo_gasto_id,
    ...validarMovimiento(valores),
  }
}

function datosDe(valores: ValoresDeGasto) {
  return {
    ...datosDeMovimiento(valores),
    tipo_gasto_id: valores.tipo_gasto_id,
    // Sin persona, es de todo el grupo.
    persona_id: valores.persona_id || null,
  }
}

type Catalogos = { personas: Fila<'persona'>[]; tipos: Fila<'tipo_gasto'>[] }

function CamposDeGasto({ personas, tipos }: Catalogos) {
  const opciones = (filas: { id: string; nombre: string }[]) =>
    porNombre(filas).map((fila) => ({ valor: fila.id, texto: fila.nombre }))
  return (
    <>
      <Campo nombre="tipo_gasto_id" etiqueta="Categoría" opciones={opciones(tipos)} sinElegir="Elegí la categoría" />
      <CamposDeMonto />
      <Campo
        nombre="persona_id"
        etiqueta="Persona (opcional)"
        opciones={opciones(personas)}
        sinElegir={COMUNITARIO}
        ayuda="Sin persona, el gasto es de todo el grupo"
      />
      <CampoDeDescripcion />
    </>
  )
}

export function ListaDeGastos() {
  const [mes, cambiarMes] = useMesDeLaRuta()
  const cargado = useListas({ gastos: delMes('gasto', mes), personas: 'persona', tipos: 'tipo_gasto' })

  return (
    <>
      <Encabezado titulo="Gastos" accion={{ a: RUTAS.gastoNuevo, texto: 'Nuevo gasto' }} />
      <SelectorDeMes mes={mes} alCambiar={cambiarMes} />
      <Carga cargado={cargado}>
        {({ gastos, personas, tipos }) => {
          if (gastos.length === 0) return <p className="vacio">{`No hay gastos en ${formatearMes(mes)}.`}</p>
          const categoria = (g: Fila<'gasto'>) => tipos.find((t) => t.id === g.tipo_gasto_id)?.nombre ?? ''
          const persona = (g: Fila<'gasto'>) => personas.find((p) => p.id === g.persona_id)?.nombre ?? COMUNITARIO
          return (
            <ul className="grilla">
              {masNuevosPrimero(gastos).map((gasto) => (
                <li key={gasto.id}>
                  <Link to={rutaDeGasto(gasto.id)} className="tarjeta tarjeta-enlace">
                    <span className="tarjeta-titulo">{categoria(gasto)}</span>
                    <span className="tarjeta-monto">
                      <Monto valor={gasto.monto} moneda={gasto.moneda} />
                    </span>
                    <span className="tarjeta-detalle">{`${formatearFecha(gasto.fecha)} · ${persona(gasto)}`}</span>
                    {gasto.descripcion && <span className="tarjeta-detalle">{gasto.descripcion}</span>}
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

export function NuevoGasto() {
  const cargado = useListas({ personas: 'persona', tipos: 'tipo_gasto' })
  const { crear } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo="Nuevo gasto" volver={volverALaLista} />
      <Carga cargado={cargado}>
        {(catalogos) => (
          <Formulario
            clave="gasto-nuevo"
            inicial={{ tipo_gasto_id: '', moneda: '', monto: '', fecha: hoy(), persona_id: '', descripcion: '' }}
            validar={validar}
            confirmar={confirmarFecha()}
            guardar={async (valores) => {
              await crear('gasto', datosDe(valores))
            }}
            alGuardar={({ fecha }) => navegar(rutaDelMes(RUTAS.gastos, fecha))}
          >
            <CamposDeGasto {...catalogos} />
          </Formulario>
        )}
      </Carga>
    </>
  )
}

export function EditarGasto() {
  const { id = '' } = useParams()
  const cargadoGasto = useFila('gasto', id)
  const cargado = useListas({ personas: 'persona', tipos: 'tipo_gasto' })
  const { editar, borrar } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo="Editar gasto" volver={volverALaLista} />
      <Carga cargado={cargado}>
        {(catalogos) => (
          <Carga cargado={cargadoGasto}>
            {(gasto) => {
              if (!gasto) {
                return (
                  <p role="alert" className="formulario-error">
                    {MENSAJE_NO_SE_ENCONTRO}
                  </p>
                )
              }
              return (
                <div className="detalle">
                  <Formulario
                    key={gasto.id}
                    clave={`gasto-${gasto.id}`}
                    inicial={{
                      tipo_gasto_id: gasto.tipo_gasto_id,
                      ...valoresDeMovimiento(gasto),
                      persona_id: gasto.persona_id ?? '',
                    }}
                    validar={validar}
                    confirmar={confirmarFecha(gasto.fecha)}
                    guardar={async (valores) => {
                      await editar('gasto', gasto.id, datosDe(valores))
                    }}
                    alGuardar={({ fecha }) => navegar(rutaDelMes(RUTAS.gastos, fecha))}
                  >
                    <CamposDeGasto {...catalogos} />
                  </Formulario>
                  <Autoria fila={gasto} personas={catalogos.personas} />
                  <Borrar
                    pregunta={`¿Borrar el gasto del ${formatearFecha(gasto.fecha)}?`}
                    borrar={() => borrar('gasto', gasto.id)}
                    alBorrar={() => navegar(rutaDelMes(RUTAS.gastos, gasto.fecha))}
                  />
                </div>
              )
            }}
          </Carga>
        )}
      </Carga>
    </>
  )
}
