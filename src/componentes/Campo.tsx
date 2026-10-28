// Un campo del formulario con su etiqueta, su ayuda y su error. El error queda
// asociado al campo, así un lector de pantalla lo dice al llegar.
import { useId, type InputHTMLAttributes } from 'react'
import { useFormulario } from './Formulario.tsx'

export type Opcion = { valor: string; texto: string }

type PropsCampo = {
  nombre: string
  etiqueta: string
  ayuda?: string
  /** Con opciones, el campo es una lista para elegir. */
  opciones?: Opcion[]
  /** El texto de la opción vacía de la lista. */
  sinElegir?: string
} & Pick<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'autoComplete' | 'max' | 'disabled'>

export function Campo({ nombre, etiqueta, ayuda, opciones, sinElegir = 'Elegí una opción', ...atributos }: PropsCampo) {
  const { valores, errores, cambiar } = useFormulario()
  const id = useId()
  const error = errores[nombre]
  const descripcion = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ')

  const comunes = {
    id,
    name: nombre,
    value: valores[nombre] ?? '',
    disabled: atributos.disabled,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': descripcion || undefined,
  }

  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      {opciones ? (
        <select {...comunes} onChange={(evento) => cambiar(nombre, evento.target.value)}>
          <option value="">{sinElegir}</option>
          {opciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.texto}
            </option>
          ))}
        </select>
      ) : (
        <input {...atributos} {...comunes} onChange={(evento) => cambiar(nombre, evento.target.value)} />
      )}
      {ayuda && (
        <p id={`${id}-ayuda`} className="campo-ayuda">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="campo-error">
          {error}
        </p>
      )}
    </div>
  )
}
