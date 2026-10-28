import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Autoria } from './Autoria.tsx'

// Momentos en hora local, como los muestra la app.
const el26alas1805 =new Date(2026, 9, 26, 18, 5).toISOString()
const el27alas0930 = new Date(2026, 9, 27, 9, 30).toISOString()

const personas = [
  { nombre: 'Ana', email: 'ana@example.com' },
  { nombre: 'Beto', email: 'beto@example.com' },
  { nombre: 'Caro', email: null },
]

describe('Autoria (C27)', () => {
  it('dice quién cargó la fila, con el nombre de la persona, y cuándo', () => {
    const fila = { creado_por: 'ana@example.com', creado_en: el26alas1805, modificado_por: null, modificado_en: null }
    render(<Autoria fila={fila} personas={personas} />)
    expect(screen.getByText('Cargado por Ana el 26/10/2026 18:05')).toBeInTheDocument()
    expect(screen.queryByText(/Modificado/)).not.toBeInTheDocument()
  })

  it('si alguien la modificó, también dice quién y cuándo', () => {
    const fila = {
      creado_por: 'ana@example.com',
      creado_en: el26alas1805,
      modificado_por: 'beto@example.com',
      modificado_en: el27alas0930,
    }
    render(<Autoria fila={fila} personas={personas} />)
    expect(screen.getByText('Cargado por Ana el 26/10/2026 18:05')).toBeInTheDocument()
    expect(screen.getByText('Modificado por Beto el 27/10/2026 09:30')).toBeInTheDocument()
  })

  it('si el email ya no es de ninguna persona, muestra el email', () => {
    const fila = { creado_por: 'dani@example.com', creado_en: el26alas1805, modificado_por: null, modificado_en: null }
    render(<Autoria fila={fila} personas={personas} />)
    expect(screen.getByText('Cargado por dani@example.com el 26/10/2026 18:05')).toBeInTheDocument()
  })

  it('lo cargado desde el panel de Supabase no tiene autor, y lo dice sin inventarlo', () => {
    const fila = { creado_por: null, creado_en: el26alas1805, modificado_por: null, modificado_en: null }
    render(<Autoria fila={fila} personas={personas} />)
    expect(screen.getByText('Cargado el 26/10/2026 18:05')).toBeInTheDocument()
  })
})
