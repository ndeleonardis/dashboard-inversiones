import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VariacionDePeso } from './VariacionDePeso.tsx'

const variacion = (container: HTMLElement) => container.querySelector('.variacion-peso')!

describe('VariacionDePeso', () => {
  it('muestra la variación con signo y flecha (C56)', () => {
    const { container } = render(<VariacionDePeso variacion="0.3" objetivo="ninguno" />)
    expect(variacion(container).textContent).toBe('↑+0,30 kg')
    const { container: baja } = render(<VariacionDePeso variacion={-0.15} objetivo="ninguno" />)
    expect(variacion(baja).textContent).toBe('↓-0,15 kg')
  })

  it('la flecha es decorativa: el signo ya lo dice', () => {
    const { container } = render(<VariacionDePeso variacion="0.3" objetivo="ninguno" />)
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('↑')
  })

  it('sin pesaje anterior dice "Primer pesaje" y nunca 0,00 kg (C56)', () => {
    const { container } = render(<VariacionDePeso variacion={null} objetivo="bajar" />)
    expect(container.textContent).toBe('Primer pesaje')
    expect(variacion(container)).toHaveClass('variacion-neutra')
  })

  it('con objetivo bajar, bajar es bueno y subir es malo (C62)', () => {
    expect(variacion(render(<VariacionDePeso variacion="-0.15" objetivo="bajar" />).container)).toHaveClass('variacion-buena')
    expect(variacion(render(<VariacionDePeso variacion="0.3" objetivo="bajar" />).container)).toHaveClass('variacion-mala')
  })

  it('con objetivo subir, al revés (C62)', () => {
    expect(variacion(render(<VariacionDePeso variacion="0.3" objetivo="subir" />).container)).toHaveClass('variacion-buena')
    expect(variacion(render(<VariacionDePeso variacion="-0.15" objetivo="subir" />).container)).toHaveClass('variacion-mala')
  })

  it('sin objetivo, o si el peso no cambió, va en neutro y sin flecha (C62)', () => {
    expect(variacion(render(<VariacionDePeso variacion="0.3" objetivo="ninguno" />).container)).toHaveClass('variacion-neutra')
    const { container } = render(<VariacionDePeso variacion="0" objetivo="bajar" />)
    expect(variacion(container)).toHaveClass('variacion-neutra')
    expect(variacion(container).textContent).toBe('0,00 kg')
  })
})
