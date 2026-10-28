// El repositorio que usa toda la app: el de Supabase, o el falso en los tests.
import { createContext, useContext, type ReactNode } from 'react'
import type { Repositorio } from './repositorio.ts'

const Contexto = createContext<Repositorio | null>(null)

export function ProveedorDeRepositorio({ repositorio, children }: { repositorio: Repositorio; children: ReactNode }) {
  return <Contexto value={repositorio}>{children}</Contexto>
}

export function useRepositorio(): Repositorio {
  const repositorio = useContext(Contexto)
  if (!repositorio) throw new Error('useRepositorio solo funciona dentro de un <ProveedorDeRepositorio>')
  return repositorio
}
