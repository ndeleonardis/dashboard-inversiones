// Vista Resumen / home (T5). Responde "¿cuánto tenemos?" y "¿cuánto tengo?".
// Orden: total familiar (combinado) → cada titular → desglose por cuenta/broker.
// Totales SIEMPRE separados por moneda; nunca se suman ARS y USD.
import { porCuenta, titulares, totalCombinado, totalPorTitular } from '../data'
import type { Moneda, Titular } from '../types'
import { formatMoneda, nombreMoneda } from '../format'

const MONEDAS: Moneda[] = ['ARS', 'USD']

/** Par de cifras (Pesos / Dólares) para un titular o el combinado. */
function MontosPorMoneda({ montos }: { montos: (m: Moneda) => number }) {
  return (
    <div className="montos">
      {MONEDAS.map((m) => (
        <div className="monto" key={m}>
          <span className="monto-etq">{nombreMoneda(m)}</span>
          <span className="monto-cifra">{formatMoneda(montos(m), m)}</span>
        </div>
      ))}
    </div>
  )
}

function TarjetaTitular({ titular }: { titular: Titular }) {
  return (
    <article className="tarjeta tarjeta-titular">
      <h3>{titular}</h3>
      <MontosPorMoneda montos={(m) => totalPorTitular(titular, m)} />
    </article>
  )
}

function CuentasDeTitular({ titular }: { titular: Titular }) {
  return (
    <div className="grupo-cuentas">
      <h4>{titular}</h4>
      <ul className="lista-cuentas">
        {porCuenta(titular).map((c) => (
          <li className="cuenta" key={c.id}>
            <span className="cuenta-nombre">{c.nombre}</span>
            <span className="cuenta-montos">
              {c.saldos.map((s) => (
                <span className="cuenta-monto" key={s.moneda}>
                  {formatMoneda(s.monto, s.moneda)}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Resumen() {
  return (
    <section className="resumen">
      <article className="tarjeta hero">
        <h2>Total familiar</h2>
        <MontosPorMoneda montos={(m) => totalCombinado(m)} />
      </article>

      <div className="grid-titulares">
        {titulares.map((t) => (
          <TarjetaTitular titular={t} key={t} />
        ))}
      </div>

      <section className="cuentas">
        <h3 className="titulo-seccion">Cuentas y brokers</h3>
        {titulares.map((t) => (
          <CuentasDeTitular titular={t} key={t} />
        ))}
      </section>
    </section>
  )
}
