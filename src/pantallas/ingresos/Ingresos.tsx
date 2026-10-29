// Ingresos: lista de a un mes, alta, edición y baja. Todo ingreso es de una
// persona, y la cuenta donde se cobró es opcional (C17). Se lee de a un mes,
// porque la API corta en 1.000 filas.
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
import { compararTextos, nombreDeCuenta, nombreDeCuentaConDueno, porNombre } from '../../dominio/nombres.ts'
import { RUTAS, rutaDeIngreso, rutaDelMes } from '../../rutas.ts'
import {
  CampoDeDescripcion,
  CamposDeMonto,
  confirmarFecha,
  datosDeMovimiento,
  masNuevosPrimero,
  validarMovimiento,
  valoresDeMovimiento,
  type ValoresDeMovimiento,
} from '../movimientos.tsx'

const volverALaLista = { a: RUTAS.ingresos, texto: 'Ingresos' }

type ValoresDeIngreso = ValoresDeMovimiento & { tipo_ingreso_id: string; persona_id: string; cuenta_id: string }

function validar(valores: Valores): Errores {
  const falta = (campo: string) => (valores[campo] ? undefined : MENSAJES_DE_COLUMNA[campo])
  return { tipo_ingreso_id: falta('tipo_ingreso_id'), persona_id: falta('persona_id'), ...validarMovimiento(valores) }
}

function datosDe(valores: ValoresDeIngreso) {
  return {
    ...datosDeMovimiento(valores),
    tipo_ingreso_id: valores.tipo_ingreso_id,
    persona_id: valores.persona_id,
    cuenta_id: valores.cuenta_id || null,
  }
}

type Catalogos = { personas: Fila<'persona'>[]; cuentas: Fila<'cuenta'>[]; tipos: Fila<'tipo_ingreso'>[] }

function CamposDeIngreso({ personas, cuentas, tipos }: Catalogos) {
  const opciones = (filas: { id: string; nombre: string }[]) =>
    porNombre(filas).map((fila) => ({ valor: fila.id, texto: fila.nombre }))
  const opcionesDeCuenta = cuentas
    .map((cuenta) => ({ valor: cuenta.id, texto: nombreDeCuentaConDueno(cuenta, personas) }))
    .sort((a, b) => compararTextos(a.texto, b.texto))
  return (
    <>
      <Campo nombre="tipo_ingreso_id" etiqueta="Categoría" opciones={opciones(tipos)} sinElegir="Elegí la categoría" />
      <Campo nombre="persona_id" etiqueta="Persona" opciones={opciones(personas)} sinElegir="Elegí quién lo cobró" />
      <CamposDeMonto />
      <Campo
        nombre="cuenta_id"
        etiqueta="Cuenta donde se cobró (opcional)"
        opciones={opcionesDeCuenta}
        sinElegir="Sin cuenta"
      />
      <CampoDeDescripcion />
    </>
  )
}

export function ListaDeIngresos() {
  const [mes, cambiarMes] = useMesDeLaRuta()
  const cargado = useListas({
    ingresos: delMes('ingreso', mes),
    personas: 'persona',
    cuentas: 'cuenta',
    tipos: 'tipo_ingreso',
  })

  return (
    <>
      <Encabezado titulo="Ingresos" accion={{ a: RUTAS.ingresoNuevo, texto: 'Nuevo ingreso' }} />
      <SelectorDeMes mes={mes} alCambiar={cambiarMes} />
      <Carga cargado={cargado}>
        {({ ingresos, personas, cuentas, tipos }) => {
          if (ingresos.length === 0) return <p className="vacio">{`No hay ingresos en ${formatearMes(mes)}.`}</p>
          const categoria = (i: Fila<'ingreso'>) => tipos.find((t) => t.id === i.tipo_ingreso_id)?.nombre ?? ''
          const persona = (i: Fila<'ingreso'>) => personas.find((p) => p.id === i.persona_id)?.nombre ?? ''
          const cuenta = (i: Fila<'ingreso'>) => cuentas.find((c) => c.id === i.cuenta_id)
          return (
            <ul className="grilla">
              {masNuevosPrimero(ingresos).map((ingreso) => {
                const cobradoEn = cuenta(ingreso)
                return (
                  <li key={ingreso.id}>
                    <Link to={rutaDeIngreso(ingreso.id)} className="tarjeta tarjeta-enlace">
                      <span className="tarjeta-titulo">{categoria(ingreso)}</span>
                      <span className="tarjeta-monto">
                        <Monto valor={ingreso.monto} moneda={ingreso.moneda} />
                      </span>
                      <span className="tarjeta-detalle">{`${formatearFecha(ingreso.fecha)} · ${persona(ingreso)}`}</span>
                      {cobradoEn && <span className="tarjeta-detalle">{`Cobrado en ${nombreDeCuenta(cobradoEn)}`}</span>}
                      {ingreso.descripcion && <span className="tarjeta-detalle">{ingreso.descripcion}</span>}
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

const CATALOGOS = { personas: 'persona', cuentas: 'cuenta', tipos: 'tipo_ingreso' } as const

export function NuevoIngreso() {
  const cargado = useListas(CATALOGOS)
  const { crear } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo="Nuevo ingreso" volver={volverALaLista} />
      <Carga cargado={cargado}>
        {(catalogos) =>
          catalogos.personas.length === 0 ? (
            <p className="vacio">
              Para cargar un ingreso, primero cargá a quién lo cobra. <Link to={RUTAS.personaNueva}>Nueva persona</Link>
            </p>
          ) : (
            <Formulario
              clave="ingreso-nuevo"
              inicial={{
                tipo_ingreso_id: '',
                // Con una sola persona, ya queda elegida.
                persona_id: catalogos.personas.length === 1 ? catalogos.personas[0]!.id : '',
                moneda: '',
                monto: '',
                fecha: hoy(),
                cuenta_id: '',
                descripcion: '',
              }}
              validar={validar}
              confirmar={confirmarFecha()}
              guardar={async (valores) => {
                await crear('ingreso', datosDe(valores))
              }}
              alGuardar={({ fecha }) => navegar(rutaDelMes(RUTAS.ingresos, fecha))}
            >
              <CamposDeIngreso {...catalogos} />
            </Formulario>
          )
        }
      </Carga>
    </>
  )
}

export function EditarIngreso() {
  const { id = '' } = useParams()
  const cargadoIngreso = useFila('ingreso', id)
  const cargado = useListas(CATALOGOS)
  const { editar, borrar } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo="Editar ingreso" volver={volverALaLista} />
      <Carga cargado={cargado}>
        {(catalogos) => (
          <Carga cargado={cargadoIngreso}>
            {(ingreso) => {
              if (!ingreso) {
                return (
                  <p role="alert" className="formulario-error">
                    {MENSAJE_NO_SE_ENCONTRO}
                  </p>
                )
              }
              return (
                <div className="detalle">
                  <Formulario
                    key={ingreso.id}
                    clave={`ingreso-${ingreso.id}`}
                    inicial={{
                      tipo_ingreso_id: ingreso.tipo_ingreso_id,
                      persona_id: ingreso.persona_id,
                      ...valoresDeMovimiento(ingreso),
                      cuenta_id: ingreso.cuenta_id ?? '',
                    }}
                    validar={validar}
                    confirmar={confirmarFecha(ingreso.fecha)}
                    guardar={async (valores) => {
                      await editar('ingreso', ingreso.id, datosDe(valores))
                    }}
                    alGuardar={({ fecha }) => navegar(rutaDelMes(RUTAS.ingresos, fecha))}
                  >
                    <CamposDeIngreso {...catalogos} />
                  </Formulario>
                  <Autoria fila={ingreso} personas={catalogos.personas} />
                  <Borrar
                    pregunta={`¿Borrar el ingreso del ${formatearFecha(ingreso.fecha)}?`}
                    borrar={() => borrar('ingreso', ingreso.id)}
                    alBorrar={() => navegar(rutaDelMes(RUTAS.ingresos, ingreso.fecha))}
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
