// Pesaje: editar o borrar un peso cargado, por ejemplo uno que se anotó en el
// renglón equivocado. La tabla, la variación y el gráfico lo reflejan solos
// (C54). Quién se pesó no se cambia: se borra y se carga de nuevo.
import { useNavigate, useParams } from 'react-router'
import { Autoria } from '../../componentes/Autoria.tsx'
import { Borrar } from '../../componentes/Borrar.tsx'
import { Campo } from '../../componentes/Campo.tsx'
import { Carga } from '../../componentes/Carga.tsx'
import { Encabezado } from '../../componentes/Encabezado.tsx'
import { Formulario, type Errores, type Valores } from '../../componentes/Formulario.tsx'
import { useCambios, useListas } from '../../datos/consultas.ts'
import { ErrorDeLaApp, MENSAJE_NO_SE_ENCONTRO, MENSAJES_DE_COLUMNA, MENSAJES_DE_RESTRICCION } from '../../datos/errores.ts'
import type { Fila } from '../../datos/repositorio.ts'
import { esFutura, hoy } from '../../dominio/fechas.ts'
import { formatearCantidad } from '../../dominio/formato.ts'
import { leerPeso } from '../../dominio/pesaje.ts'
import { RUTAS } from '../../rutas.ts'
import { MENSAJE_FECHA_FUTURA } from './CargarPesaje.tsx'

type Pesaje = Fila<'pesaje'>

function validarCon(pesaje: Pesaje, pesajes: Pesaje[]) {
  return ({ fecha = '', peso = '' }: Valores): Errores => {
    const leido = leerPeso(peso)
    const repetido = pesajes.some(
      (p) => p.id !== pesaje.id && p.pesaje_integrante_id === pesaje.pesaje_integrante_id && p.fecha === fecha,
    )
    return {
      fecha: !fecha
        ? MENSAJES_DE_COLUMNA.fecha
        : esFutura(fecha)
          ? MENSAJE_FECHA_FUTURA
          : repetido
            ? MENSAJES_DE_RESTRICCION.pesaje_integrante_fecha_unico?.mensaje
            : undefined,
      peso: leido.ok ? undefined : peso.trim() ? leido.error : MENSAJES_DE_COLUMNA.peso,
    }
  }
}

export function EditarPesaje() {
  const { id = '' } = useParams()
  const cargado = useListas({ pesajes: 'pesaje', integrantes: 'pesaje_integrante', personas: 'persona' })
  const { editar, borrar } = useCambios()
  const navegar = useNavigate()
  const volver = { a: RUTAS.pesaje, texto: 'Pesaje' }

  return (
    <Carga cargado={cargado}>
      {({ pesajes, integrantes, personas }) => {
        const pesaje = pesajes.find((p) => p.id === id)
        if (!pesaje) {
          return (
            <>
              <Encabezado titulo="Pesaje" volver={volver} />
              <p role="alert" className="formulario-error">
                {MENSAJE_NO_SE_ENCONTRO}
              </p>
            </>
          )
        }
        const nombre = integrantes.find((i) => i.id === pesaje.pesaje_integrante_id)?.nombre ?? ''
        return (
          <>
            <Encabezado titulo={`Pesaje de ${nombre}`} volver={volver} />
            <div className="detalle">
              <Formulario
                key={pesaje.id}
                clave={`pesaje-${pesaje.id}`}
                inicial={{
                  fecha: pesaje.fecha,
                  peso: formatearCantidad(pesaje.peso),
                  observaciones: pesaje.observaciones ?? '',
                }}
                validar={validarCon(pesaje, pesajes)}
                guardar={async ({ fecha, peso, observaciones }) => {
                  const leido = leerPeso(peso)
                  if (!leido.ok) throw new ErrorDeLaApp(leido.error, 'peso')
                  await editar('pesaje', pesaje.id, { fecha, peso: leido.valor, observaciones: observaciones.trim() || null })
                }}
                alGuardar={() => navegar(RUTAS.pesaje)}
              >
                <Campo nombre="fecha" etiqueta="Fecha" type="date" max={hoy()} />
                <Campo nombre="peso" etiqueta="Peso" ayuda="En kilogramos, por ejemplo 57,30" inputMode="decimal" autoComplete="off" />
                <Campo nombre="observaciones" etiqueta="Observaciones" autoComplete="off" />
              </Formulario>
              <Autoria fila={pesaje} personas={personas} />
              <Borrar
                pregunta={`¿Borrar este pesaje de ${nombre}?`}
                borrar={() => borrar('pesaje', pesaje.id)}
                alBorrar={() => navegar(RUTAS.pesaje)}
              />
            </div>
          </>
        )
      }}
    </Carga>
  )
}
