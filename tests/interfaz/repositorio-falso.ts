// Repositorio en memoria para los tests de pantallas. Se comporta como el de
// Supabase en lo que las pantallas notan: completa id y autoría, devuelve
// copias y falla con "No se encontró" si la fila no existe. Las vistas y el
// resumen no se calculan: devuelven lo que carga cada test.
import { ErrorDeLaApp, MENSAJE_NO_SE_ENCONTRO } from '../../src/datos/errores.ts'
import type {
  Alta,
  Cambios,
  Fila,
  FilaResumenMes,
  Origen,
  Repositorio,
  TablaConId,
  TablaDelMes,
} from '../../src/datos/repositorio.ts'
import { mesDe, mesSiguiente } from '../../src/dominio/fechas.ts'

export type DatosFalsos = { [T in Origen]?: Fila<T>[] } & {
  resumenMes?: FilaResumenMes[]
  esMiembro?: boolean
  /** El email de quien está conectado. Queda en la autoría de lo que se carga. */
  email?: string
}

type FilaSuelta = Record<string, unknown>

// Lo que la base completa sola cuando no se manda, además del id y la autoría.
const POR_DEFECTO: { [T in TablaConId]?: Partial<Fila<T>> } = {
  persona: { email: null },
  cuenta: { nombre: null },
  instrumento: { vencimiento: null },
  operacion: { comision: 0 },
  gasto: { persona_id: null, descripcion: null },
  ingreso: { cuenta_id: null, descripcion: null },
}

// Columnas numeric: la app las manda como texto y la API las devuelve como número.
const NUMERICAS = new Set(['cantidad', 'precio_unitario', 'comision', 'monto', 'ratio', 'valor_nominal_residual'])

// Las tablas de detalle de cada tipo de instrumento, con sus columnas (C10).
const DETALLES = {
  instrumento_fci: { tipo: 'FCI', columnas: ['codigo_cafci'] },
  instrumento_cedear: { tipo: 'CEDEAR', columnas: ['ratio', 'subyacente'] },
  instrumento_on: { tipo: 'ON', columnas: ['emisor', 'valor_nominal_residual'] },
} as const

function comoLaBase(datos: object): FilaSuelta {
  return Object.fromEntries(
    Object.entries(datos).map(([columna, valor]) => [
      columna,
      NUMERICAS.has(columna) && typeof valor === 'string' ? Number(valor) : valor,
    ]),
  )
}

export function crearRepositorioFalso(datos: DatosFalsos = {}): Repositorio {
  const { resumenMes = [], esMiembro = true, email = 'ana@example.com', ...iniciales } = datos
  const tablas = new Map<Origen, FilaSuelta[]>(
    Object.entries(iniciales).map(([origen, filas]) => [origen as Origen, filas.map((fila) => ({ ...fila }))]),
  )
  const filasDe = (origen: Origen) => {
    if (!tablas.has(origen)) tablas.set(origen, [])
    return tablas.get(origen)!
  }
  const buscar = (tabla: TablaConId, id: string) => {
    const fila = filasDe(tabla).find((f) => f.id === id)
    if (!fila) throw new ErrorDeLaApp(MENSAJE_NO_SE_ENCONTRO)
    return fila
  }
  let orden = filasDe('operacion').length
  const autoria = () => ({ creado_por: email, creado_en: new Date().toISOString(), modificado_por: null, modificado_en: null })

  const repositorio: Repositorio = {
    async listar<T extends Origen>(origen: T) {
      return filasDe(origen).map((fila) => ({ ...fila })) as Fila<T>[]
    },

    async listarDelMes<T extends TablaDelMes>(tabla: T, mes: string) {
      const desde = mesDe(mes)
      const hasta = mesSiguiente(desde)
      return filasDe(tabla)
        .filter((fila) => String(fila.fecha) >= desde && String(fila.fecha) < hasta)
        .map((fila) => ({ ...fila })) as Fila<T>[]
    },

    async obtener<T extends TablaConId>(tabla: T, id: string) {
      const fila = filasDe(tabla).find((f) => f.id === id)
      return fila ? ({ ...fila } as Fila<T>) : null
    },

    async crear<T extends TablaConId>(tabla: T, alta: Alta<T>) {
      const fila = {
        ...POR_DEFECTO[tabla],
        ...comoLaBase(alta),
        id: crypto.randomUUID(),
        ...(tabla === 'operacion' ? { orden: ++orden } : {}),
        ...autoria(),
      }
      filasDe(tabla).push(fila)
      return { ...fila } as Fila<T>
    },

    async editar<T extends TablaConId>(tabla: T, id: string, cambios: Cambios<T>) {
      const fila = buscar(tabla, id)
      Object.assign(fila, comoLaBase(cambios), { modificado_por: email, modificado_en: new Date().toISOString() })
      return { ...fila } as Fila<T>
    },

    async borrar(tabla, id) {
      const filas = filasDe(tabla)
      filas.splice(filas.indexOf(buscar(tabla, id)), 1)
    },

    // Como la función de la base: el instrumento y su detalle juntos. El
    // detalle sin datos se borra. Que sea del tipo correcto lo controla la base.
    async guardarInstrumento(datos, id) {
      const { codigo_cafci, ratio, subyacente, emisor, valor_nominal_residual, ...instrumento } = datos
      const valores: FilaSuelta = { codigo_cafci, ratio, subyacente, emisor, valor_nominal_residual }
      const guardado = id
        ? await repositorio.editar('instrumento', id, instrumento)
        : await repositorio.crear('instrumento', instrumento)
      for (const [tabla, { tipo, columnas }] of Object.entries(DETALLES)) {
        const filas = filasDe(tabla as Origen)
        const anterior = filas.find((fila) => fila.instrumento_id === guardado.id)
        const campos = Object.fromEntries(columnas.map((columna) => [columna, valores[columna]]))
        if (Object.values(campos).every((valor) => valor === null)) {
          if (anterior) filas.splice(filas.indexOf(anterior), 1)
        } else if (anterior) {
          Object.assign(anterior, comoLaBase(campos), { modificado_por: email, modificado_en: new Date().toISOString() })
        } else {
          filas.push({ instrumento_id: guardado.id, tipo, ...comoLaBase(campos), ...autoria() })
        }
      }
      return guardado.id
    },

    async resumenMes() {
      return resumenMes.map((fila) => ({ ...fila }))
    },

    async esMiembro() {
      return esMiembro
    },
  }
  return repositorio
}
