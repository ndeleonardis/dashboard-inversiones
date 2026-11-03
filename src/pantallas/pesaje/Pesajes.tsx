// Pesaje: el registro semanal de peso de personas y mascotas. Es un módulo
// opcional, fuera de lo financiero, que solo existe si la copia lo prende (C43).
// La tabla va con lo más reciente primero (C55), y la variación de cada uno es
// contra su propio pesaje anterior, así filtrar no la cambia (C57). Al filtrar
// por alguien aparece su gráfico (C58).
import { useId } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Carga } from '../../componentes/Carga.tsx'
import { Encabezado } from '../../componentes/Encabezado.tsx'
import { GraficoDePeso } from '../../componentes/GraficoDePeso.tsx'
import { VariacionDePeso } from '../../componentes/VariacionDePeso.tsx'
import { useListas } from '../../datos/consultas.ts'
import { formatearFecha, formatearPeso } from '../../dominio/formato.ts'
import { compararTextos, porNombre } from '../../dominio/nombres.ts'
import { RUTAS, rutaDePesaje } from '../../rutas.ts'

/** El filtro va en la dirección, así volver de un pesaje no lo pierde. */
function useQuien() {
  const [busqueda, setBusqueda] = useSearchParams()
  const quien = busqueda.get('quien') ?? ''
  const elegir = (id: string) => setBusqueda(id ? { quien: id } : {}, { replace: true })
  return [quien, elegir] as const
}

export function ListaDePesajes() {
  const cargado = useListas({ pesajes: 'pesaje_con_variacion', integrantes: 'pesaje_integrante' })
  const [quien, elegir] = useQuien()
  const idFiltro = useId()
  const idTabla = useId()

  return (
    <>
      <Encabezado titulo="Pesaje" accion={{ a: RUTAS.pesajeNuevo, texto: 'Cargar pesaje' }} />
      <p className="pesaje-acceso">
        <Link to={RUTAS.pesajeIntegrantes} className="boton boton-secundario">
          Quiénes se pesan
        </Link>
      </p>
      <Carga cargado={cargado}>
        {({ pesajes, integrantes }) => {
          if (pesajes.length === 0) {
            return (
              <p className="vacio">
                Todavía no hay pesajes cargados. <Link to={RUTAS.pesajeNuevo}>Cargar el primero</Link>
              </p>
            )
          }
          const elegido = integrantes.find((i) => i.id === quien)
          const visibles = pesajes
            .filter((p) => !quien || p.pesaje_integrante_id === quien)
            .sort((a, b) => b.fecha.localeCompare(a.fecha) || compararTextos(a.nombre, b.nombre))
          return (
            <>
              <div className="filtros" role="group" aria-label="Filtros">
                <div className="campo">
                  <label htmlFor={idFiltro}>Quién</label>
                  <select id={idFiltro} value={quien} onChange={(evento) => elegir(evento.target.value)}>
                    <option value="">Todos</option>
                    {porNombre(integrantes).map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.activo ? i.nombre : `${i.nombre} (desactivado)`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {elegido && <GraficoDePeso key={elegido.id} nombre={elegido.nombre} objetivo={elegido.objetivo} pesajes={visibles} />}
              {visibles.length === 0 ? (
                <p className="vacio">No hay pesajes de {elegido?.nombre ?? 'quien elegiste'}.</p>
              ) : (
                <section className="tarjeta">
                  <h2 id={idTabla} className="solo-lectores">
                    Pesajes
                  </h2>
                  <table className="tabla" aria-labelledby={idTabla}>
                    <thead>
                      <tr>
                        <th scope="col">Fecha</th>
                        <th scope="col">Quién</th>
                        <th scope="col" className="numero">
                          Peso
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.map((pesaje) => (
                        <tr key={pesaje.id}>
                          <td className="tabla-fecha">{formatearFecha(pesaje.fecha)}</td>
                          <td>
                            <Link to={rutaDePesaje(pesaje.id)} className="tabla-titulo">
                              {pesaje.nombre}
                            </Link>
                            {pesaje.observaciones && <span className="tabla-detalle">{pesaje.observaciones}</span>}
                          </td>
                          <td className="numero">
                            <div className="celda-valor">
                              <span>{formatearPeso(pesaje.peso)}</span>
                              <VariacionDePeso variacion={pesaje.variacion} objetivo={pesaje.objetivo} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
            </>
          )
        }}
      </Carga>
    </>
  )
}
