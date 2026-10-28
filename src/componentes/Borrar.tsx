// Borrar con una pregunta dentro de la pantalla. Si la base no deja borrar,
// muestra por qué, por ejemplo qué tiene en uso lo que se quería borrar (C7).
import { useState } from 'react'
import { traducirError } from '../datos/errores.ts'
import { Confirmacion } from './Confirmacion.tsx'

type PropsBorrar = {
  pregunta: string
  borrar: () => Promise<void>
  alBorrar: () => void
}

export function Borrar({ pregunta, borrar, alBorrar }: PropsBorrar) {
  const [estado, setEstado] = useState<'quieto' | 'preguntando' | 'borrando'>('quieto')
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    setEstado('borrando')
    try {
      await borrar()
    } catch (falla) {
      setError(traducirError(falla).mensaje)
      setEstado('quieto')
      return
    }
    alBorrar()
  }

  return (
    <div className="borrar">
      {error && (
        <p role="alert" className="formulario-error">
          {error}
        </p>
      )}
      {estado === 'preguntando' ? (
        <Confirmacion
          mensaje={pregunta}
          textoConfirmar="Sí, borrar"
          textoCancelar="No"
          alConfirmar={() => void confirmar()}
          alCancelar={() => setEstado('quieto')}
        />
      ) : (
        <button
          type="button"
          className="boton boton-secundario"
          disabled={estado === 'borrando'}
          onClick={() => {
            setError(null)
            setEstado('preguntando')
          }}
        >
          {estado === 'borrando' ? 'Borrando…' : 'Borrar'}
        </button>
      )}
    </div>
  )
}
