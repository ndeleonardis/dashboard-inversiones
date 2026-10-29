// El resumen, en dos bloques: cuánto quedó del mes para invertir (C21, C22) y
// cuánto hay invertido a costo de compra, por persona y del grupo (C23). Todo
// va por moneda: pesos y dólares nunca se suman (regla 2). Las cuentas las
// hace la base, y acá solo se muestran.
import { useId, type ReactNode } from 'react'
import { Carga } from '../componentes/Carga.tsx'
import { Encabezado } from '../componentes/Encabezado.tsx'
import { Monto } from '../componentes/Monto.tsx'
import { SelectorDeMes, useMesDeLaRuta } from '../componentes/SelectorDeMes.tsx'
import { useListas, useResumenMes } from '../datos/consultas.ts'
import type { Fila } from '../datos/repositorio.ts'
import { MONEDAS, NOMBRE_DE_MONEDA, type Moneda } from '../dominio/moneda.ts'
import { porNombre } from '../dominio/nombres.ts'

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

function BloqueDelMes() {
  const [mes, cambiarMes] = useMesDeLaRuta()
  const cargado = useResumenMes(mes)
  const idTitulo = useId()

  return (
    <section aria-labelledby={idTitulo} className="seccion">
      <h2 id={idTitulo}>El mes</h2>
      <SelectorDeMes mes={mes} alCambiar={cambiarMes} />
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
                      <Dato etiqueta="Gastos" valor={fila.gastos} moneda={fila.moneda} />
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

export function Resumen() {
  return (
    <>
      <Encabezado titulo="Resumen" />
      <div className="columnas">
        <BloqueDelMes />
        <BloqueDeInversiones />
      </div>
    </>
  )
}
