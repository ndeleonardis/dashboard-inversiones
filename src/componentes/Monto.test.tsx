import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MONEDAS } from '../dominio/moneda.ts'
import { Monto } from './Monto.tsx'

// Intl separa el símbolo del número con un espacio duro (U+00A0).
const texto = (elemento: HTMLElement) => elemento.textContent?.replace(/ /g, ' ')

describe('Monto (C24)', () => {
  it('muestra los pesos con su moneda', () => {
    const { container } = render(<Monto valor={25291.5} moneda="ARS" />)
    expect(texto(container)).toBe('$ 25.291,50')
  })

  it('muestra los dólares con su moneda', () => {
    const { container } = render(<Monto valor="25291.5" moneda="USD" />)
    expect(texto(container)).toBe('US$ 25.291,50')
  })

  it('toda moneda de la app se muestra con su símbolo', () => {
    for (const moneda of MONEDAS) {
      const { container, unmount } = render(<Monto valor={10} moneda={moneda} />)
      expect(texto(container)).toMatch(/^(\$|US\$) 10,00$/)
      unmount()
    }
  })

  it('un monto sin moneda no compila', () => {
    // @ts-expect-error: la moneda es obligatoria. Si deja de serlo, falla el typecheck.
    const sinMoneda = <Monto valor={10} />
    expect(sinMoneda).toBeDefined()
  })
})
