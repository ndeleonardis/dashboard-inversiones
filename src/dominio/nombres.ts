// Cómo se nombra y se ordena lo que muestran las listas.

/** Compara textos como en un diccionario: sin importar mayúsculas ni tildes. */
export const compararTextos = new Intl.Collator('es-AR', { sensitivity: 'base' }).compare

export function porNombre<T extends { nombre: string }>(filas: T[]): T[] {
  return [...filas].sort((a, b) => compararTextos(a.nombre, b.nombre))
}

/** "Entidad · Nombre", o solo la entidad si la cuenta no tiene nombre. */
export function nombreDeCuenta(cuenta: { entidad: string; nombre: string | null }): string {
  return cuenta.nombre ? `${cuenta.entidad} · ${cuenta.nombre}` : cuenta.entidad
}
