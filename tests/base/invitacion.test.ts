import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { leerAvisoDeLaUrl } from '../../src/acceso/aviso-de-entrada.ts'
import { errorDe } from './ayudas.ts'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

let base: BaseDePrueba

// El texto de C3, tal cual lo pide la spec.
const TEXTO_C3 = 'Este email no tiene acceso a LemonHouse. Pedile acceso a quien administra la app'

beforeAll(async () => {
  base = await crearBase()
  await base.admin.consultar(`insert into persona (nombre, email) values ('Ana', 'ana@example.com')`)
})

afterAll(async () => {
  await base.cerrar()
})

/** El evento que manda Supabase Auth cuando alguien entra con Google por primera vez. */
function evento(email: string | null) {
  return {
    metadata: { uuid: crypto.randomUUID(), time: new Date().toISOString(), name: 'before-user-created', ip_address: '127.0.0.1' },
    user: {
      id: crypto.randomUUID(),
      aud: 'authenticated',
      role: '',
      email,
      phone: '',
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: { full_name: 'Alguien' },
      identities: [],
      is_anonymous: false,
    },
  }
}

async function preguntarAlHook(email: string | null) {
  const [fila] = await base.authAdmin.consultar<{ respuesta: Record<string, unknown> }>(
    'select public.antes_de_crear_usuario($1::jsonb) as respuesta',
    [JSON.stringify(evento(email))],
  )
  return fila!.respuesta
}

describe('hook de invitación (C3)', () => {
  it('un email no invitado recibe un 403 con el texto de C3 y el email que se intentó usar', async () => {
    expect(await preguntarAlHook('intruso@example.com')).toEqual({
      error: { http_code: 403, message: `${TEXTO_C3} [intruso@example.com]` },
    })
  })

  it('la app reconoce el rechazo en la URL con la que vuelve Supabase, con el email', async () => {
    const respuesta = (await preguntarAlHook('intruso@example.com')) as { error: { message: string } }
    const vuelta = new URL('http://localhost:5173/')
    vuelta.searchParams.set('error', 'access_denied')
    vuelta.searchParams.set('error_description', respuesta.error.message)
    expect(leerAvisoDeLaUrl(vuelta.toString())).toEqual({ mensaje: TEXTO_C3, email: 'intruso@example.com' })
  })

  it('un email invitado pasa, sin importar las mayúsculas', async () => {
    expect(await preguntarAlHook('Ana@Example.COM')).toEqual({})
  })

  it('sin email se rechaza', async () => {
    const respuesta = await preguntarAlHook(null)
    expect(respuesta).toEqual({ error: { http_code: 403, message: `${TEXTO_C3} []` } })
  })

  it('ni alguien con sesión ni el anónimo pueden ejecutarlo, así nadie averigua qué emails están invitados', async () => {
    const sql = 'select public.antes_de_crear_usuario($1::jsonb)'
    const parametros = [JSON.stringify(evento('ana@example.com'))]
    expect((await errorDe(base.conSesion('ana@example.com').consultar(sql, parametros))).code).toBe('42501')
    expect((await errorDe(base.anonimo.consultar(sql, parametros))).code).toBe('42501')
  })

  it('el rol de Supabase Auth solo puede leer el email de las personas', async () => {
    const error = await errorDe(base.authAdmin.consultar('select nombre from public.persona'))
    expect(error.code).toBe('42501')
  })
})
