// Categorías de gastos y de ingresos: cada grupo agrega y renombra las suyas
// (C20). Gastos e ingresos apuntan a su categoría y no copian el nombre, así
// que al renombrarla lo ya cargado muestra el nombre nuevo. No se borran,
// porque lo ya cargado las usa.
import { useId } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Autoria } from '../../componentes/Autoria.tsx'
import { Campo } from '../../componentes/Campo.tsx'
import { Carga } from '../../componentes/Carga.tsx'
import { Encabezado } from '../../componentes/Encabezado.tsx'
import { Formulario, type Errores, type Valores } from '../../componentes/Formulario.tsx'
import { useCambios, useListas } from '../../datos/consultas.ts'
import { MENSAJE_NO_SE_ENCONTRO, MENSAJES_DE_COLUMNA, MENSAJES_DE_RESTRICCION } from '../../datos/errores.ts'
import { porNombre } from '../../dominio/nombres.ts'
import { RUTAS, rutaDeCategoria, rutaDeNuevaCategoria, type ClaseDeCategoria } from '../../rutas.ts'

const TABLA = { gastos: 'tipo_gasto', ingresos: 'tipo_ingreso' } as const

const volverALaLista = { a: RUTAS.categorias, texto: 'Categorías' }
const REPETIDA = MENSAJES_DE_RESTRICCION.tipo_gasto_nombre_unico?.mensaje

type Categoria = { id: string; nombre: string }

/** Pide el nombre y avisa antes de enviar si ya existe, con la misma regla que la base: sin mayúsculas ni espacios. */
function validarCon(categorias: Categoria[], propia?: string) {
  return (valores: Valores): Errores => {
    const nombre = valores.nombre?.trim().toLowerCase() ?? ''
    if (!nombre) return { nombre: MENSAJES_DE_COLUMNA.nombre }
    const repetida = categorias.some((c) => c.id !== propia && c.nombre.trim().toLowerCase() === nombre)
    return { nombre: repetida ? REPETIDA : undefined }
  }
}

function SeccionDeCategorias({ clase, categorias }: { clase: ClaseDeCategoria; categorias: Categoria[] }) {
  const idTitulo = useId()
  return (
    <section className="seccion" aria-labelledby={idTitulo}>
      <div className="seccion-titulo">
        <h2 id={idTitulo}>{`De ${clase}`}</h2>
        <Link to={rutaDeNuevaCategoria(clase)} className="boton boton-secundario">
          {`Nueva categoría de ${clase}`}
        </Link>
      </div>
      <ul className="grilla">
        {porNombre(categorias).map((categoria) => (
          <li key={categoria.id}>
            <Link to={rutaDeCategoria(clase, categoria.id)} className="tarjeta tarjeta-enlace">
              <span className="tarjeta-titulo">{categoria.nombre}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ListaDeCategorias() {
  const cargado = useListas({ gastos: TABLA.gastos, ingresos: TABLA.ingresos })

  return (
    <>
      <Encabezado titulo="Categorías" />
      <Carga cargado={cargado}>
        {({ gastos, ingresos }) => (
          <div className="columnas">
            <SeccionDeCategorias clase="gastos" categorias={gastos} />
            <SeccionDeCategorias clase="ingresos" categorias={ingresos} />
          </div>
        )}
      </Carga>
    </>
  )
}

export function NuevaCategoria({ clase }: { clase: ClaseDeCategoria }) {
  const tabla = TABLA[clase]
  const cargado = useListas({ categorias: tabla })
  const { crear } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo={`Nueva categoría de ${clase}`} volver={volverALaLista} />
      <Carga cargado={cargado}>
        {({ categorias }) => (
          <Formulario
            clave={`categoria-${clase}-nueva`}
            inicial={{ nombre: '' }}
            validar={validarCon(categorias)}
            guardar={async ({ nombre }) => {
              await crear(tabla, { nombre: nombre.trim() })
            }}
            alGuardar={() => navegar(RUTAS.categorias)}
          >
            <Campo nombre="nombre" etiqueta="Nombre" autoComplete="off" />
          </Formulario>
        )}
      </Carga>
    </>
  )
}

export function EditarCategoria({ clase }: { clase: ClaseDeCategoria }) {
  const { id = '' } = useParams()
  const tabla = TABLA[clase]
  const cargado = useListas({ categorias: tabla, personas: 'persona' })
  const { editar } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo={`Categoría de ${clase}`} volver={volverALaLista} />
      <Carga cargado={cargado}>
        {({ categorias, personas }) => {
          const categoria = categorias.find((c) => c.id === id)
          if (!categoria) {
            return (
              <p role="alert" className="formulario-error">
                {MENSAJE_NO_SE_ENCONTRO}
              </p>
            )
          }
          return (
            <div className="detalle">
              <Formulario
                key={categoria.id}
                clave={`categoria-${categoria.id}`}
                inicial={{ nombre: categoria.nombre }}
                validar={validarCon(categorias, categoria.id)}
                guardar={async ({ nombre }) => {
                  await editar(tabla, categoria.id, { nombre: nombre.trim() })
                }}
                alGuardar={() => navegar(RUTAS.categorias)}
              >
                <Campo
                  nombre="nombre"
                  etiqueta="Nombre"
                  ayuda={`Los ${clase} ya cargados con esta categoría van a mostrar el nombre nuevo`}
                  autoComplete="off"
                />
              </Formulario>
              <Autoria fila={categoria} personas={personas} />
              <p className="nota">Las categorías no se borran, porque lo ya cargado las usa.</p>
            </div>
          )
        }}
      </Carga>
    </>
  )
}
