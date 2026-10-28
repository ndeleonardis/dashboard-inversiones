// La sesión de quien usa la app. Entra con Google, y además la base tiene que
// confirmar que es miembro. Si le sacaron la invitación, sale (C3).
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { borrarBorradores } from '../componentes/Formulario.tsx'
import { useRepositorio } from '../datos/contexto.tsx'
import type { Autenticacion } from './autenticacion.ts'
import { MENSAJE_FALLO_GOOGLE, MENSAJE_SIN_ACCESO, type AvisoDeEntrada } from './aviso-de-entrada.ts'

export type EstadoDeSesion = 'cargando' | 'afuera' | 'adentro'

type Sesion = {
  estado: EstadoDeSesion
  /** Por qué la persona está afuera, si hay algo que decirle. */
  aviso: AvisoDeEntrada | null
  /** Lleva a Google. Devuelve false si no pudo ir. */
  entrar: () => Promise<boolean>
  /** Cierra la sesión y borra lo que la app tenía en memoria y en el navegador (C4). */
  salir: () => Promise<void>
}

const Contexto = createContext<Sesion | null>(null)

export function useSesion(): Sesion {
  const sesion = useContext(Contexto)
  if (!sesion) throw new Error('useSesion solo funciona dentro de un <ProveedorDeSesion>')
  return sesion
}

type PropsProveedor = {
  autenticacion: Autenticacion
  /** El error con el que volvió Google, leído de la URL al abrir la app. */
  avisoInicial?: AvisoDeEntrada | null
  children: ReactNode
}

export function ProveedorDeSesion({ autenticacion, avisoInicial = null, children }: PropsProveedor) {
  const repositorio = useRepositorio()
  const consultas = useQueryClient()
  // undefined mientras no se sabe si hay sesión.
  const [email, setEmail] = useState<string | null | undefined>(undefined)
  // El email que la base confirmó como miembro.
  const [miembro, setMiembro] = useState<string | null>(null)
  const [aviso, setAviso] = useState(avisoInicial)

  useEffect(() => autenticacion.alCambiar(setEmail), [autenticacion])

  const salir = useCallback(async () => {
    // Primero se deja de mostrar todo, después se cierra la sesión y se borra.
    setEmail(null)
    setMiembro(null)
    try {
      await autenticacion.salir()
    } catch {
      // Sin conexión, la sesión puede quedar guardada, pero la app ya la dejó afuera.
    }
    consultas.clear()
    borrarBorradores()
  }, [autenticacion, consultas])

  useEffect(() => {
    if (!email) return
    let vigente = true
    repositorio.esMiembro().then(
      (esMiembro) => {
        if (!vigente) return
        if (esMiembro) {
          setMiembro(email)
        } else {
          setAviso({ mensaje: MENSAJE_SIN_ACCESO, email })
          void salir()
        }
      },
      // Si no se puede preguntar (sin conexión, por ejemplo), entra igual: la
      // base no le muestra nada a quien no es miembro.
      () => {
        if (vigente) setMiembro(email)
      },
    )
    return () => {
      vigente = false
    }
  }, [email, repositorio, salir])

  async function entrar() {
    setAviso(null)
    try {
      await autenticacion.entrarConGoogle()
      return true
    } catch {
      setAviso({ mensaje: MENSAJE_FALLO_GOOGLE })
      return false
    }
  }

  const estado: EstadoDeSesion =
    email === null ? 'afuera' : email !== undefined && miembro === email ? 'adentro' : 'cargando'

  return <Contexto value={{ estado, aviso, entrar, salir }}>{children}</Contexto>
}
