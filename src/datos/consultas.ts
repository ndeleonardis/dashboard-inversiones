// Leer y guardar desde las pantallas, con TanStack Query. Después de cada
// cambio se vuelve a pedir todo, así ninguna pantalla queda con datos viejos
// (C13, C19).
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useRepositorio } from './contexto.tsx'
import type { Alta, Cambios, Fila, Origen, TablaConId } from './repositorio.ts'

export type Cargado<D> = { estado: 'cargando' } | { estado: 'error'; reintentar: () => void } | { estado: 'listo'; datos: D }

type Pedido = Record<string, Origen>
type Listas<P extends Pedido> = { [K in keyof P]: Fila<P[K]>[] }

const claveDe = (origen: Origen) => ['listar', origen]

/** Una o varias listas a la vez: useListas({ cuentas: 'cuenta', personas: 'persona' }). */
export function useListas<P extends Pedido>(pedido: P): Cargado<Listas<P>> {
  const repositorio = useRepositorio()
  const nombres = Object.keys(pedido)
  const resultados = useQueries({
    queries: nombres.map((nombre) => {
      const origen = pedido[nombre]!
      return { queryKey: claveDe(origen), queryFn: () => repositorio.listar(origen) }
    }),
  })

  if (resultados.some((resultado) => resultado.isError)) {
    return { estado: 'error', reintentar: () => resultados.forEach((resultado) => void resultado.refetch()) }
  }
  if (resultados.some((resultado) => resultado.isPending)) return { estado: 'cargando' }
  const datos = Object.fromEntries(nombres.map((nombre, i) => [nombre, resultados[i]!.data]))
  return { estado: 'listo', datos: datos as Listas<P> }
}

export function useCambios() {
  const repositorio = useRepositorio()
  const consultas = useQueryClient()

  // También si el cambio falla: puede que otra persona haya borrado lo que se quería editar.
  async function yRefrescar<R>(cambio: Promise<R>): Promise<R> {
    try {
      return await cambio
    } finally {
      await consultas.invalidateQueries()
    }
  }

  return {
    crear: <T extends TablaConId>(tabla: T, datos: Alta<T>) => yRefrescar(repositorio.crear(tabla, datos)),

    editar: <T extends TablaConId>(tabla: T, id: string, cambios: Cambios<T>) =>
      yRefrescar(repositorio.editar(tabla, id, cambios)),

    async borrar(tabla: TablaConId, id: string) {
      try {
        await repositorio.borrar(tabla, id)
      } catch (error) {
        void consultas.invalidateQueries()
        throw error
      }
      // Sale de las listas en el acto, así no se ve lo borrado mientras se refresca.
      consultas.setQueriesData<{ id: string }[]>({ queryKey: claveDe(tabla) }, (filas) =>
        filas?.filter((fila) => fila.id !== id),
      )
      void consultas.invalidateQueries()
    },
  }
}
