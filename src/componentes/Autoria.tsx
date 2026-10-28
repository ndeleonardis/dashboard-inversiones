// Quién cargó una fila, quién la modificó y cuándo (C27). La base guarda el
// email. Acá se muestra el nombre de la persona que tiene ese email.
import type { Fila } from '../datos/repositorio.ts'
import { formatearMomento } from '../dominio/formato.ts'

type ConAutoria = Pick<Fila<'gasto'>, 'creado_por' | 'creado_en' | 'modificado_por' | 'modificado_en'>
type Persona = Pick<Fila<'persona'>, 'nombre' | 'email'>

export function Autoria({ fila, personas }: { fila: ConAutoria; personas: Persona[] }) {
  // Sin email, la fila se cargó desde el panel de Supabase: no se inventa un autor.
  const linea = (accion: string, email: string | null, momento: string) => {
    const quien = email ? ` por ${personas.find((p) => p.email === email)?.nombre ?? email}` : ''
    return `${accion}${quien} el ${formatearMomento(momento)}`
  }

  return (
    <p className="autoria">
      <span>{linea('Cargado', fila.creado_por, fila.creado_en)}</span>
      {fila.modificado_en && <span>{linea('Modificado', fila.modificado_por, fila.modificado_en)}</span>}
    </p>
  )
}
