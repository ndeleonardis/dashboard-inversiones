// La evolución del peso de alguien (C58). Una sola serie, en la tinta de la
// marca. La escala vertical va del mínimo al máximo de esa persona o mascota,
// así 30 gramos de un gato se notan tanto como medio kilo de una persona. El
// eje horizontal respeta el tiempo: una semana sin pesaje deja su hueco y nunca
// se dibuja como cero. El objetivo va como etiqueta, sin colorear la línea.
// El dibujo mide lo mismo que su lugar en la pantalla, así las letras no se
// agrandan en la notebook.
import { useCallback, useState, type PointerEvent } from 'react'
import { formatearDiaYMes, formatearFecha, formatearPeso } from '../dominio/formato.ts'
import { etiquetaDeObjetivo } from '../dominio/pesaje.ts'

/** El ancho hasta que se mide el lugar, y el que queda donde no se puede medir. */
export const ANCHO = 320
export const ALTO = 160
export const MARGEN = { arriba: 16, abajo: 24, izquierda: 64, derecha: 16 }

type PesajeDelGrafico = { fecha: string; peso: number | string }

type PropsGraficoDePeso = { nombre: string; objetivo: string; pesajes: PesajeDelGrafico[] }

const dias = (fecha: string) => {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number)
  return Date.UTC(anio!, mes! - 1, dia!) / 86_400_000
}

export function GraficoDePeso({ nombre, objetivo, pesajes }: PropsGraficoDePeso) {
  const ordenados = [...pesajes]
    .map((p) => ({ fecha: p.fecha.slice(0, 10), peso: Number(p.peso) }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  const [activo, setActivo] = useState<number | null>(null)
  const [ancho, setAncho] = useState(ANCHO)
  // Se mide cuando aparece el lugar, que puede ser después del primer dibujo
  // si al principio no había pesajes.
  const lienzo = useCallback((elemento: HTMLDivElement | null) => {
    if (!elemento || typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(([entrada]) => {
      const medido = Math.round(entrada?.contentRect.width ?? 0)
      if (medido > 0) setAncho(medido)
    })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  if (ordenados.length === 0) return null

  const pesos = ordenados.map((p) => p.peso)
  const minimo = Math.min(...pesos)
  const maximo = Math.max(...pesos)
  // Un poco de aire arriba y abajo. Si siempre pesó lo mismo, medio kilo.
  const aire = maximo === minimo ? 0.5 : Math.max((maximo - minimo) * 0.1, 0.05)
  const desde = minimo - aire
  const hasta = maximo + aire

  const primerDia = dias(ordenados[0]!.fecha)
  const totalDias = dias(ordenados.at(-1)!.fecha) - primerDia
  const anchoDelDibujo = ancho - MARGEN.izquierda - MARGEN.derecha
  const altoDelDibujo = ALTO - MARGEN.arriba - MARGEN.abajo
  const x = (fecha: string) =>
    totalDias === 0 ? MARGEN.izquierda + anchoDelDibujo / 2 : MARGEN.izquierda + ((dias(fecha) - primerDia) / totalDias) * anchoDelDibujo
  const y = (peso: number) => MARGEN.arriba + ((hasta - peso) / (hasta - desde)) * altoDelDibujo

  const linea = ordenados.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.fecha)},${y(p.peso)}`).join(' ')
  const primero = ordenados[0]!
  const ultimo = ordenados.at(-1)!
  const mostrado = ordenados[activo ?? ordenados.length - 1]!

  // El puntero busca la fecha más cercana: nadie tiene que apuntarle a una línea de 2 px.
  const alMoverElPuntero = (evento: PointerEvent<SVGSVGElement>) => {
    const caja = evento.currentTarget.getBoundingClientRect()
    if (caja.width === 0) return
    const enElDibujo = ((evento.clientX - caja.left) / caja.width) * ancho
    const cercano = ordenados.reduce(
      (mejor, p, i) => (Math.abs(x(p.fecha) - enElDibujo) < Math.abs(x(ordenados[mejor]!.fecha) - enElDibujo) ? i : mejor),
      0,
    )
    setActivo(cercano)
  }

  return (
    <figure className="grafico-peso">
      <figcaption className="grafico-encabezado">
        <span className="grafico-titulo">{nombre}</span>
        <span className="pildora">{etiquetaDeObjetivo(objetivo)}</span>
      </figcaption>
      <p role="status" className="grafico-lectura">
        <strong>{formatearPeso(mostrado.peso)}</strong> · {formatearFecha(mostrado.fecha)}
      </p>
      <div ref={lienzo} className="grafico-lienzo">
        <svg
          viewBox={`0 0 ${ancho} ${ALTO}`}
          role="img"
          aria-label={`Peso de ${nombre}: de ${formatearPeso(primero.peso)} el ${formatearFecha(primero.fecha)} a ${formatearPeso(ultimo.peso)} el ${formatearFecha(ultimo.fecha)}`}
          onPointerMove={alMoverElPuntero}
          onPointerLeave={() => setActivo(null)}
        >
          {[minimo, maximo].filter((valor, i) => i === 0 || valor !== minimo).map((valor) => (
            <g key={valor} className="grafico-guia">
              <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(valor)} y2={y(valor)} />
              <text x={MARGEN.izquierda - 8} y={y(valor)} dy="0.35em" textAnchor="end">
                {formatearPeso(valor)}
              </text>
            </g>
          ))}
          <g className="grafico-fechas">
            <text x={x(primero.fecha)} y={ALTO - 6} textAnchor={totalDias === 0 ? 'middle' : 'start'}>
              {formatearDiaYMes(primero.fecha)}
            </text>
            {totalDias > 0 && (
              <text x={x(ultimo.fecha)} y={ALTO - 6} textAnchor="end">
                {formatearDiaYMes(ultimo.fecha)}
              </text>
            )}
          </g>
          {activo !== null && (
            <line
              className="grafico-cruz"
              x1={x(mostrado.fecha)}
              x2={x(mostrado.fecha)}
              y1={MARGEN.arriba}
              y2={ALTO - MARGEN.abajo}
            />
          )}
          {ordenados.length > 1 && <path className="grafico-linea" d={linea} />}
          {ordenados.map((p, i) => (
            <circle
              key={p.fecha}
              className="grafico-punto"
              data-fecha={p.fecha}
              data-activo={i === activo || undefined}
              cx={x(p.fecha)}
              cy={y(p.peso)}
              r={4}
              tabIndex={0}
              aria-label={`${formatearPeso(p.peso)} el ${formatearFecha(p.fecha)}`}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
            />
          ))}
        </svg>
      </div>
    </figure>
  )
}
