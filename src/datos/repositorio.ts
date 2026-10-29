// Todo lo que la app lee y guarda en la base pasa por acá. La versión de este
// archivo habla con Supabase. La de tests/interfaz/ guarda en memoria, para
// probar las pantallas sin red ni base.
import type { SupabaseClient } from '@supabase/supabase-js'
import { mesDe, mesSiguiente } from '../dominio/fechas.ts'
import type { Cliente } from './cliente.ts'
import { ErrorDeLaApp, MENSAJE_NO_SE_ENCONTRO } from './errores.ts'
import type { Database } from './tipos-base.ts'

// El código de Postgres para un texto que no tiene forma de uuid.
const ID_INVALIDO = '22P02'

type Esquema = Database['public']
export type Tabla = keyof Esquema['Tables']
export type Vista = keyof Esquema['Views']
export type Origen = Tabla | Vista

// Los tipos generados marcan como opcional toda columna de una vista. Las
// nuestras no tienen nulos: cada columna sale de un not null o de un coalesce.
type SinNulos<T> = { [K in keyof T]: NonNullable<T[K]> }

export type Fila<T extends Origen> = T extends Tabla
  ? Esquema['Tables'][T]['Row']
  : T extends Vista
    ? SinNulos<Esquema['Views'][T]['Row']>
    : never

/** Las tablas que se editan y se borran por id. Los tipos de instrumento y de operación tienen código. */
export type TablaConId = { [T in Tabla]: Fila<T> extends { id: string } ? T : never }[Tabla]

/** Las tablas que crecen todos los meses. Se leen de a un mes, porque la API corta en 1.000 filas. */
export type TablaDelMes = 'gasto' | 'ingreso'

// Lo completa la base: el id, el orden de carga y la autoría (C27).
type DeLaBase = 'id' | 'orden' | 'creado_por' | 'creado_en' | 'modificado_por' | 'modificado_en'

// Los montos, las cantidades y los precios se mandan como texto exacto, que es
// lo que devuelve leerNumero. Vuelven como número.
type ConNumerosComoTexto<T> = { [K in keyof T]: number extends NonNullable<T[K]> ? T[K] | string : T[K] }

export type Alta<T extends TablaConId> = ConNumerosComoTexto<Omit<Esquema['Tables'][T]['Insert'], DeLaBase>>
export type Cambios<T extends TablaConId> = ConNumerosComoTexto<Omit<Esquema['Tables'][T]['Update'], DeLaBase>>

export type FilaResumenMes = Esquema['Functions']['resumen_mes']['Returns'][number]

export interface Repositorio {
  /** Todas las filas de una tabla o una vista. */
  listar<T extends Origen>(origen: T): Promise<Fila<T>[]>
  /** Las filas de un mes. El mes es cualquier día del mes. */
  listarDelMes<T extends TablaDelMes>(tabla: T, mes: string): Promise<Fila<T>[]>
  /** Una fila por su id, o null si no existe. */
  obtener<T extends TablaConId>(tabla: T, id: string): Promise<Fila<T> | null>
  crear<T extends TablaConId>(tabla: T, datos: Alta<T>): Promise<Fila<T>>
  /** Si la fila ya no existe, falla con "No se encontró" en lugar de pasar por buena. */
  editar<T extends TablaConId>(tabla: T, id: string, cambios: Cambios<T>): Promise<Fila<T>>
  /** Si la fila ya no existe, falla con "No se encontró" en lugar de pasar por buena. */
  borrar(tabla: TablaConId, id: string): Promise<void>
  /** Ingresos, gastos y lo que queda, una fila por moneda (C21). El mes es cualquier día del mes. */
  resumenMes(mes: string): Promise<FilaResumenMes[]>
  /** Si quien está conectado tiene su email cargado en una persona. */
  esMiembro(): Promise<boolean>
}

export function crearRepositorioSupabase(cliente: Cliente): Repositorio {
  // supabase-js no sigue los tipos cuando la tabla llega como parámetro, así
  // que las consultas genéricas van sin tipos y la interfaz pone los suyos.
  const sinTipos = cliente as unknown as SupabaseClient

  return {
    // Trae todo. La API corta en 1.000 filas: gastos e ingresos se leen de a
    // un mes, y las operaciones van a necesitar un filtro cuando crezcan.
    async listar<T extends Origen>(origen: T) {
      const { data, error } = await sinTipos.from(origen).select('*')
      if (error) throw error
      return data as Fila<T>[]
    },

    async listarDelMes<T extends TablaDelMes>(tabla: T, mes: string) {
      const desde = mesDe(mes)
      const { data, error } = await sinTipos.from(tabla).select('*').gte('fecha', desde).lt('fecha', mesSiguiente(desde))
      if (error) throw error
      return data as Fila<T>[]
    },

    async obtener<T extends TablaConId>(tabla: T, id: string) {
      const { data, error } = await sinTipos.from(tabla).select('*').eq('id', id).maybeSingle()
      // Un id mal escrito en la dirección es una fila que no existe.
      if (error?.code === ID_INVALIDO) return null
      if (error) throw error
      return data as Fila<T> | null
    },

    async crear<T extends TablaConId>(tabla: T, datos: Alta<T>) {
      const { data, error } = await sinTipos.from(tabla).insert(datos as object).select().single()
      if (error) throw error
      return data as Fila<T>
    },

    async editar<T extends TablaConId>(tabla: T, id: string, cambios: Cambios<T>) {
      const { data, error } = await sinTipos.from(tabla).update(cambios as object).eq('id', id).select()
      if (error) throw error
      const [fila] = data
      if (!fila) throw new ErrorDeLaApp(MENSAJE_NO_SE_ENCONTRO)
      return fila as Fila<T>
    },

    async borrar(tabla, id) {
      const { data, error } = await sinTipos.from(tabla).delete().eq('id', id).select('id')
      if (error) throw error
      if (data.length === 0) throw new ErrorDeLaApp(MENSAJE_NO_SE_ENCONTRO)
    },

    async resumenMes(mes) {
      const { data, error } = await cliente.rpc('resumen_mes', { p_mes: mes })
      if (error) throw error
      return data
    },

    async esMiembro() {
      const { data, error } = await cliente.rpc('es_miembro')
      if (error) throw error
      return data
    },
  }
}
