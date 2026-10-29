// Leer y guardar desde las pantallas, con TanStack Query. Después de cada
// cambio se vuelve a pedir todo, así ninguna pantalla queda con datos viejos
// (C13, C19).
import { useQueries, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { mesDe } from '../dominio/fechas.ts'
import { useRepositorio } from './contexto.tsx'
import type {
  Alta,
  Cambios,
  DatosDeInstrumento,
  Fila,
  FilaResumenMes,
  Origen,
  TablaConId,
  TablaDelMes,
} from './repositorio.ts'

export type Cargado<D> = { estado: 'cargando' } | { estado: 'error'; reintentar: () => void } | { estado: 'listo'; datos: D }

/** Las filas de un mes de una tabla que crece todos los meses, para pedir en useListas. */
export type DelMes<T extends TablaDelMes = TablaDelMes> = { tabla: T; mes: string }

export const delMes = <T extends TablaDelMes>(tabla: T, mes: string): DelMes<T> => ({ tabla, mes })

type Pedido = Record<string, Origen | DelMes>
type FilasDe<X> = X extends Origen ? Fila<X>[] : X extends DelMes<infer T extends TablaDelMes> ? Fila<T>[] : never
type Listas<P extends Pedido> = { [K in keyof P]: FilasDe<P[K]> }

// Las listas de un mes cuelgan de la de su tabla, así borrar las alcanza a todas.
const claveDe = (origen: Origen) => ['listar', origen]

function comoCargado<D>(resultados: UseQueryResult[], datos: () => D): Cargado<D> {
  if (resultados.some((resultado) => resultado.isError)) {
    return { estado: 'error', reintentar: () => resultados.forEach((resultado) => void resultado.refetch()) }
  }
  if (resultados.some((resultado) => resultado.isPending)) return { estado: 'cargando' }
  return { estado: 'listo', datos: datos() }
}

/** Una o varias listas a la vez: useListas({ cuentas: 'cuenta', gastos: delMes('gasto', mes) }). */
export function useListas<P extends Pedido>(pedido: P): Cargado<Listas<P>> {
  const repositorio = useRepositorio()
  const nombres = Object.keys(pedido)
  const resultados = useQueries({
    queries: nombres.map((nombre) => {
      const lista = pedido[nombre]!
      if (typeof lista === 'string') return { queryKey: claveDe(lista), queryFn: () => repositorio.listar(lista) }
      const mes = mesDe(lista.mes)
      return { queryKey: [...claveDe(lista.tabla), mes], queryFn: () => repositorio.listarDelMes(lista.tabla, mes) }
    }),
  })
  return comoCargado(resultados, () => {
    const datos = Object.fromEntries(nombres.map((nombre, i) => [nombre, resultados[i]!.data]))
    return datos as Listas<P>
  })
}

/** Una fila por su id. Si no existe, llega null. */
export function useFila<T extends TablaConId>(tabla: T, id: string): Cargado<Fila<T> | null> {
  const repositorio = useRepositorio()
  const resultado = useQuery({ queryKey: ['obtener', tabla, id], queryFn: () => repositorio.obtener(tabla, id) })
  return comoCargado([resultado], () => resultado.data ?? null)
}

/** Ingresos, gastos y lo que queda en el mes, una fila por moneda (C21). */
export function useResumenMes(mes: string): Cargado<FilaResumenMes[]> {
  const repositorio = useRepositorio()
  const primerDia = mesDe(mes)
  const resultado = useQuery({ queryKey: ['resumenMes', primerDia], queryFn: () => repositorio.resumenMes(primerDia) })
  return comoCargado([resultado], () => resultado.data ?? [])
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

    guardarInstrumento: (datos: DatosDeInstrumento, id?: string) =>
      yRefrescar(repositorio.guardarInstrumento(datos, id)),

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
