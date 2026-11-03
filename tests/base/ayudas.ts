// Ayudas para los tests de la base.

export type ErrorDeBase = Error & {
  code: string
  detail?: string
  hint?: string
  constraint?: string
  column?: string
  table?: string
}

/** Espera que la consulta falle y devuelve el error de Postgres. */
export async function errorDe(consulta: Promise<unknown>): Promise<ErrorDeBase> {
  try {
    await consulta
  } catch (error) {
    return error as ErrorDeBase
  }
  throw new Error('Se esperaba un error de la base y la consulta anduvo')
}

export type PrecioParaGuardar = {
  instrumento_id: string
  fecha: string
  valor: number | string
  cada: number
  moneda: string
  fuente: string
  /** La clave con la que se pidió el precio. Si falta, se toma la actual, como haría el proceso. */
  clave?: string | null
}

type Consultor = { consultar<T = Record<string, unknown>>(sql: string, parametros?: unknown[]): Promise<T[]> }

/** Guarda precios como carga_precios, con la clave de instrumentos_a_cotizar() si el precio no trae una. */
export async function guardarPrecios(cargaPrecios: Consultor, precios: PrecioParaGuardar[]) {
  const claves = new Map(
    (await cargaPrecios.consultar<{ id: string; clave: string | null }>('select id, clave from public.instrumentos_a_cotizar()')).map(
      (fila) => [fila.id, fila.clave],
    ),
  )
  const conClave = precios.map((precio) => ({ clave: claves.get(precio.instrumento_id) ?? null, ...precio }))
  const [resultado] = await cargaPrecios.consultar<{ guardados: number; salteados: number }>(
    'select * from public.guardar_precios($1::jsonb)',
    [JSON.stringify(conClave)],
  )
  return { guardados: Number(resultado?.guardados), salteados: Number(resultado?.salteados) }
}
