// Traduce los errores de la base, de la red y de la sesión a un mensaje en
// español para la pantalla (regla 1). Si el error es de un dato, dice en qué
// campo. Nunca muestra el texto de Postgres: lo que no se reconoce da el
// mensaje genérico.
import { formatearCantidad, formatearFecha } from '../dominio/formato.ts'

export type ErrorParaMostrar = { mensaje: string; campo?: string }

/** Un error que arma la propia app, con un mensaje ya listo para mostrar. */
export class ErrorDeLaApp extends Error {
  readonly campo?: string

  constructor(mensaje: string, campo?: string) {
    super(mensaje)
    this.name = 'ErrorDeLaApp'
    this.campo = campo
  }
}

export const MENSAJE_GENERICO = 'No se pudo guardar. Probá de nuevo.'
export const MENSAJE_SIN_CONEXION = 'No hay conexión. Lo que escribiste sigue acá, probá de nuevo cuando vuelva.'
export const MENSAJE_SESION_VENCIDA = 'Tu sesión venció. Volvé a entrar: lo que escribiste queda guardado.'
export const MENSAJE_NO_SE_ENCONTRO = 'No se encontró. Puede que alguien lo haya borrado'

const enCampo = (mensaje: string, campo: string): ErrorParaMostrar => ({ mensaje, campo })
const sinCampo = (mensaje: string): ErrorParaMostrar => ({ mensaje })

/** Controles (check) y datos únicos, por nombre de restricción. */
export const MENSAJES_DE_RESTRICCION: Record<string, ErrorParaMostrar> = {
  persona_nombre_no_vacio: enCampo('Poné un nombre', 'nombre'),
  persona_email_en_minusculas: enCampo('El email no es válido', 'email'),
  persona_email_unico: enCampo('Ya hay una persona con ese email', 'email'),
  tipo_cuenta_nombre_no_vacio: enCampo('Poné un nombre', 'nombre'),
  tipo_cuenta_nombre_unico: enCampo('Ya hay un tipo de cuenta con ese nombre', 'nombre'),
  cuenta_entidad_no_vacia: enCampo('Poné el banco o broker', 'entidad'),
  cuenta_nombre_no_vacio: enCampo('El nombre no puede quedar en blanco', 'nombre'),
  tipo_instrumento_codigo_valido: sinCampo('El código del tipo de instrumento no es válido'),
  tipo_instrumento_nombre_no_vacio: enCampo('Poné un nombre', 'nombre'),
  tipo_instrumento_precio_cada_positivo: sinCampo('Cada cuánto cotiza tiene que ser mayor que cero'),
  instrumento_ticker_valido: enCampo('Poné el ticker', 'ticker'),
  instrumento_nombre_no_vacio: enCampo('Poné un nombre', 'nombre'),
  instrumento_on_con_vencimiento: enCampo('Una ON necesita fecha de vencimiento', 'vencimiento'),
  instrumento_vencimiento_solo_on: enCampo('Solo las ON llevan vencimiento', 'vencimiento'),
  instrumento_ticker_moneda_unico: enCampo('Ya existe ese ticker en esa moneda', 'ticker'),
  instrumento_id_moneda_unico: sinCampo(MENSAJE_GENERICO),
  tipo_operacion_codigo_valido: sinCampo('El código del tipo de operación no es válido'),
  tipo_operacion_nombre_no_vacio: enCampo('Poné un nombre', 'nombre'),
  operacion_cantidad_positiva: enCampo('La cantidad tiene que ser mayor que cero', 'cantidad'),
  operacion_precio_positivo: enCampo('El precio tiene que ser mayor que cero', 'precio_unitario'),
  operacion_comision_no_negativa: enCampo('La comisión no puede ser negativa', 'comision'),
  operacion_cantidad_decimales: enCampo('Usá hasta 8 decimales', 'cantidad'),
  operacion_precio_decimales: enCampo('Usá hasta 8 decimales', 'precio_unitario'),
  operacion_comision_decimales: enCampo('Usá hasta 2 decimales', 'comision'),
  tipo_gasto_nombre_no_vacio: enCampo('Poné un nombre', 'nombre'),
  tipo_gasto_nombre_unico: enCampo('Ya hay una categoría con ese nombre', 'nombre'),
  tipo_ingreso_nombre_no_vacio: enCampo('Poné un nombre', 'nombre'),
  tipo_ingreso_nombre_unico: enCampo('Ya hay una categoría con ese nombre', 'nombre'),
  gasto_monto_positivo: enCampo('El monto tiene que ser mayor que cero', 'monto'),
  gasto_monto_decimales: enCampo('Usá hasta 2 decimales', 'monto'),
  ingreso_monto_positivo: enCampo('El monto tiene que ser mayor que cero', 'monto'),
  ingreso_monto_decimales: enCampo('Usá hasta 2 decimales', 'monto'),
}

type MensajesDeClaveForanea = {
  /** Cuando se borra o se cambia algo que otra fila usa (C7). */
  enUso: string
  /** Cuando se guarda algo que apunta a una fila que no existe. */
  alGuardar: ErrorParaMostrar
}

/** Claves foráneas, por nombre de restricción. */
export const CLAVES_FORANEAS: Record<string, MensajesDeClaveForanea> = {
  cuenta_persona_fk: {
    enUso: 'No se puede borrar: esta persona tiene cuentas',
    alGuardar: enCampo('La persona elegida ya no existe. Puede que alguien la haya borrado', 'persona_id'),
  },
  cuenta_tipo_cuenta_fk: {
    enUso: 'No se puede borrar: hay cuentas de este tipo',
    alGuardar: enCampo('El tipo de cuenta elegido no existe', 'tipo_cuenta_id'),
  },
  instrumento_tipo_fk: {
    enUso: 'No se puede borrar: hay instrumentos de este tipo',
    alGuardar: enCampo('El tipo de instrumento elegido no existe', 'tipo'),
  },
  operacion_cuenta_fk: {
    enUso: 'No se puede borrar: esta cuenta tiene operaciones cargadas',
    alGuardar: enCampo('La cuenta elegida ya no existe. Puede que alguien la haya borrado', 'cuenta_id'),
  },
  operacion_instrumento_fk: {
    enUso: 'No se puede borrar: este instrumento tiene operaciones cargadas',
    alGuardar: enCampo('El instrumento elegido ya no existe. Puede que alguien lo haya borrado', 'instrumento_id'),
  },
  operacion_moneda_instrumento_fk: {
    enUso: 'No se puede cambiar la moneda: el instrumento tiene operaciones cargadas',
    alGuardar: enCampo('La moneda tiene que ser la del instrumento', 'moneda'),
  },
  operacion_tipo_fk: {
    enUso: 'No se puede borrar: hay operaciones de este tipo',
    alGuardar: enCampo('El tipo de operación elegido no existe', 'tipo'),
  },
  gasto_tipo_gasto_fk: {
    enUso: 'No se puede borrar: hay gastos en esta categoría',
    alGuardar: enCampo('La categoría elegida ya no existe', 'tipo_gasto_id'),
  },
  gasto_persona_fk: {
    enUso: 'No se puede borrar: esta persona tiene gastos asignados',
    alGuardar: enCampo('La persona elegida ya no existe. Puede que alguien la haya borrado', 'persona_id'),
  },
  ingreso_tipo_ingreso_fk: {
    enUso: 'No se puede borrar: hay ingresos en esta categoría',
    alGuardar: enCampo('La categoría elegida ya no existe', 'tipo_ingreso_id'),
  },
  ingreso_persona_fk: {
    enUso: 'No se puede borrar: esta persona tiene ingresos',
    alGuardar: enCampo('La persona elegida ya no existe. Puede que alguien la haya borrado', 'persona_id'),
  },
  ingreso_cuenta_fk: {
    enUso: 'No se puede borrar: esta cuenta tiene ingresos cargados',
    alGuardar: enCampo('La cuenta elegida ya no existe. Puede que alguien la haya borrado', 'cuenta_id'),
  },
}

/** Datos obligatorios que faltan, por nombre de columna. */
export const MENSAJES_DE_COLUMNA: Record<string, string> = {
  nombre: 'Poné un nombre',
  codigo: 'Poné un código',
  persona_id: 'Elegí una persona',
  tipo_cuenta_id: 'Elegí el tipo de cuenta',
  entidad: 'Poné el banco o broker',
  tipo: 'Elegí el tipo',
  ticker: 'Poné el ticker',
  moneda: 'Elegí la moneda',
  cuenta_id: 'Elegí la cuenta',
  instrumento_id: 'Elegí el instrumento',
  fecha: 'Poné la fecha',
  cantidad: 'Poné la cantidad',
  precio_unitario: 'Poné el precio',
  monto: 'Poné el monto',
  tipo_gasto_id: 'Elegí la categoría',
  tipo_ingreso_id: 'Elegí la categoría',
}

type ErrorDeLaBase = { code?: string; message?: string; details?: string | null }

const RESTRICCION = /constraint "([^"]+)"/
const COLUMNA = /column "([^"]+)"/

function ventaSinRespaldo(details: string | null | undefined): ErrorParaMostrar {
  try {
    const { fecha, cantidad, disponible, ticker } = JSON.parse(details ?? '')
    return enCampo(
      `La cuenta solo tiene ${formatearCantidad(disponible)} ${ticker} al ${formatearFecha(fecha)} y la venta es de ${formatearCantidad(cantidad)}`,
      'cantidad',
    )
  } catch {
    return enCampo('La cuenta no tiene esa cantidad para vender', 'cantidad')
  }
}

function esFallaDeRed(mensaje: string): boolean {
  return /Failed to fetch|NetworkError|Load failed|Network request failed/i.test(mensaje)
}

export function traducirError(error: unknown): ErrorParaMostrar {
  if (error instanceof ErrorDeLaApp) {
    return error.campo ? enCampo(error.message, error.campo) : sinCampo(error.message)
  }
  if (typeof error !== 'object' || error === null) return sinCampo(MENSAJE_GENERICO)

  const { code = '', message = '', details } = error as ErrorDeLaBase
  if (esFallaDeRed(message)) return sinCampo(MENSAJE_SIN_CONEXION)
  if (code === 'PGRST301' || code === 'PGRST303') return sinCampo(MENSAJE_SESION_VENCIDA)

  const restriccion = RESTRICCION.exec(message)?.[1]
  switch (code) {
    case 'LH001':
      return ventaSinRespaldo(details)
    case '23503':
    case '23001': {
      const mensajes = restriccion ? CLAVES_FORANEAS[restriccion] : undefined
      if (!mensajes) break
      return message.startsWith('insert or update') ? mensajes.alGuardar : sinCampo(mensajes.enUso)
    }
    case '23505':
    case '23514': {
      const mensaje = restriccion ? MENSAJES_DE_RESTRICCION[restriccion] : undefined
      if (mensaje) return mensaje
      break
    }
    case '23502': {
      const columna = COLUMNA.exec(message)?.[1]
      if (columna) return enCampo(MENSAJES_DE_COLUMNA[columna] ?? 'Falta completar este dato', columna)
      break
    }
    case '42501':
      return sinCampo('No tenés permiso para hacer esto')
    case '22P02':
      return sinCampo('Algún dato no tiene el formato correcto')
  }

  // Los demás errores propios de la base (LH…) ya vienen en español.
  if (code.startsWith('LH') && message) return sinCampo(message)
  return sinCampo(MENSAJE_GENERICO)
}
