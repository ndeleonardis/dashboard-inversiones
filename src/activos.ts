// Tipos de activo y sus etiquetas visibles (compartido por el menú y el detalle).
import type { TipoActivo } from './types'

export const TIPOS_ACTIVO: TipoActivo[] = ['FCI', 'ON', 'Accion', 'Cripto']

export const ETIQUETA_TIPO: Record<TipoActivo, string> = {
  FCI: 'FCI',
  ON: 'ON',
  Accion: 'Acciones',
  Cripto: 'Cripto',
}
