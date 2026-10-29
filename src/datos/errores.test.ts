import { describe, expect, it } from 'vitest'
import { ErrorDeLaApp, MENSAJE_GENERICO, MENSAJE_SESION_VENCIDA, MENSAJE_SIN_CONEXION, traducirError } from './errores.ts'

describe('borrar algo en uso (C7)', () => {
  it('dice qué tiene en uso a la cuenta', () => {
    expect(
      traducirError({
        code: '23503',
        message:
          'update or delete on table "cuenta" violates foreign key constraint "operacion_cuenta_fk" on table "operacion"',
      }),
    ).toEqual({ mensaje: 'No se puede borrar: esta cuenta tiene operaciones cargadas' })
  })

  it('dice qué tiene en uso a la persona', () => {
    expect(
      traducirError({
        code: '23503',
        message: 'update or delete on table "persona" violates foreign key constraint "cuenta_persona_fk" on table "cuenta"',
      }).mensaje,
    ).toBe('No se puede borrar: esta persona tiene cuentas')
  })

  it('al cambiar la moneda de un instrumento con operaciones, lo explica', () => {
    expect(
      traducirError({
        code: '23503',
        message:
          'update or delete on table "instrumento" violates foreign key constraint "operacion_moneda_instrumento_fk" on table "operacion"',
      }).mensaje,
    ).toBe('No se puede cambiar la moneda: el instrumento tiene operaciones cargadas')
  })

  it('al cambiar el tipo de un instrumento con operaciones, lo marca en el tipo', () => {
    const mensaje = 'No se puede cambiar el tipo: el instrumento tiene operaciones cargadas'
    expect(traducirError({ code: 'LH005', message: mensaje })).toEqual({ mensaje, campo: 'tipo' })
  })

  it('si lo elegido ya no existe al guardar, lo dice en su campo', () => {
    expect(
      traducirError({
        code: '23503',
        message: 'insert or update on table "operacion" violates foreign key constraint "operacion_cuenta_fk"',
      }),
    ).toEqual({ mensaje: 'La cuenta elegida ya no existe. Puede que alguien la haya borrado', campo: 'cuenta_id' })
  })
})

describe('venta sin respaldo (C14)', () => {
  it('arma "La cuenta solo tiene 10 …" con los datos de la base', () => {
    expect(
      traducirError({
        code: 'LH001',
        message: 'La cuenta solo tiene 10 AAPL al 10/02/2026 y la venta es de 15',
        details: JSON.stringify({ operacion_id: 'x', fecha: '2026-02-10', cantidad: 15, disponible: 10, ticker: 'AAPL' }),
      }),
    ).toEqual({ mensaje: 'La cuenta solo tiene 10 AAPL al 10/02/2026 y la venta es de 15', campo: 'cantidad' })
  })

  it('formatea las cantidades con coma decimal', () => {
    expect(
      traducirError({
        code: 'LH001',
        message: '',
        details: JSON.stringify({ fecha: '2026-02-10', cantidad: 0.75, disponible: 0.5, ticker: 'BTC' }),
      }).mensaje,
    ).toBe('La cuenta solo tiene 0,5 BTC al 10/02/2026 y la venta es de 0,75')
  })
})

describe('restricciones de los datos', () => {
  it('un control que falla dice qué corregir y en qué campo', () => {
    expect(
      traducirError({
        code: '23514',
        message: 'new row for relation "instrumento" violates check constraint "instrumento_on_con_vencimiento"',
      }),
    ).toEqual({ mensaje: 'Una ON necesita fecha de vencimiento', campo: 'vencimiento' })
  })

  it('un dato repetido dice cuál', () => {
    expect(
      traducirError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "instrumento_ticker_moneda_unico"',
      }),
    ).toEqual({ mensaje: 'Ya existe ese ticker en esa moneda', campo: 'ticker' })
  })

  it('un dato que falta se marca en su campo', () => {
    expect(
      traducirError({
        code: '23502',
        message: 'null value in column "entidad" of relation "cuenta" violates not-null constraint',
      }),
    ).toEqual({ mensaje: 'Poné el banco o broker', campo: 'entidad' })
  })

  it('los mensajes propios de la base pasan tal cual', () => {
    const mensaje = 'Esta persona entra a la app. Para sacarla, pedíselo a quien administra la copia'
    expect(traducirError({ code: 'LH003', message: mensaje })).toEqual({ mensaje })
  })

  it('sin permiso lo dice', () => {
    expect(traducirError({ code: '42501', message: 'permission denied for table persona' }).mensaje).toBe(
      'No tenés permiso para hacer esto',
    )
  })
})

describe('conexión y sesión', () => {
  it('sin conexión da su propio mensaje', () => {
    expect(traducirError({ code: '', message: 'TypeError: Failed to fetch' })).toEqual({ mensaje: MENSAJE_SIN_CONEXION })
    expect(traducirError(new TypeError('Load failed'))).toEqual({ mensaje: MENSAJE_SIN_CONEXION })
  })

  it('una sesión vencida da su propio mensaje', () => {
    expect(traducirError({ code: 'PGRST303', message: 'JWT expired' })).toEqual({ mensaje: MENSAJE_SESION_VENCIDA })
  })
})

describe('nunca se muestra texto de Postgres (regla 1)', () => {
  it('un error desconocido da el texto genérico', () => {
    expect(traducirError({ code: 'XX000', message: 'internal error' })).toEqual({ mensaje: MENSAJE_GENERICO })
    expect(traducirError(new Error('something broke'))).toEqual({ mensaje: MENSAJE_GENERICO })
    expect(traducirError('boom')).toEqual({ mensaje: MENSAJE_GENERICO })
    expect(traducirError(null)).toEqual({ mensaje: MENSAJE_GENERICO })
  })

  it('una restricción sin mensaje también da el genérico', () => {
    expect(
      traducirError({ code: '23514', message: 'new row for relation "x" violates check constraint "x_desconocida"' }),
    ).toEqual({ mensaje: MENSAJE_GENERICO })
  })

  it('los errores propios de la app pasan con su campo', () => {
    expect(traducirError(new ErrorDeLaApp('No se encontró', 'monto'))).toEqual({ mensaje: 'No se encontró', campo: 'monto' })
  })
})
