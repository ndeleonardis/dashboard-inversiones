import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ALTO, GraficoDePeso, MARGEN } from './GraficoDePeso.tsx'

const puntos = (container: HTMLElement) => [...container.querySelectorAll<SVGCircleElement>('circle.grafico-punto')]
const alturas = (container: HTMLElement) => puntos(container).map((punto) => Number(punto.getAttribute('cy')))

const SEMANAS = [
  { fecha: '2026-10-04', peso: 4.35 },
  { fecha: '2026-10-11', peso: 4.4 },
  { fecha: '2026-10-25', peso: 4.1 },
]

describe('GraficoDePeso (C58)', () => {
  it('dibuja un punto por pesaje, unidos por una línea, con el objetivo como etiqueta', () => {
    const { container } = render(<GraficoDePeso nombre="Mascota de ejemplo" objetivo="bajar" pesajes={SEMANAS} />)
    expect(puntos(container)).toHaveLength(3)
    expect(container.querySelector('path.grafico-linea')).not.toBeNull()
    expect(screen.getByText('Objetivo: bajar')).toBeInTheDocument()
  })

  it('sin objetivo lo dice igual', () => {
    render(<GraficoDePeso nombre="Mascota de ejemplo" objetivo="ninguno" pesajes={SEMANAS} />)
    expect(screen.getByText('Sin objetivo')).toBeInTheDocument()
  })

  it('una semana sin pesaje no se dibuja: no hay punto para ella ni ningún punto en cero', () => {
    const { container } = render(<GraficoDePeso nombre="Mascota" objetivo="bajar" pesajes={SEMANAS} />)
    expect(puntos(container).map((p) => p.dataset.fecha)).toEqual(['2026-10-04', '2026-10-11', '2026-10-25'])
    for (const y of alturas(container)) {
      expect(y).toBeGreaterThanOrEqual(MARGEN.arriba)
      expect(y).toBeLessThanOrEqual(ALTO - MARGEN.abajo)
    }
  })

  it('la escala va entre el mínimo y el máximo de quien se pesó: 30 gramos se notan', () => {
    const { container } = render(<GraficoDePeso nombre="Mascota" objetivo="bajar" pesajes={SEMANAS} />)
    const [, maximo, minimo] = alturas(container)
    const altoDelDibujo = ALTO - MARGEN.arriba - MARGEN.abajo
    expect(minimo! - maximo!).toBeGreaterThan(altoDelDibujo * 0.6)
  })

  it('la separación entre fechas respeta el tiempo: la semana que falta deja su hueco', () => {
    const { container } = render(<GraficoDePeso nombre="Mascota" objetivo="bajar" pesajes={SEMANAS} />)
    const [x1, x2, x3] = puntos(container).map((p) => Number(p.getAttribute('cx')))
    expect(x3! - x2!).toBeCloseTo(2 * (x2! - x1!), 5)
  })

  it('con un solo pesaje muestra el punto, sin línea', () => {
    const { container } = render(
      <GraficoDePeso nombre="Mascota" objetivo="subir" pesajes={[{ fecha: '2026-10-04', peso: 30.1 }]} />,
    )
    expect(puntos(container)).toHaveLength(1)
    expect(container.querySelector('path.grafico-linea')).toBeNull()
  })

  it('el orden de llegada no importa: se dibuja por fecha', () => {
    const { container } = render(<GraficoDePeso nombre="Mascota" objetivo="bajar" pesajes={[...SEMANAS].reverse()} />)
    expect(puntos(container).map((p) => p.dataset.fecha)).toEqual(['2026-10-04', '2026-10-11', '2026-10-25'])
  })

  it('se describe en texto para quien no ve el gráfico', () => {
    render(<GraficoDePeso nombre="Mascota de ejemplo" objetivo="bajar" pesajes={SEMANAS} />)
    expect(
      screen.getByRole('img', { name: 'Peso de Mascota de ejemplo: de 4,35 kg el 04/10/2026 a 4,10 kg el 25/10/2026' }),
    ).toBeInTheDocument()
  })

  it('mide su lugar aunque al principio no tenga pesajes para dibujar', () => {
    class ObservadorFalso {
      constructor(private avisar: ResizeObserverCallback) {}
      observe() {
        this.avisar([{ contentRect: { width: 640 } } as ResizeObserverEntry], this as unknown as ResizeObserver)
      }
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ObservadorFalso)
    try {
      const { container, rerender } = render(<GraficoDePeso nombre="Mascota" objetivo="bajar" pesajes={[]} />)
      rerender(<GraficoDePeso nombre="Mascota" objetivo="bajar" pesajes={SEMANAS} />)
      expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(`0 0 640 ${ALTO}`)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('al pasar por un punto con el teclado, muestra su peso y su fecha', () => {
    const { container } = render(<GraficoDePeso nombre="Mascota" objetivo="bajar" pesajes={SEMANAS} />)
    fireEvent.focus(puntos(container)[1]!)
    expect(screen.getByRole('status').textContent).toBe('4,40 kg · 11/10/2026')
  })
})
