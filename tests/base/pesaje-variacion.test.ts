// Pesaje T3. Cada pesaje con el nombre y el objetivo actuales de quien se pesó
// y la variación contra su pesaje anterior.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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

async function integrante(objetivo = 'ninguno'): Promise<string> {
  contador += 1
  const [fila] = await ana().consultar<{ id: string }>(
    `insert into pesaje_integrante (nombre, objetivo) values ($1, $2) returning id`,
    [`Integrante ${contador}`, objetivo],
  )
  return fila!.id
}

async function pesar(integranteId: string, fecha: string, peso: string): Promise<string> {
  const [fila] = await ana().consultar<{ id: string }>(
    `insert into pesaje (pesaje_integrante_id, fecha, peso) values ($1, $2, $3) returning id`,
    [integranteId, fecha, peso],
  )
  return fila!.id
}

type FilaDeVista = { fecha: string; peso: string; variacion: string | null; nombre: string; objetivo: string; activo: boolean }

const vistaDe = (integranteId: string) =>
  ana().consultar<FilaDeVista>(
    `select to_char(fecha, 'YYYY-MM-DD') as fecha, peso::text, variacion::text, nombre, objetivo, activo
     from pesaje_con_variacion where pesaje_integrante_id = $1 order by fecha`,
    [integranteId],
  )

describe('variación contra el pesaje anterior (C56)', () => {
  it('el primero no tiene variación, y cada uno se compara con el anterior del mismo integrante', async () => {
    const id = await integrante()
    await pesar(id, '2026-10-18', '57.30')
    await pesar(id, '2026-10-04', '57.00')
    await pesar(id, '2026-10-11', '57.15')
    expect((await vistaDe(id)).map(({ fecha, variacion }) => [fecha, variacion])).toEqual([
      ['2026-10-04', null],
      ['2026-10-11', '0.15'],
      ['2026-10-18', '0.15'],
    ])
  })

  it('una semana sin pesaje no cuenta como cero: se compara con el último que hubo', async () => {
    const id = await integrante()
    await pesar(id, '2026-10-04', '4.35')
    await pesar(id, '2026-10-25', '4.20')
    expect((await vistaDe(id)).map((f) => f.variacion)).toEqual([null, '-0.15'])
  })

  it('la variación de alguien no depende de los pesajes de los demás (C57)', async () => {
    const uno = await integrante()
    const otro = await integrante()
    await pesar(uno, '2026-10-04', '60')
    await pesar(otro, '2026-10-11', '4')
    await pesar(uno, '2026-10-18', '61')
    expect((await vistaDe(uno)).map((f) => f.variacion)).toEqual([null, '1'])
    expect((await vistaDe(otro)).map((f) => f.variacion)).toEqual([null])
  })

  it('al editar o borrar un peso, cambia la variación del siguiente (C54)', async () => {
    const id = await integrante()
    await pesar(id, '2026-10-04', '57')
    const medio = await pesar(id, '2026-10-11', '58')
    await pesar(id, '2026-10-18', '58.5')

    await ana().consultar(`update pesaje set peso = 57.5 where id = $1`, [medio])
    expect((await vistaDe(id)).map((f) => f.variacion)).toEqual([null, '0.5', '1'])

    await ana().consultar(`delete from pesaje where id = $1`, [medio])
    expect((await vistaDe(id)).map((f) => f.variacion)).toEqual([null, '1.5'])
  })
})

describe('datos actuales de quien se pesó', () => {
  it('trae el nombre nuevo después de renombrarlo (C47)', async () => {
    const id = await integrante()
    await pesar(id, '2026-10-04', '4.35')
    await ana().consultar(`update pesaje_integrante set nombre = 'Nombre nuevo' where id = $1`, [id])
    expect((await vistaDe(id)).map((f) => f.nombre)).toEqual(['Nombre nuevo'])
  })

  it('trae los pesajes de alguien desactivado (C48)', async () => {
    const id = await integrante()
    await pesar(id, '2026-10-04', '4.35')
    await ana().consultar(`update pesaje_integrante set activo = false where id = $1`, [id])
    expect(await vistaDe(id)).toMatchObject([{ peso: '4.35', activo: false }])
  })

  it('trae el objetivo actual, también para los pesajes viejos (C62)', async () => {
    const id = await integrante('subir')
    await pesar(id, '2026-10-04', '30')
    await pesar(id, '2026-10-11', '30.5')
    await ana().consultar(`update pesaje_integrante set objetivo = 'bajar' where id = $1`, [id])
    expect((await vistaDe(id)).map((f) => f.objetivo)).toEqual(['bajar', 'bajar'])
  })
})

describe('acceso', () => {
  it('sin invitación no se ve nada', async () => {
    await pesar(await integrante(), '2026-10-04', '57')
    const filas = await base.conSesion('intruso@example.com').consultar('select 1 from pesaje_con_variacion')
    expect(filas).toEqual([])
  })
})
