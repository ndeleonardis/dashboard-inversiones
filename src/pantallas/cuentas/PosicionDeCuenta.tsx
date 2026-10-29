// Lo que tiene una cuenta de cada instrumento y cuánto costó, en la moneda de
// cada instrumento (C12). La calcula la base con precio promedio, así que acá
// solo se muestra. No hay valor actual: los precios llegan en la v2 (regla 5).
import { useId } from 'react'
import { Link } from 'react-router'
import { Carga } from '../../componentes/Carga.tsx'
import { Monto } from '../../componentes/Monto.tsx'
import { useListas } from '../../datos/consultas.ts'
import { formatearCantidad } from '../../dominio/formato.ts'
import { compararTextos } from '../../dominio/nombres.ts'
import { rutaDeNuevaOperacion } from '../../rutas.ts'

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
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila) => (
                    <tr key={fila.instrumento_id}>
                      <td>
                        <span className="tabla-titulo">{fila.instrumento?.ticker}</span>
                        <span className="tabla-detalle">{fila.instrumento?.nombre}</span>
                      </td>
                      <td className="numero">{formatearCantidad(fila.cantidad)}</td>
                      <td className="numero">
                        <Monto valor={fila.costo} moneda={fila.moneda} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="tabla-nota">Costo de compra con precio promedio, con las comisiones.</p>
            </div>
          )
        }}
      </Carga>
    </section>
  )
}
