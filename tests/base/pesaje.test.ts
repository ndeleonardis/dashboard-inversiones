// Pesaje T1. Quiénes se pesan y sus pesajes. Es una lista propia, aparte de
// las personas del grupo, y sus reglas las hace cumplir la base.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorDe } from './ayudas.ts'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

const ANA = 'ana@example.com'

let base: BaseDePrueba
let contador = 0

beforeAll(async () => {
  base = await crearBase()
  await base.admin.consultar(`insert into persona (nombre, email) values ('Ana', $1)`, [ANA])
})

afterAll(async () => {
  await base.cerrar()
})

const ana = () => base.conSesion(ANA)

async function integrante(nombre = `Integrante ${++contador}`): Promise<string> {
  const [fila] = await ana().consultar<{ id: string }>(
    `insert into pesaje_integrante (nombre) values ($1) returning id`,
    [nombre],
  )
  return fila!.id
}

function pesar(integranteId: string, peso: string | number, fecha = '2026-11-01') {
  return ana().consultar<{ id: string }>(
    `insert into pesaje (pesaje_integrante_id, fecha, peso) values ($1, $2, $3) returning id`,
    [integranteId, fecha, peso],
  )
}

describe('quiénes se pesan', () => {
  it('no son personas del grupo (C45)', async () => {
    await integrante('Mascota de ejemplo')
    const personas = await base.admin.consultar(`select 1 from persona where nombre = 'Mascota de ejemplo'`)
    expect(personas).toEqual([])
  })

  it('arrancan activos y sin objetivo (C61)', async () => {
    const id = await integrante()
    const [fila] = await ana().consultar<{ objetivo: string; activo: boolean }>(
      'select objetivo, activo from pesaje_integrante where id = $1',
      [id],
    )
    expect(fila).toEqual({ objetivo: 'ninguno', activo: true })
  })

  it('el objetivo es bajar, subir o ninguno (C61)', async () => {
    const id = await integrante()
    for (const objetivo of ['bajar', 'subir', 'ninguno']) {
      await ana().consultar('update pesaje_integrante set objetivo = $2 where id = $1', [id, objetivo])
    }
    const error = await errorDe(ana().consultar(`update pesaje_integrante set objetivo = 'mantener' where id = $1`, [id]))
    expect(error.constraint).toBe('pesaje_integrante_objetivo_valido')
  })

  it('no se repite el nombre, aunque cambien las mayúsculas o los espacios (C46)', async () => {
    await integrante('Beto Ejemplo')
    const error = await errorDe(integrante('  beto ejemplo '))
    expect(error.code).toBe('23505')
    expect(error.message).toContain('pesaje_integrante_nombre_unico')
  })

  it('el nombre no puede quedar en blanco', async () => {
    const error = await errorDe(integrante('   '))
    expect(error.constraint).toBe('pesaje_integrante_nombre_no_vacio')
  })

  it('no se borra si tiene pesajes, y sin pesajes sí (C49)', async () => {
    const conPesajes = await integrante()
    await pesar(conPesajes, 4.35)
    const error = await errorDe(ana().consultar('delete from pesaje_integrante where id = $1', [conPesajes]))
    expect(error.constraint).toBe('pesaje_pesaje_integrante_fk')

    const sinPesajes = await integrante()
    const borrados = await ana().consultar('delete from pesaje_integrante where id = $1 returning id', [sinPesajes])
    expect(borrados).toHaveLength(1)
  })
})

describe('el peso', () => {
  it('se guarda en kg con hasta dos decimales, hasta 300 (C51)', async () => {
    const id = await integrante()
    await pesar(id, '4.35', '2026-10-01')
    await pesar(id, '300', '2026-10-02')
    const filas = await ana().consultar<{ peso: string }>(
      'select peso::text from pesaje where pesaje_integrante_id = $1 order by fecha',
      [id],
    )
    expect(filas.map((f) => f.peso)).toEqual(['4.35', '300'])
  })

  it.each([
    ['0', 'pesaje_peso_valido'],
    ['-1', 'pesaje_peso_valido'],
    ['300.01', 'pesaje_peso_valido'],
    ['57.305', 'pesaje_peso_decimales'],
  ])('rechaza %s (C51)', async (peso, restriccion) => {
    const error = await errorDe(pesar(await integrante(), peso))
    expect(error.constraint).toBe(restriccion)
  })

  it('no admite dos pesos del mismo integrante en la misma fecha (C52)', async () => {
    const id = await integrante()
    await pesar(id, 57.3)
    const error = await errorDe(pesar(id, 57.4))
    expect(error.code).toBe('23505')
    expect(error.message).toContain('pesaje_integrante_fecha_unico')
  })

  it('el mismo día sí admite pesos de integrantes distintos', async () => {
    await pesar(await integrante(), 57.3)
    await pesar(await integrante(), 4.35)
  })

  it('no admite una fecha que pasa de mañana (C53)', async () => {
    const error = await errorDe(
      ana().consultar(
        `insert into pesaje (pesaje_integrante_id, fecha, peso) values ($1, current_date + 2, 57)`,
        [await integrante()],
      ),
    )
    expect(error.code).toBe('LH006')
    expect(error.message).toBe('La fecha del pesaje no puede ser posterior a hoy')
  })

  it('las observaciones son opcionales', async () => {
    const id = await integrante()
    await ana().consultar(
      `insert into pesaje (pesaje_integrante_id, fecha, peso, observaciones) values ($1, '2026-11-01', 4.35, 'Comió antes')`,
      [id],
    )
    await pesar(id, 4.4, '2026-11-02')
  })

  it('queda registrado quién lo cargó (C59)', async () => {
    const [fila] = await pesar(await integrante(), 57)
    const [autoria] = await base.admin.consultar<{ creado_por: string }>('select creado_por from pesaje where id = $1', [
      fila!.id,
    ])
    expect(autoria?.creado_por).toBe(ANA)
  })
})
