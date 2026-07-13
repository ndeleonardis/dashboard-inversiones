// Vista Detalle por tipo de activo (T6). Lista las tenencias ABIERTA de un tipo
// con los campos del Excel (ticker, cantidad, valor compra, valor actual,
// rendimiento) y el titular de cada una (§5.3, §5.4).
import { cuentaPorId, tenenciasPorTipo } from '../data'
import type { TipoActivo } from '../types'
import { ETIQUETA_TIPO } from '../activos'
import { formatCantidad, formatMoneda, formatPorcentaje } from '../format'

function claseRend(r: number): string {
  if (r > 0) return 'rend pos'
  if (r < 0) return 'rend neg'
  return 'rend'
}

export default function DetalleActivo({ tipo }: { tipo: TipoActivo }) {
  const tenencias = tenenciasPorTipo(tipo)

  return (
    <section className="detalle">
      <h2 className="titulo-seccion">{ETIQUETA_TIPO[tipo]}</h2>

      {tenencias.length === 0 ? (
        <p className="vacio">No hay posiciones abiertas de este tipo.</p>
      ) : (
        <ul className="lista-tenencias">
          {tenencias.map((t, i) => {
            const cuenta = cuentaPorId(t.cuentaId)
            return (
              <li className="tarjeta tenencia" key={`${t.ticker}-${i}`}>
                <div className="tenencia-cab">
                  <span className="ticker">{t.ticker}</span>
                  <span className={claseRend(t.rendimiento)}>
                    {formatPorcentaje(t.rendimiento)}
                  </span>
                </div>
                <div className="tenencia-meta">
                  <span className="chip">{t.titular}</span>
                  {cuenta && <span className="chip chip-suave">{cuenta.nombre}</span>}
                  <span className="chip chip-suave">{t.moneda}</span>
                </div>
                <dl className="tenencia-campos">
                  <div>
                    <dt>Cantidad</dt>
                    <dd>{formatCantidad(t.cantidad)}</dd>
                  </div>
                  <div>
                    <dt>Valor compra</dt>
                    <dd>{formatMoneda(t.valorCompra, t.moneda, 2)}</dd>
                  </div>
                  <div>
                    <dt>Valor actual</dt>
                    <dd>{formatMoneda(t.valorActual, t.moneda, 2)}</dd>
                  </div>
                </dl>
                {t.comentario && <p className="comentario">{t.comentario}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
