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

/** "Entidad · Nombre (de Ana)": dos personas pueden tener cuenta en la misma entidad. */
export function nombreDeCuentaConDueno(
  cuenta: { entidad: string; nombre: string | null; persona_id: string },
  personas: { id: string; nombre: string }[],
): string {
  const dueno = personas.find((persona) => persona.id === cuenta.persona_id)?.nombre ?? ''
  return `${nombreDeCuenta(cuenta)} (de ${dueno})`
}
