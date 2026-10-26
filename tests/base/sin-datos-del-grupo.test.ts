// Regla 6: nada específico de un grupo en el código. Personas, bancos, brokers
// y categorías son datos de la base, así que el código de la app no puede
// tener sus nombres escritos.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buscarNombresDelGrupo } from '../../scripts/guardas.ts'
import { crearBase, type BaseDePrueba } from './crear-base.ts'

let base: BaseDePrueba

beforeAll(async () => {
  base = await crearBase({ semillas: true })
})

afterAll(async () => {
  await base.cerrar()
})

function archivosDeLaApp(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name)
    if (entrada.isDirectory()) return archivosDeLaApp(ruta)
    const esCodigo = /\.(ts|tsx)$/.test(entrada.name) && !/\.test\.(ts|tsx)$/.test(entrada.name)
    return esCodigo ? [ruta] : []
  })
}

describe('sin datos de un grupo en el código (regla 6)', () => {
  it('ningún texto del código de src/ es un nombre de las semillas o de las categorías', async () => {
    const filas = await base.admin.consultar<{ nombre: string }>(
      `select nombre from tipo_gasto
       union select nombre from tipo_ingreso
       union select nombre from tipo_cuenta
       union select nombre from persona
       union select email from persona where email is not null
       union select entidad from cuenta
       union select nombre from cuenta where nombre is not null`,
    )
    const nombres = filas.map((f) => f.nombre)
    expect(nombres).toContain('Súper')

    const hallazgos = archivosDeLaApp('src').flatMap((archivo) =>
      buscarNombresDelGrupo(readFileSync(archivo, 'utf8'), nombres).map((nombre) => `${archivo}: ${nombre}`),
    )
    expect(hallazgos).toEqual([])
  })
})
