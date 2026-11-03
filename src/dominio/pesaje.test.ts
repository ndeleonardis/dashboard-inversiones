import { describe, expect, it } from 'vitest'
import { formatearPeso, formatearVariacionDePeso } from './formato.ts'
import { etiquetaDeObjetivo, leerPeso, PESO_MAXIMO, sentidoDeVariacion, signoDeVariacion } from './pesaje.ts'

describe('leerPeso (C51)', () => {
  it('lee kilogramos con coma decimal', () => {
    expect(leerPeso('57,3')).toEqual({ ok: true, valor: '57.3' })
    expect(leerPeso('4,35')).toEqual({ ok: true, valor: '4.35' })
    expect(leerPeso(' 82 ')).toEqual({ ok: true, valor: '82' })
  })

  it('toma el punto como coma, porque un peso nunca llega a los miles', () => {
    expect(leerPeso('57.3')).toEqual({ ok: true, valor: '57.3' })
    expect(leerPeso('4.35')).toEqual({ ok: true, valor: '4.35' })
  })

  it('nunca guarda un peso distinto del que se quiso escribir', () => {
    expect(leerPeso('4.350')).toEqual({ ok: false, error: 'Usá hasta 2 decimales' })
    expect(leerPeso('57,305')).toEqual({ ok: false, error: 'Usá hasta 2 decimales' })
    expect(leerPeso('1.234,5')).toEqual({ ok: false, error: `No puede pasar de ${PESO_MAXIMO} kg` })
  })

  it('rechaza cero, negativos y más de 300 kg', () => {
    expect(leerPeso('0')).toEqual({ ok: false, error: 'Tiene que ser mayor que cero' })
    expect(leerPeso('-1')).toEqual({ ok: false, error: 'Tiene que ser mayor que cero' })
    expect(leerPeso('300')).toEqual({ ok: true, valor: '300' })
    expect(leerPeso('300,01')).toEqual({ ok: false, error: 'No puede pasar de 300 kg' })
  })

  it('un peso escrito en gramos por error no pasa', () => {
    expect(leerPeso('4350')).toEqual({ ok: false, error: 'No puede pasar de 300 kg' })
  })

  it('vacío o ilegible lo dice', () => {
    expect(leerPeso('')).toEqual({ ok: false, error: 'Falta el número' })
    expect(leerPeso('cuatro')).toEqual({ ok: false, error: 'No se entiende el número' })
  })
})

describe('formato del peso (C55 y C56)', () => {
  it('el peso va con dos decimales y su unidad', () => {
    expect(formatearPeso('57.3')).toBe('57,30 kg')
    expect(formatearPeso(4.35)).toBe('4,35 kg')
    expect(formatearPeso('82')).toBe('82,00 kg')
  })

  it('la variación lleva su signo, salvo el cero', () => {
    expect(formatearVariacionDePeso('0.3')).toBe('+0,30 kg')
    expect(formatearVariacionDePeso('-0.15')).toBe('-0,15 kg')
    expect(formatearVariacionDePeso('0')).toBe('0,00 kg')
  })
})

describe('sentidoDeVariacion (C62)', () => {
  it('con objetivo bajar, bajar es bueno y subir es malo', () => {
    expect(sentidoDeVariacion('-0.15', 'bajar')).toBe('buena')
    expect(sentidoDeVariacion('0.3', 'bajar')).toBe('mala')
  })

  it('con objetivo subir, al revés', () => {
    expect(sentidoDeVariacion('0.3', 'subir')).toBe('buena')
    expect(sentidoDeVariacion('-0.15', 'subir')).toBe('mala')
  })

  it('sin objetivo, o si el peso no cambió, es neutra', () => {
    expect(sentidoDeVariacion('0.3', 'ninguno')).toBe('neutra')
    expect(sentidoDeVariacion('-0.15', 'ninguno')).toBe('neutra')
    expect(sentidoDeVariacion('0', 'bajar')).toBe('neutra')
    expect(sentidoDeVariacion(0, 'subir')).toBe('neutra')
  })

  it('un objetivo que la app no conoce es neutro: no decide por su cuenta qué es bueno', () => {
    expect(sentidoDeVariacion('0.3', 'mantener')).toBe('neutra')
  })

  it('el signo es el de la variación redondeada a 10 gramos, como se lee', () => {
    expect(signoDeVariacion('0.3')).toBe(1)
    expect(signoDeVariacion('-0.15')).toBe(-1)
    expect(signoDeVariacion('0.004')).toBe(0)
  })
})

describe('etiquetaDeObjetivo (C58)', () => {
  it('dice el objetivo, o que no tiene', () => {
    expect(etiquetaDeObjetivo('bajar')).toBe('Objetivo: bajar')
    expect(etiquetaDeObjetivo('subir')).toBe('Objetivo: subir')
    expect(etiquetaDeObjetivo('ninguno')).toBe('Sin objetivo')
  })
})
