import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

let base: BaseDePrueba

beforeAll(async () => {
  base = await crearBase({ semillas: true })
})

afterAll(async () => {
  await base.cerrar()
})

describe('semillas de ejemplo (C28)', () => {
  it('cargan sobre las migraciones y dejan datos en cada tabla', async () => {
    for (const tabla of ['persona', 'cuenta', 'instrumento', 'operacion', 'gasto', 'ingreso']) {
      const [fila] = await base.admin.consultar<{ n: string }>(`select count(*) as n from public.${tabla}`)
      expect(Number(fila?.n), tabla).toBeGreaterThan(0)
    }
  })

  it('usan solo emails de example.com (regla 3)', async () => {
    const filas = await base.admin.consultar<{ email: string }>('select email from persona where email is not null')
    expect(filas.length).toBeGreaterThan(0)
    for (const { email } of filas) {
      expect(email).toMatch(/@example\.com$/)
    }
  })

  it('dejan el mes actual con ingresos y gastos en las dos monedas', async () => {
    const [miembro] = await base.admin.consultar<{ email: string }>(
      'select email from persona where email is not null limit 1',
    )
    const filas = await base
      .conSesion(miembro!.email)
      .consultar<{ moneda: string; ingresos: string; gastos: string }>('select * from resumen_mes(current_date)')
    for (const fila of filas) {
      expect(Number(fila.ingresos), fila.moneda).toBeGreaterThan(0)
      expect(Number(fila.gastos), fila.moneda).toBeGreaterThan(0)
    }
  })

  it('dejan posiciones en las dos monedas y alguien sin inversiones', async () => {
    const monedas = await base.admin.consultar<{ moneda: string }>('select distinct moneda from posicion order by 1')
    expect(monedas.map((m) => m.moneda)).toEqual(['ARS', 'USD'])
    const sinInversiones = await base.admin.consultar(
      'select 1 from persona p where not exists (select 1 from posicion x where x.persona_id = p.id)',
    )
    expect(sinInversiones.length).toBeGreaterThan(0)
  })
})
