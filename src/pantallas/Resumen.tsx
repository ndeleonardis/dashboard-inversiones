// El resumen, en dos bloques: cuánto quedó del mes para invertir, del grupo o
// de una persona (C21, C22, C25), y cuánto hay invertido a costo de compra,
// por persona y del grupo (C23). Abajo, los últimos movimientos (C26). Todo va
// por moneda: pesos y dólares nunca se suman (regla 2). Las cuentas las hace
// la base, y acá solo se muestran.
import { useId, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Carga } from '../componentes/Carga.tsx'
import { Encabezado } from '../componentes/Encabezado.tsx'
import { Monto } from '../componentes/Monto.tsx'
import { SelectorDeMes, useMesDeLaRuta } from '../componentes/SelectorDeMes.tsx'
import { useListas, useResumenMes } from '../datos/consultas.ts'
import type { Fila } from '../datos/repositorio.ts'
import { formatearFecha } from '../dominio/formato.ts'
import { MONEDAS, NOMBRE_DE_MONEDA, type Moneda } from '../dominio/moneda.ts'
import { porNombre } from '../dominio/nombres.ts'
import { rutaDeGasto, rutaDeIngreso } from '../rutas.ts'
import { COMUNITARIO, masNuevosPrimero } from './movimientos.tsx'

/** Pesos primero y dólares después, siempre en el mismo orden. */
function porMoneda<F extends { moneda: Moneda }>(filas: F[]): F[] {
  return [...filas].sort((a, b) => MONEDAS.indexOf(a.moneda) - MONEDAS.indexOf(b.moneda))
}

function Tarjeta({ titulo, children }: { titulo: string; children: ReactNode }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="tarjeta tarjeta-resumen">
      <h3 id={id}>{titulo}</h3>
      {children}
    </div>
  )
}

type PropsDato = { etiqueta: string; valor: number; moneda: Moneda; destacado?: boolean }

function Dato({ etiqueta, valor, moneda, destacado = false }: PropsDato) {
  return (
    <div className={destacado ? 'dato dato-destacado' : 'dato'}>
      <dt>{etiqueta}</dt>
      <dd>
        <Monto valor={valor} moneda={moneda} />
      </dd>
    </div>
  )
}

/** La persona elegida para el bloque del mes, en la dirección (?persona=…). Vacía es el grupo (C25). */
function usePersonaDeLaRuta(): [string, (persona: string) => void] {
  const [busqueda, setBusqueda] = useSearchParams()
  const elegir = (persona: string) =>
    setBusqueda(
      (actual) => {
        const siguiente = new URLSearchParams(actual)
        if (persona) siguiente.set('persona', persona)
        else siguiente.delete('persona')
        return siguiente
      },
      { replace: true },
    )
  return [busqueda.get('persona') ?? '', elegir]
}

type PropsSelectorDePersona = { personas: Fila<'persona'>[]; elegida: string; alElegir: (persona: string) => void }

/** El carrusel de DESIGN.md: una tarjeta por persona, y la elegida en negro. */
function SelectorDePersona({ personas, elegida, alElegir }: PropsSelectorDePersona) {
  const opciones = [{ id: '', nombre: 'Todo el grupo' }, ...porNombre(personas)]
  return (
    <div className="carrusel" role="group" aria-label="Ver el mes de">
      {opciones.map((persona) => (
        <button
          key={persona.id || 'grupo'}
          type="button"
          className="carrusel-tarjeta"
          aria-pressed={elegida === persona.id}
          onClick={() => alElegir(persona.id)}
        >
          {persona.nombre}
        </button>
      ))}
    </div>
  )
}

function BloqueDelMes() {
  const [mes, cambiarMes] = useMesDeLaRuta()
  const [persona, elegirPersona] = usePersonaDeLaRuta()
  const personas = useListas({ personas: 'persona' })
  const cargado = useResumenMes(mes, persona)
  const idTitulo = useId()

  return (
    <section aria-labelledby={idTitulo} className="seccion">
      <h2 id={idTitulo}>El mes</h2>
      {personas.estado === 'listo' && (
        <SelectorDePersona personas={personas.datos.personas} elegida={persona} alElegir={elegirPersona} />
      )}
      <SelectorDeMes mes={mes} alCambiar={cambiarMes} />
      {persona && <p className="seccion-nota">Sus ingresos y sus gastos, más los gastos comunitarios del grupo.</p>}
      <Carga cargado={cargado}>
        {(filas) => {
          const sinMovimientos = filas.every((fila) => Number(fila.ingresos) === 0 && Number(fila.gastos) === 0)
          return (
            <>
              {sinMovimientos && <p className="vacio">Sin movimientos este mes</p>}
              <div className="tarjetas-resumen">
                {porMoneda(filas).map((fila) => (
                  <Tarjeta key={fila.moneda} titulo={NOMBRE_DE_MONEDA[fila.moneda]}>
                    <dl>
                      <Dato etiqueta="Ingresos" valor={fila.ingresos} moneda={fila.moneda} />
                      {persona ? (
                        <>
                          <Dato etiqueta="Gastos propios" valor={fila.gastos_asignados} moneda={fila.moneda} />
                          <Dato etiqueta="Gastos comunitarios" valor={fila.gastos_comunitarios} moneda={fila.moneda} />
                        </>
                      ) : (
                        <Dato etiqueta="Gastos" valor={fila.gastos} moneda={fila.moneda} />
                      )}
                      <Dato etiqueta="Queda para invertir" valor={fila.queda} moneda={fila.moneda} destacado />
                    </dl>
                  </Tarjeta>
                ))}
              </div>
            </>
          )
        }}
      </Carga>
    </section>
  )
}

type InvertidoDePersona = { id: string; nombre: string; tieneInversiones: boolean; filas: Fila<'invertido_por_persona'>[] }

/** La vista trae una fila por persona y moneda. Acá se juntan las de cada persona. */
function porPersona(filas: Fila<'invertido_por_persona'>[]): InvertidoDePersona[] {
  const personas = new Map<string, InvertidoDePersona>()
  for (const fila of filas) {
    const persona = personas.get(fila.persona_id) ?? {
      id: fila.persona_id,
      nombre: fila.nombre,
      tieneInversiones: fila.tiene_inversiones,
      filas: [],
    }
    persona.filas.push(fila)
    personas.set(fila.persona_id, persona)
  }
  return porNombre([...personas.values()])
}

function Costos({ filas }: { filas: { moneda: Moneda; costo: number }[] }) {
  return (
    <dl>
      {porMoneda(filas).map((fila) => (
        <Dato key={fila.moneda} etiqueta={NOMBRE_DE_MONEDA[fila.moneda]} valor={fila.costo} moneda={fila.moneda} />
      ))}
    </dl>
  )
}

function BloqueDeInversiones() {
  const cargado = useListas({ personas: 'invertido_por_persona', grupo: 'invertido_grupo' })
  const idTitulo = useId()

  return (
    <section aria-labelledby={idTitulo} className="seccion">
      <h2 id={idTitulo}>Inversiones</h2>
      <p className="seccion-nota">A costo de compra. Los precios actuales llegan en otra versión.</p>
      <Carga cargado={cargado}>
        {({ personas, grupo }) => (
          <div className="tarjetas-resumen">
            <Tarjeta titulo="Todo el grupo">
              <Costos filas={grupo} />
            </Tarjeta>
            {porPersona(personas).map((persona) => (
              <Tarjeta key={persona.id} titulo={persona.nombre}>
                {persona.tieneInversiones ? (
                  <Costos filas={persona.filas} />
                ) : (
                  <p className="tarjeta-detalle">Sin inversiones</p>
                )}
              </Tarjeta>
            ))}
          </div>
        )}
      </Carga>
    </section>
  )
}

/** Los últimos gastos e ingresos cargados, del más nuevo al más viejo (C26). */
function BloqueDeMovimientos() {
  const cargado = useListas({ movimientos: 'ultimos_movimientos' })
  const idTitulo = useId()

  return (
    <section aria-labelledby={idTitulo} className="seccion movimientos">
      <h2 id={idTitulo}>Últimos movimientos</h2>
      <Carga cargado={cargado}>
        {({ movimientos }) =>
          movimientos.length === 0 ? (
            <p className="vacio">Todavía no hay gastos ni ingresos cargados.</p>
          ) : (
            <ul className="grilla">
              {masNuevosPrimero(movimientos).map((movimiento) => {
                const esIngreso = movimiento.clase === 'ingreso'
                return (
                  <li key={`${movimiento.clase}-${movimiento.id}`}>
                    <Link
                      to={esIngreso ? rutaDeIngreso(movimiento.id) : rutaDeGasto(movimiento.id)}
                      className="tarjeta tarjeta-enlace"
                    >
                      <span className="tarjeta-titulo">{movimiento.categoria}</span>
                      <span className="tarjeta-monto">
                        <Monto valor={movimiento.monto} moneda={movimiento.moneda} />
                      </span>
                      <span className="tarjeta-detalle">
                        {`${esIngreso ? 'Ingreso' : 'Gasto'} · ${formatearFecha(movimiento.fecha)} · ${movimiento.persona || COMUNITARIO}`}
                      </span>
                      {movimiento.descripcion && <span className="tarjeta-detalle">{movimiento.descripcion}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )
        }
      </Carga>
    </section>
  )
}

export function Resumen() {
  return (
    <>
      <Encabezado titulo="Resumen" />
      <div className="columnas">
        <BloqueDelMes />
        <BloqueDeInversiones />
      </div>
      <BloqueDeMovimientos />
    </>
  )
}
