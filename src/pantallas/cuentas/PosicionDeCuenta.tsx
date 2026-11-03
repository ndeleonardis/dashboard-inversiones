// Lo que tiene una cuenta de cada instrumento, cuánto costó y cuánto vale hoy,
// en la moneda de cada instrumento (C12, C34). Costo, valor y rendimiento los
// calcula la base, así que acá solo se muestran. Sin precio, el valor dice
// "Sin precio" y nunca $ 0 (C37, regla 5).
import { useId } from 'react'
import { Link } from 'react-router'
import { Carga } from '../../componentes/Carga.tsx'
import { Monto } from '../../componentes/Monto.tsx'
import { Rendimiento } from '../../componentes/Rendimiento.tsx'
import { ValorActual } from '../../componentes/ValorActual.tsx'
import { useListas } from '../../datos/consultas.ts'
import { formatearCantidad } from '../../dominio/formato.ts'
import { compararTextos } from '../../dominio/nombres.ts'
import { rutaDeInstrumento, rutaDeNuevaOperacion, rutaDeOperacionesFiltradas } from '../../rutas.ts'

export function PosicionDeCuenta({ cuentaId }: { cuentaId: string }) {
  const cargado = useListas({ posiciones: 'posicion', instrumentos: 'instrumento' })
  const idTitulo = useId()

  return (
    <section className="seccion" aria-labelledby={idTitulo}>
      <div className="seccion-titulo">
        <h2 id={idTitulo}>Posición</h2>
        <Link to={rutaDeNuevaOperacion(cuentaId)} className="boton boton-secundario">
          Nueva operación
        </Link>
      </div>
      <Carga cargado={cargado}>
        {({ posiciones, instrumentos }) => {
          const filas = posiciones
            .filter((posicion) => posicion.cuenta_id === cuentaId)
            .map((posicion) => ({ ...posicion, instrumento: instrumentos.find((i) => i.id === posicion.instrumento_id) }))
            .sort((a, b) => compararTextos(a.instrumento?.ticker ?? '', b.instrumento?.ticker ?? ''))
          if (filas.length === 0) return <p className="vacio">Sin inversiones en esta cuenta.</p>
          return (
            <div className="tarjeta">
              <table className="tabla" aria-labelledby={idTitulo}>
                <thead>
                  <tr>
                    <th scope="col">Instrumento</th>
                    <th scope="col" className="numero">
                      Cantidad
                    </th>
                    <th scope="col" className="numero">
                      Costo
                    </th>
                    <th scope="col" className="numero">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila) => (
                    <tr key={fila.instrumento_id}>
                      <td>
                        <Link
                          to={rutaDeOperacionesFiltradas({ cuenta: cuentaId, instrumento: fila.instrumento_id })}
                          className="tabla-titulo"
                          aria-label={`Ver las operaciones de ${fila.instrumento?.ticker ?? ''}`}
                        >
                          {fila.instrumento?.ticker}
                        </Link>
                        <span className="tabla-detalle">{fila.instrumento?.nombre}</span>
                      </td>
                      <td className="numero">{formatearCantidad(fila.cantidad)}</td>
                      <td className="numero">
                        <Monto valor={fila.costo} moneda={fila.moneda} />
                      </td>
                      {/* El rendimiento va debajo del valor: cinco columnas no entran en el celular. */}
                      <td className="numero celda-valor">
                        <ValorActual valor={fila.valor} moneda={fila.moneda} fecha={fila.fecha_valor} />
                        {fila.sin_codigo_cafci && (
                          <Link to={rutaDeInstrumento(fila.instrumento_id)} className="tabla-detalle">
                            Falta el código CAFCI
                          </Link>
                        )}
                        <Rendimiento monto={fila.rendimiento} fraccion={fila.rendimiento_pct} moneda={fila.moneda} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="tabla-nota">
                Costo de compra con precio promedio, con las comisiones. Valor con el último precio conocido.
              </p>
            </div>
          )
        }}
      </Carga>
    </section>
  )
}
