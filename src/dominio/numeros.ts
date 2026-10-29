// Lee los números que escribe la persona, en formato argentino: coma decimal y
// punto de miles. Rechaza lo ambiguo en lugar de adivinar, así "0.5" nunca se
// guarda como 5. Devuelve el número como texto exacto para la base.

export type NumeroLeido = { ok: true; valor: string } | { ok: false; error: string }

export type ReglasDeNumero = {
  /** Cuántos decimales admite el campo. */
  decimales: number
  /** Si el cero vale, como en la comisión. */
  admiteCero?: boolean
}

const NO_SE_ENTIENDE: NumeroLeido = { ok: false, error: 'No se entiende el número' }
const SOLO_DIGITOS = /^\d+$/
// Un número con miles no empieza con cero: "0.500" es un decimal con punto.
const CON_PUNTO_DE_MILES = /^[1-9]\d{0,2}(\.\d{3})+$/
const CON_PUNTO_DECIMAL = /^\d*\.\d+$/

export function leerNumero(texto: string, { decimales, admiteCero = false }: ReglasDeNumero): NumeroLeido {
  const limpio = texto.trim()
  if (limpio === '') return { ok: false, error: 'Falta el número' }

  const negativo = limpio.startsWith('-')
  const partes = (negativo ? limpio.slice(1).trim() : limpio).split(',')
  if (partes.length > 2) return NO_SE_ENTIENDE
  const [antesDeLaComa = '', despuesDeLaComa] = partes

  let entera: string
  if (SOLO_DIGITOS.test(antesDeLaComa)) {
    entera = antesDeLaComa
  } else if (CON_PUNTO_DE_MILES.test(antesDeLaComa)) {
    entera = antesDeLaComa.replace(/\./g, '')
  } else if (despuesDeLaComa === undefined && CON_PUNTO_DECIMAL.test(antesDeLaComa)) {
    return { ok: false, error: 'Usá coma para los decimales' }
  } else {
    return NO_SE_ENTIENDE
  }

  const fraccion = despuesDeLaComa ?? ''
  if (despuesDeLaComa !== undefined && !SOLO_DIGITOS.test(fraccion)) return NO_SE_ENTIENDE
  if (fraccion.length > decimales) return { ok: false, error: `Usá hasta ${decimales} decimales` }

  const esCero = /^0+$/.test(entera) && (fraccion === '' || /^0+$/.test(fraccion))
  if (negativo && !esCero) {
    return { ok: false, error: admiteCero ? 'No puede ser negativo' : 'Tiene que ser mayor que cero' }
  }
  if (esCero && !admiteCero) return { ok: false, error: 'Tiene que ser mayor que cero' }

  const sinCerosAdelante = entera.replace(/^0+(?=\d)/, '')
  return { ok: true, valor: fraccion === '' ? sinCerosAdelante : `${sinCerosAdelante}.${fraccion}` }
}
