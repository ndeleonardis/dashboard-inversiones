// Formulario que no pierde lo escrito. Valida antes de guardar, pide confirmar
// dentro de la pantalla cuando hace falta y, si guardar falla, muestra el error
// en español sin borrar nada ni decir "Guardado". Si la sesión venció, deja lo
// escrito en el navegador y lo recupera la próxima vez que se abre.
import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { MENSAJE_SESION_VENCIDA, traducirError } from '../datos/errores.ts'
import { Confirmacion } from './Confirmacion.tsx'

/** Todo campo es texto: los números se leen con leerNumero al guardar. */
export type Valores = Record<string, string>
export type Errores = Record<string, string | undefined>

type Estado = 'editando' | 'confirmando' | 'guardando' | 'guardado'

type ContextoDelFormulario = {
  valores: Valores
  errores: Errores
  cambiar: (nombre: string, valor: string) => void
}

const Contexto = createContext<ContextoDelFormulario | null>(null)

/** Los valores y errores del formulario, para los campos que van adentro. */
export function useFormulario(): ContextoDelFormulario {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useFormulario solo funciona dentro de un <Formulario>')
  return contexto
}

const PREFIJO_BORRADOR = 'lemonhouse:borrador:'

function leerBorrador<V extends Valores>(clave: string, inicial: V): V | null {
  try {
    const guardado: unknown = JSON.parse(localStorage.getItem(PREFIJO_BORRADOR + clave) ?? 'null')
    if (typeof guardado !== 'object' || guardado === null) return null
    const valores: Valores = { ...inicial }
    for (const nombre of Object.keys(inicial)) {
      const valor = (guardado as Record<string, unknown>)[nombre]
      if (typeof valor === 'string') valores[nombre] = valor
    }
    return valores as V
  } catch {
    return null
  }
}

function escribirBorrador(clave: string, valores: Valores | null) {
  try {
    if (valores) localStorage.setItem(PREFIJO_BORRADOR + clave, JSON.stringify(valores))
    else localStorage.removeItem(PREFIJO_BORRADOR + clave)
  } catch {
    // Sin almacenamiento (en modo privado, por ejemplo) lo escrito solo vive en la pantalla.
  }
}

/** Borra todos los borradores que quedaron en el navegador. Se usa al salir (C4). */
export function borrarBorradores() {
  try {
    for (const clave of Object.keys(localStorage)) {
      if (clave.startsWith(PREFIJO_BORRADOR)) localStorage.removeItem(clave)
    }
  } catch {
    // Sin almacenamiento no hay borradores que borrar.
  }
}

type PropsFormulario<V extends Valores> = {
  /** Nombre del borrador en el navegador, por ejemplo "gasto-nuevo" o "gasto-<id>". */
  clave: string
  inicial: V
  /** Errores por campo, antes de guardar. Un campo sin error queda en undefined. */
  validar?: (valores: V) => Errores
  /** Un aviso para confirmar antes de guardar, como una fecha futura, o null. */
  confirmar?: (valores: V) => string | null
  guardar: (valores: V) => Promise<void>
  /** Recibe lo que se guardó, por ejemplo para volver a la lista del mes de esa fecha. */
  alGuardar?: (valores: V) => void
  textoBoton?: string
  children: ReactNode
}

export function Formulario<V extends Valores>({
  clave,
  inicial,
  validar,
  confirmar,
  guardar,
  alGuardar,
  textoBoton = 'Guardar',
  children,
}: PropsFormulario<V>) {
  const [recuperado] = useState(() => leerBorrador(clave, inicial))
  const [valores, setValores] = useState<V>(recuperado ?? inicial)
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [estado, setEstado] = useState<Estado>('editando')
  // Cuenta los envíos con errores de campo, para llevar el foco al primero.
  const [conErrores, setConErrores] = useState(0)
  const formulario = useRef<HTMLFormElement>(null)
  // El estado tarda un render en cambiar. Esto frena un doble clic.
  const guardando = useRef(false)

  // Lo recuperado ya está en pantalla. Si se vuelve a necesitar, se guarda de nuevo.
  useEffect(() => {
    if (recuperado) escribirBorrador(clave, null)
  }, [recuperado, clave])

  useEffect(() => {
    if (conErrores > 0) formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [conErrores])

  function cambiar(nombre: string, valor: string) {
    setValores((actuales) => ({ ...actuales, [nombre]: valor }))
    setErrores((actuales) => ({ ...actuales, [nombre]: undefined }))
    setAviso(null)
    setEstado((actual) => (actual === 'guardando' ? actual : 'editando'))
  }

  function marcarErrores(nuevos: Errores) {
    setErrores(nuevos)
    setConErrores((n) => n + 1)
  }

  async function guardarAhora() {
    if (guardando.current) return
    guardando.current = true
    setEstado('guardando')
    setAviso(null)
    setErrores({})
    setErrorGeneral(null)
    try {
      await guardar(valores)
    } catch (error) {
      const { mensaje, campo } = traducirError(error)
      if (mensaje === MENSAJE_SESION_VENCIDA) escribirBorrador(clave, valores)
      if (campo && campo in valores) marcarErrores({ [campo]: mensaje })
      else setErrorGeneral(mensaje)
      setEstado('editando')
      return
    } finally {
      guardando.current = false
    }
    escribirBorrador(clave, null)
    setEstado('guardado')
    alGuardar?.(valores)
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (guardando.current) return
    const encontrados = validar?.(valores) ?? {}
    if (Object.values(encontrados).some(Boolean)) {
      setErrorGeneral(null)
      marcarErrores(encontrados)
      return
    }
    const avisoNuevo = confirmar?.(valores) ?? null
    if (avisoNuevo) {
      setAviso(avisoNuevo)
      setEstado('confirmando')
      return
    }
    void guardarAhora()
  }

  return (
    <Contexto value={{ valores, errores, cambiar }}>
      {/* noValidate: los avisos del navegador salen en su idioma, y la app los da en español. */}
      <form ref={formulario} className="formulario columna-formulario" noValidate onSubmit={enviar}>
        {recuperado && estado !== 'guardado' && (
          <p role="status" className="formulario-aviso">
            Recuperamos lo que habías escrito antes de que venciera la sesión.
          </p>
        )}
        {children}
        {errorGeneral && (
          <p role="alert" className="formulario-error">
            {errorGeneral}
          </p>
        )}
        {estado === 'confirmando' && aviso ? (
          <Confirmacion
            mensaje={aviso}
            textoConfirmar="Guardar igual"
            textoCancelar="Revisar"
            alConfirmar={() => void guardarAhora()}
            alCancelar={() => {
              setAviso(null)
              setEstado('editando')
            }}
          />
        ) : (
          <button type="submit" className="boton boton-principal" disabled={estado === 'guardando'}>
            {estado === 'guardando' ? 'Guardando…' : textoBoton}
          </button>
        )}
        {estado === 'guardado' && (
          <p role="status" className="formulario-guardado">
            Guardado
          </p>
        )}
      </form>
    </Contexto>
  )
}
