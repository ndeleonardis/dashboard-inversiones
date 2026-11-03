// Pesaje: la carga de todos juntos, como se hace en la realidad (C50). Una
// fecha y un renglón por cada integrante activo. Quien no se pesó queda vacío
// y no se guarda. Cada renglón se valida antes de enviar, así el error dice en
// cuál está (C51, C52). La base guarda todo o nada.
import { useId } from 'react'
import { Link, useNavigate } from 'react-router'
import { Campo } from '../../componentes/Campo.tsx'
import { Carga } from '../../componentes/Carga.tsx'
import { Encabezado } from '../../componentes/Encabezado.tsx'
import { Formulario, useFormulario, type Errores, type Valores } from '../../componentes/Formulario.tsx'
import { useCambios, useListas } from '../../datos/consultas.ts'
import { ErrorDeLaApp, MENSAJES_DE_COLUMNA, MENSAJES_DE_RESTRICCION } from '../../datos/errores.ts'
import type { Fila, PesoParaGuardar } from '../../datos/repositorio.ts'
import { esFutura, hoy } from '../../dominio/fechas.ts'
import { porNombre } from '../../dominio/nombres.ts'
import { leerPeso } from '../../dominio/pesaje.ts'
import { RUTAS, rutaDePesaje } from '../../rutas.ts'

type Integrante = Fila<'pesaje_integrante'>
type Pesaje = Fila<'pesaje'>

export const MENSAJE_FECHA_FUTURA = 'La fecha no puede ser posterior a hoy'
const MENSAJE_SIN_PESOS = 'Cargá al menos un peso'
const MENSAJE_OBSERVACIONES_SIN_PESO = 'Poné el peso, o borrá las observaciones'
const MENSAJE_REPETIDO = MENSAJES_DE_RESTRICCION.pesaje_integrante_fecha_unico?.mensaje

const campoDePeso = (id: string) => `peso:${id}`
const campoDeObservaciones = (id: string) => `observaciones:${id}`

const pesajeDelDia = (pesajes: Pesaje[], integranteId: string, fecha: string) =>
  pesajes.find((p) => p.pesaje_integrante_id === integranteId && p.fecha === fecha)

/** La fecha, y el peso de cada renglón con algo escrito. */
function validarCon(integrantes: Integrante[], pesajes: Pesaje[]) {
  return (valores: Valores): Errores => {
    const fecha = valores.fecha ?? ''
    const errores: Errores = {
      fecha: !fecha ? MENSAJES_DE_COLUMNA.fecha : esFutura(fecha) ? MENSAJE_FECHA_FUTURA : undefined,
    }
    for (const { id } of integrantes) {
      const peso = valores[campoDePeso(id)]?.trim() ?? ''
      const observaciones = valores[campoDeObservaciones(id)]?.trim() ?? ''
      if (!peso) {
        if (observaciones) errores[campoDePeso(id)] = MENSAJE_OBSERVACIONES_SIN_PESO
        continue
      }
      const leido = leerPeso(peso)
      if (!leido.ok) errores[campoDePeso(id)] = leido.error
      else if (pesajeDelDia(pesajes, id, fecha)) errores[campoDePeso(id)] = MENSAJE_REPETIDO
    }
    return errores
  }
}

function pesosDe(integrantes: Integrante[], valores: Valores): PesoParaGuardar[] {
  return integrantes.flatMap(({ id }) => {
    const leido = leerPeso(valores[campoDePeso(id)] ?? '')
    if (!leido.ok) return []
    return [{ pesaje_integrante_id: id, peso: leido.valor, observaciones: valores[campoDeObservaciones(id)]?.trim() || null }]
  })
}

function RenglonDePesaje({ integrante, pesajes }: { integrante: Integrante; pesajes: Pesaje[] }) {
  const { valores, errores } = useFormulario()
  const idTitulo = useId()
  const repetido = errores[campoDePeso(integrante.id)] === MENSAJE_REPETIDO
  const existente = repetido ? pesajeDelDia(pesajes, integrante.id, valores.fecha ?? '') : undefined

  return (
    <fieldset className="renglon-pesaje" aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className="renglon-pesaje-titulo">
        {integrante.nombre}
      </h2>
      <Campo
        nombre={campoDePeso(integrante.id)}
        etiqueta={`Peso de ${integrante.nombre}`}
        ayuda="En kilogramos, por ejemplo 57,30. Vacío si no se pesó"
        inputMode="decimal"
        autoComplete="off"
      />
      {existente && (
        <Link to={rutaDePesaje(existente.id)} className="renglon-pesaje-enlace">
          Editar el pesaje de ese día
        </Link>
      )}
      <Campo
        nombre={campoDeObservaciones(integrante.id)}
        etiqueta={`Observaciones de ${integrante.nombre}`}
        autoComplete="off"
      />
    </fieldset>
  )
}

export function CargarPesaje() {
  const cargado = useListas({ integrantes: 'pesaje_integrante', pesajes: 'pesaje' })
  const { guardarPesajes } = useCambios()
  const navegar = useNavigate()

  return (
    <>
      <Encabezado titulo="Cargar pesaje" volver={{ a: RUTAS.pesaje, texto: 'Pesaje' }} />
      <Carga cargado={cargado}>
        {({ integrantes, pesajes }) => {
          const activos = porNombre(integrantes.filter((i) => i.activo))
          if (activos.length === 0) {
            return (
              <p className="nota">
                No hay nadie en la lista. <Link to={RUTAS.pesajeIntegranteNuevo}>Agregá a quien se pesa</Link>.
              </p>
            )
          }
          const inicial: Valores = Object.fromEntries([
            ['fecha', hoy()],
            ...activos.flatMap(({ id }) => [
              [campoDePeso(id), ''],
              [campoDeObservaciones(id), ''],
            ]),
          ])
          return (
            <Formulario
              clave="pesaje-nuevo"
              inicial={inicial}
              validar={validarCon(activos, pesajes)}
              guardar={async (valores) => {
                const pesos = pesosDe(activos, valores)
                if (pesos.length === 0) throw new ErrorDeLaApp(MENSAJE_SIN_PESOS)
                await guardarPesajes(valores.fecha!, pesos)
              }}
              alGuardar={() => navegar(RUTAS.pesaje)}
            >
              <Campo nombre="fecha" etiqueta="Fecha" type="date" max={hoy()} />
              {activos.map((integrante) => (
                <RenglonDePesaje key={integrante.id} integrante={integrante} pesajes={pesajes} />
              ))}
            </Formulario>
          )
        }}
      </Carga>
    </>
  )
}
