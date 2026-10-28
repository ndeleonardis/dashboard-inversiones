// Una pregunta dentro de la pantalla, en lugar de una ventana del navegador.
// El foco va a la opción que no cambia nada, así un Enter de más no borra ni
// guarda.
import { useEffect, useId, useRef } from 'react'

type PropsConfirmacion = {
  mensaje: string
  textoConfirmar: string
  textoCancelar: string
  alConfirmar: () => void
  alCancelar: () => void
}

export function Confirmacion({ mensaje, textoConfirmar, textoCancelar, alConfirmar, alCancelar }: PropsConfirmacion) {
  const idMensaje = useId()
  const cancelar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelar.current?.focus()
  }, [])

  return (
    <div role="alertdialog" aria-labelledby={idMensaje} className="confirmacion">
      <p id={idMensaje}>{mensaje}</p>
      <div className="confirmacion-acciones">
        <button type="button" className="boton boton-principal" onClick={alConfirmar}>
          {textoConfirmar}
        </button>
        <button ref={cancelar} type="button" className="boton boton-secundario" onClick={alCancelar}>
          {textoCancelar}
        </button>
      </div>
    </div>
  )
}
