import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Monto } from './Monto.tsx'
import { Rendimiento } from './Rendimiento.tsx'
import { ValorActual } from './ValorActual.tsx'

// Intl separa el símbolo del número con un espacio duro (U+00A0).
const texto = (elemento: HTMLElement) => elemento.textContent?.replace(/ /g, ' ')

// Reloj fijo: 3 de noviembre de 2026.
const reloj = new Date(2026, 10, 3, 10, 0)

describe('ValorActual', () => {
  it('muestra el valor con su moneda y la fecha del valor (C34)', () => {
    const { container } = render(<ValorActual valor="345000" moneda="ARS" fecha="2026-11-02" reloj={reloj} />)
    expect(texto(container)).toBe('$ 345.000,00Valor al 02/11')
  })

  it('sin precio dice "Sin precio" y nunca $ 0 (C37, regla 5)', () => {
    const { container } = render(<ValorActual valor={null} moneda="ARS" fecha={null} reloj={reloj} />)
    expect(texto(container)).toBe('Sin precio')
    expect(texto(container)).not.toMatch(/0,00/)
  })

  it('un valor de hace más de 7 días se marca como desactualizado, junto a su fecha (C38)', () => {
    const { container, getByText } = render(
      <ValorActual valor="1530" moneda="USD" fecha="2026-10-14" reloj={reloj} />,
    )
    expect(texto(container)).toBe('US$ 1.530,00Valor al 14/10 · desactualizado')
    expect(getByText(/desactualizado/)).toHaveClass('valor-desactualizado')
  })

  it('un valor de otro año muestra el año, así no parece de ayer', () => {
    const { container } = render(<ValorActual valor="1530" moneda="USD" fecha="2025-11-02" reloj={reloj} />)
    expect(texto(container)).toBe('US$ 1.530,00Valor al 02/11/2025 · desactualizado')
  })

  it('un valor de hace 7 días todavía no está desactualizado', () => {
    const { container } = render(<ValorActual valor="1530" moneda="USD" fecha="2026-10-27" reloj={reloj} />)
    expect(texto(container)).not.toMatch(/desactualizado/)
  })

  it('un total parcial dice cuántos instrumentos no tienen precio (C41)', () => {
    const uno = render(<ValorActual valor="1100" moneda="ARS" fecha={null} sinPrecio={1} />)
    expect(texto(uno.container)).toBe('$ 1.100,00Parcial: 1 instrumento sin precio')
    uno.unmount()
    const varios = render(<ValorActual valor={null} moneda="ARS" fecha={null} sinPrecio={3} />)
    expect(texto(varios.container)).toBe('Sin precioParcial: 3 instrumentos sin precio')
  })
})

describe('Rendimiento (C42)', () => {
  it('si gana, va en verde con su signo, en monto y en porcentaje', () => {
    const { container } = render(<Rendimiento monto="97297.5" fraccion="0.39280" moneda="ARS" />)
    expect(texto(container)).toBe('+$ 97.297,50 (+39,3%)')
    expect(container.firstElementChild).toHaveClass('rendimiento-gana')
  })

  it('si pierde, va en rojo con su signo', () => {
    const { container } = render(<Rendimiento monto={-21} fraccion={-0.0698} moneda="USD" />)
    expect(texto(container)).toBe('-US$ 21,00 (-7%)')
    expect(container.firstElementChild).toHaveClass('rendimiento-pierde')
  })

  it('en cero no tiene color', () => {
    const { container } = render(<Rendimiento monto={0} fraccion={0} moneda="ARS" />)
    expect(container.firstElementChild).not.toHaveClass('rendimiento-gana')
    expect(container.firstElementChild).not.toHaveClass('rendimiento-pierde')
  })

  it('lo que se redondea a cero centavos tampoco tiene color, porque se lee sin signo', () => {
    for (const monto of ['0.004', '-0.004']) {
      const { container, unmount } = render(<Rendimiento monto={monto} fraccion="0.00001" moneda="ARS" />)
      expect(texto(container)).toMatch(/^\$ 0,00/)
      expect(container.firstElementChild).not.toHaveClass('rendimiento-gana')
      expect(container.firstElementChild).not.toHaveClass('rendimiento-pierde')
      unmount()
    }
  })

  it('sin precio o con un total parcial no se muestra', () => {
    const { container } = render(<Rendimiento monto={null} fraccion={null} moneda="ARS" />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('la regla 5 en los tipos', () => {
  it('Monto no acepta un valor que puede faltar', () => {
    const valor: number | null = null
    // @ts-expect-error: un valor que puede faltar va con ValorActual, que dice "Sin precio". Si Monto lo aceptara, falla el typecheck.
    const sinPrecio = <Monto valor={valor} moneda="ARS" />
    expect(sinPrecio).toBeDefined()
  })
})
