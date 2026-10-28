// Personas del grupo: lista, alta, edición y baja (C5, C7). Una persona entra a
// la app solo si tiene email, y el email lo carga quien administra la copia.
import { Link, useNavigate, useParams } from 'react-router'
import { Autoria } from '../../componentes/Autoria.tsx'
import { Borrar } from '../../componentes/Borrar.tsx'
import { Campo } from '../../componentes/Campo.tsx'
import { Carga } from '../../componentes/Carga.tsx'
import { Encabezado } from '../../componentes/Encabezado.tsx'
import { Formulario, type Errores, type Valores } from '../../componentes/Formulario.tsx'
import { useCambios, useListas } from '../../datos/consultas.ts'
import { MENSAJE_NO_SE_ENCONTRO, MENSAJES_DE_COLUMNA } from '../../datos/errores.ts'
import { porNombre } from '../../dominio/nombres.ts'
import { RUTAS, rutaDePersona } from '../../rutas.ts'

const volverALaLista = { a: RUTAS.personas, texto: 'Personas' }

function validar(valores: Valores): Errores {
  return { nombre: valores.nombre?.trim() ? undefined : MENSAJES_DE_COLUMNA.nombre }
}

export function ListaDePersonas() {
  const cargado = useListas({ personas: 'persona' })

  return (
    <>
      <Encabezado titulo="Personas" accion={{ a: RUTAS.personaNueva, texto: 'Nueva persona' }} />
      <Carga cargado={cargado}>
        {({ personas }) =>
          personas.length === 0 ? (
            <p className="vacio">Todavía no hay personas cargadas.</p>
          ) : (
            <ul className="grilla">
              {porNombre(personas).map((persona) => (
                <li key={persona.id}>
                  <Link to={rutaDePersona(persona.id)} className="tarjeta tarjeta-enlace">
                    <span className="tarjeta-titulo">{persona.nombre}</span>
                    {persona.email ? (
                      <span className="etiqueta">Entra a la app</span>
                    ) : (
                      <span className="tarjeta-detalle">No entra a la app</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )
        }
      </Carga>
    </>
  )
}

export function NuevaPersona() {
  const { crear } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo="Nueva persona" volver={volverALaLista} />
      <Formulario
        clave="persona-nueva"
        inicial={{ nombre: '' }}
        validar={validar}
        guardar={async ({ nombre }) => {
          await crear('persona', { nombre: nombre.trim() })
        }}
        alGuardar={() => navegar(RUTAS.personas)}
      >
        <Campo nombre="nombre" etiqueta="Nombre" autoComplete="off" />
      </Formulario>
      <p className="nota">Para que pueda entrar a la app, quien administra la copia carga su email.</p>
    </>
  )
}

export function EditarPersona() {
  const { id = '' } = useParams()
  const cargado = useListas({ personas: 'persona' })
  const { editar, borrar } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo="Editar persona" volver={volverALaLista} />
      <Carga cargado={cargado}>
        {({ personas }) => {
          const persona = personas.find((p) => p.id === id)
          if (!persona) {
            return (
              <p role="alert" className="formulario-error">
                {MENSAJE_NO_SE_ENCONTRO}
              </p>
            )
          }
          return (
            <div className="detalle">
              <Formulario
                key={persona.id}
                clave={`persona-${persona.id}`}
                inicial={{ nombre: persona.nombre }}
                validar={validar}
                guardar={async ({ nombre }) => {
                  await editar('persona', persona.id, { nombre: nombre.trim() })
                }}
                alGuardar={() => navegar(RUTAS.personas)}
              >
                <Campo nombre="nombre" etiqueta="Nombre" autoComplete="off" />
              </Formulario>
              <Autoria fila={persona} personas={personas} />
              {persona.email ? (
                // La base tampoco lo deja: así nadie se queda afuera por error.
                <p className="nota">Entra a la app. Para sacarla, pedíselo a quien administra la copia.</p>
              ) : (
                <Borrar
                  pregunta={`¿Borrar a ${persona.nombre}?`}
                  borrar={() => borrar('persona', persona.id)}
                  alBorrar={() => navegar(RUTAS.personas)}
                />
              )}
            </div>
          )
        }}
      </Carga>
    </>
  )
}
