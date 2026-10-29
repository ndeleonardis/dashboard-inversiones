// Cuentas bancarias, comitentes y billeteras: lista, alta, detalle con su
// posición, edición y baja. Toda cuenta tiene dueño, tipo y entidad (C6,
// regla 4), y no se borra si está en uso (C7).
import { useId } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Autoria } from '../../componentes/Autoria.tsx'
import { Borrar } from '../../componentes/Borrar.tsx'
import { Campo } from '../../componentes/Campo.tsx'
import { Carga } from '../../componentes/Carga.tsx'
import { Encabezado } from '../../componentes/Encabezado.tsx'
import { Formulario, type Errores, type Valores } from '../../componentes/Formulario.tsx'
import { useCambios, useListas } from '../../datos/consultas.ts'
import { MENSAJE_NO_SE_ENCONTRO, MENSAJES_DE_COLUMNA } from '../../datos/errores.ts'
import type { Fila } from '../../datos/repositorio.ts'
import { compararTextos, nombreDeCuenta, porNombre } from '../../dominio/nombres.ts'
import { RUTAS, rutaDeCuenta } from '../../rutas.ts'
import { PosicionDeCuenta } from './PosicionDeCuenta.tsx'

const volverALaLista = { a: RUTAS.cuentas, texto: 'Cuentas' }

type ValoresDeCuenta = { persona_id: string; tipo_cuenta_id: string; entidad: string; nombre: string }

function validar(valores: Valores): Errores {
  const falta = (campo: string) => (valores[campo]?.trim() ? undefined : MENSAJES_DE_COLUMNA[campo])
  return { persona_id: falta('persona_id'), tipo_cuenta_id: falta('tipo_cuenta_id'), entidad: falta('entidad') }
}

function datosDe({ persona_id, tipo_cuenta_id, entidad, nombre }: ValoresDeCuenta) {
  return { persona_id, tipo_cuenta_id, entidad: entidad.trim(), nombre: nombre.trim() || null }
}

type Catalogos = { personas: Fila<'persona'>[]; tipos: Fila<'tipo_cuenta'>[] }

function CamposDeCuenta({ personas, tipos }: Catalogos) {
  const opciones = (filas: { id: string; nombre: string }[]) =>
    porNombre(filas).map((fila) => ({ valor: fila.id, texto: fila.nombre }))
  return (
    <>
      <Campo nombre="persona_id" etiqueta="Dueño" opciones={opciones(personas)} sinElegir="Elegí a quién pertenece" />
      <Campo nombre="tipo_cuenta_id" etiqueta="Tipo" opciones={opciones(tipos)} sinElegir="Elegí el tipo" />
      <Campo nombre="entidad" etiqueta="Entidad" ayuda="El banco, broker o billetera" autoComplete="off" />
      <Campo
        nombre="nombre"
        etiqueta="Nombre (opcional)"
        ayuda="Sirve para distinguir dos cuentas de la misma entidad"
        autoComplete="off"
      />
    </>
  )
}

export function ListaDeCuentas() {
  const cargado = useListas({ cuentas: 'cuenta', personas: 'persona', tipos: 'tipo_cuenta' })

  return (
    <>
      <Encabezado titulo="Cuentas" accion={{ a: RUTAS.cuentaNueva, texto: 'Nueva cuenta' }} />
      <Carga cargado={cargado}>
        {({ cuentas, personas, tipos }) => {
          if (cuentas.length === 0) return <p className="vacio">Todavía no hay cuentas cargadas.</p>
          const dueno = (cuenta: Fila<'cuenta'>) => personas.find((p) => p.id === cuenta.persona_id)?.nombre ?? ''
          const tipo = (cuenta: Fila<'cuenta'>) => tipos.find((t) => t.id === cuenta.tipo_cuenta_id)?.nombre ?? ''
          const ordenadas = [...cuentas].sort(
            (a, b) => compararTextos(dueno(a), dueno(b)) || compararTextos(nombreDeCuenta(a), nombreDeCuenta(b)),
          )
          return (
            <ul className="grilla">
              {ordenadas.map((cuenta) => (
                <li key={cuenta.id}>
                  <Link to={rutaDeCuenta(cuenta.id)} className="tarjeta tarjeta-enlace">
                    <span className="tarjeta-titulo">{nombreDeCuenta(cuenta)}</span>
                    <span className="tarjeta-detalle">{tipo(cuenta)}</span>
                    <span className="tarjeta-detalle">De {dueno(cuenta)}</span>
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

export function NuevaCuenta() {
  const cargado = useListas({ personas: 'persona', tipos: 'tipo_cuenta' })
  const { crear } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo="Nueva cuenta" volver={volverALaLista} />
      <Carga cargado={cargado}>
        {({ personas, tipos }) =>
          personas.length === 0 ? (
            <p className="vacio">
              Para cargar una cuenta, primero cargá a su dueño. <Link to={RUTAS.personaNueva}>Nueva persona</Link>
            </p>
          ) : (
            <Formulario
              clave="cuenta-nueva"
              // Con una sola persona, el dueño ya queda elegido.
              inicial={{ persona_id: personas.length === 1 ? personas[0]!.id : '', tipo_cuenta_id: '', entidad: '', nombre: '' }}
              validar={validar}
              guardar={async (valores) => {
                await crear('cuenta', datosDe(valores))
              }}
              alGuardar={() => navegar(RUTAS.cuentas)}
            >
              <CamposDeCuenta personas={personas} tipos={tipos} />
            </Formulario>
          )
        }
      </Carga>
    </>
  )
}

/** El detalle de una cuenta: su posición (C12), sus datos para editar y borrarla. */
export function DetalleDeCuenta() {
  const { id = '' } = useParams()
  const cargado = useListas({ cuentas: 'cuenta', personas: 'persona', tipos: 'tipo_cuenta' })
  const { editar, borrar } = useCambios()
  const navegar = useNavigate()
  const idDatos = useId()
  const cuenta = cargado.estado === 'listo' ? cargado.datos.cuentas.find((c) => c.id === id) : undefined

  return (
    <>
      <Encabezado titulo={cuenta ? nombreDeCuenta(cuenta) : 'Cuenta'} volver={volverALaLista} />
      <Carga cargado={cargado}>
        {({ personas, tipos }) => {
          if (!cuenta) {
            return (
              <p role="alert" className="formulario-error">
                {MENSAJE_NO_SE_ENCONTRO}
              </p>
            )
          }
          return (
            <div className="detalle">
              <PosicionDeCuenta cuentaId={cuenta.id} />
              <section className="seccion" aria-labelledby={idDatos}>
                <h2 id={idDatos}>Datos de la cuenta</h2>
                <Formulario
                  key={cuenta.id}
                  clave={`cuenta-${cuenta.id}`}
                  inicial={{
                    persona_id: cuenta.persona_id,
                    tipo_cuenta_id: cuenta.tipo_cuenta_id,
                    entidad: cuenta.entidad,
                    nombre: cuenta.nombre ?? '',
                  }}
                  validar={validar}
                  guardar={async (valores) => {
                    await editar('cuenta', cuenta.id, datosDe(valores))
                  }}
                  alGuardar={() => navegar(RUTAS.cuentas)}
                >
                  <CamposDeCuenta personas={personas} tipos={tipos} />
                </Formulario>
              </section>
              <Autoria fila={cuenta} personas={personas} />
              <Borrar
                pregunta={`¿Borrar la cuenta ${nombreDeCuenta(cuenta)}?`}
                borrar={() => borrar('cuenta', cuenta.id)}
                alBorrar={() => navegar(RUTAS.cuentas)}
              />
            </div>
          )
        }}
      </Carga>
    </>
  )
}
