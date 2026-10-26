import { describe, expect, it } from 'vitest'
import {
  buscarEmailsReales,
  buscarNombresDelGrupo,
  buscarSecretos,
  revisarRepo,
  revisarRuta,
} from '../../scripts/guardas.ts'

// Los textos falsos se arman con concatenaciones para que este mismo archivo
// no tenga nada con forma de secreto o de email real cuando se revisa el repo.
const jwtFalso = ['eyJ' + 'x'.repeat(16), 'eyJ' + 'y'.repeat(16), 'z'.repeat(16)].join('.')

describe('detectores de secretos (regla 7)', () => {
  it('detecta un token JWT', () => {
    expect(buscarSecretos(`clave = "${jwtFalso}"`)).toEqual(['token JWT'])
  })

  it('detecta una clave secreta de Supabase', () => {
    expect(buscarSecretos('sb_' + 'secret_' + 'a'.repeat(24))).toEqual(['clave secreta de Supabase'])
  })

  it('detecta un token personal de Supabase', () => {
    expect(buscarSecretos('sbp' + '_' + 'a1'.repeat(20))).toEqual(['token personal de Supabase'])
  })

  it('detecta un secreto de cliente de Google', () => {
    expect(buscarSecretos('GOCSPX' + '-' + 'b'.repeat(24))).toEqual(['secreto de Google'])
  })

  it('detecta una contraseña dentro de una URL de Postgres', () => {
    expect(buscarSecretos('postgresql://postgres' + ':clave123' + '@db.ejemplo:5432/postgres')).toEqual([
      'contraseña en una URL de Postgres',
    ])
  })

  it('no confunde un marcador de lugar con una contraseña', () => {
    expect(buscarSecretos('postgresql://postgres:[TU-CONTRASEÑA]@db.example.com:5432/postgres')).toEqual([])
  })

  it('detecta una clave privada', () => {
    expect(buscarSecretos('-----BEGIN ' + 'PRIVATE KEY-----')).toEqual(['clave privada'])
  })

  it('no marca texto común', () => {
    expect(buscarSecretos('const total = sumar(a, b) // en pesos')).toEqual([])
  })
})

describe('detector de emails reales (regla 3)', () => {
  it('marca un email de un dominio real', () => {
    expect(buscarEmailsReales('escribile a ana' + '@' + 'gmail.com')).toEqual(['ana' + '@' + 'gmail.com'])
  })

  it('deja pasar los dominios reservados para ejemplos', () => {
    expect(buscarEmailsReales('ana@example.com, beto@demo.example.org, caro@example.net')).toEqual([])
  })
})

describe('detector de rutas prohibidas (reglas 3 y 7)', () => {
  it('rechaza un Excel fuera de data/sample/', () => {
    expect(revisarRuta('docs/Inversiones.xlsx')).toBe('Excel fuera de data/sample/')
  })

  it('acepta un Excel de ejemplo', () => {
    expect(revisarRuta('data/sample/datos_demo.xlsx')).toBeNull()
  })

  it('rechaza cualquier archivo de data/real/', () => {
    expect(revisarRuta('data/real/datos.json')).toBe('archivo de datos reales')
  })

  it('rechaza un archivo de entorno que no sea la plantilla', () => {
    expect(revisarRuta('.env.production')).toBe('archivo de entorno con valores')
    expect(revisarRuta('.env')).toBe('archivo de entorno con valores')
    expect(revisarRuta('.env.example')).toBeNull()
  })
})

describe('detector de datos de un grupo en el código (regla 6)', () => {
  const nombres = ['Súper', 'Banco Ejemplo', 'Ana Ejemplo']

  it('marca un texto literal igual a un nombre de los datos', () => {
    const codigo = `const categoria = 'súper'\nif (cuenta.entidad === "Banco Ejemplo") {}`
    expect(buscarNombresDelGrupo(codigo, nombres)).toEqual(['súper', 'Banco Ejemplo'])
  })

  it('marca un texto de JSX igual a un nombre de los datos', () => {
    expect(buscarNombresDelGrupo('<option> Ana Ejemplo </option>', nombres)).toEqual(['Ana Ejemplo'])
  })

  it('no marca un texto que solo contiene el nombre', () => {
    const codigo = `const ayuda = 'Por ejemplo, el súper del barrio'\n<p>Banco Ejemplo y otros</p>`
    expect(buscarNombresDelGrupo(codigo, nombres)).toEqual([])
  })
})

describe('repositorio', () => {
  it('ningún archivo versionado tiene secretos, emails reales ni datos reales', () => {
    const hallazgos = revisarRepo()
    expect(hallazgos.map((h) => `${h.archivo}:${h.linea} ${h.motivo}`)).toEqual([])
  })
})
