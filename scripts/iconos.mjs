// Genera los íconos de la app instalable (T28) a partir de un mismo dibujo:
// un limón en negro sobre el fondo rosa (DESIGN.md, "App instalable").
//
//   npm run iconos
//
// Escribe en public/iconos/ el ícono de la pestaña en SVG, los de 192 y 512 px,
// y el adaptable de 512 px. El adaptable deja el limón dentro del círculo que
// Android nunca recorta. Los PNG se arman acá mismo, sin dependencias.
import { mkdirSync, writeFileSync } from 'node:fs'
import { crc32, deflateSync } from 'node:zlib'

const FONDO = '#F9D2E5'
const TINTA = '#0D0C11'
const CARPETA = 'public/iconos'

// El dibujo, centrado en el origen. El limón apunta arriba a la derecha.
const GIRO = -35
const EJE = [Math.cos((GIRO * Math.PI) / 180), Math.sin((GIRO * Math.PI) / 180)]
const ARRIBA = [EJE[1], -EJE[0]] // perpendicular al eje, hacia arriba a la izquierda
const en = (largo, alto = 0) => [EJE[0] * largo + ARRIBA[0] * alto, EJE[1] * largo + ARRIBA[1] * alto]

// Cada forma es una elipse o una hoja (lo que comparten dos círculos), y las
// que van después pintan encima.
const DIBUJO = [
  { forma: 'elipse', centro: [0, 0], rx: 30, ry: 22, giro: GIRO, color: TINTA },
  { forma: 'elipse', centro: en(30), rx: 4.5, ry: 3.6, giro: GIRO, color: TINTA }, // puntas
  { forma: 'elipse', centro: en(-30), rx: 4.5, ry: 3.6, giro: GIRO, color: TINTA },
  { forma: 'hoja', desde: [24.5, -24], hasta: [12, -39], ancho: 8, color: TINTA },
  // El brillo es una media luna: una elipse rosa que otra negra tapa por abajo.
  { forma: 'elipse', centro: en(-6, 13.5), rx: 12, ry: 3.4, giro: GIRO, color: FONDO },
  { forma: 'elipse', centro: en(-6, 10.5), rx: 13, ry: 3.4, giro: GIRO, color: TINTA },
]

function hoja({ desde, hasta, ancho }) {
  // Dos círculos de radio r cuyos bordes se cruzan en las dos puntas.
  const [dx, dy] = [hasta[0] - desde[0], hasta[1] - desde[1]]
  const largo = Math.hypot(dx, dy)
  const mitad = ancho / 2
  const r = (largo ** 2 / 4 + mitad ** 2) / (2 * mitad)
  const [mx, my] = [(desde[0] + hasta[0]) / 2, (desde[1] + hasta[1]) / 2]
  const [nx, ny] = [-dy / largo, dx / largo]
  const d = r - mitad
  return { r, centros: [[mx + nx * d, my + ny * d], [mx - nx * d, my - ny * d]] }
}

function adentro(forma, x, y) {
  if (forma.forma === 'elipse') {
    const giro = (-forma.giro * Math.PI) / 180
    const [px, py] = [x - forma.centro[0], y - forma.centro[1]]
    const u = px * Math.cos(giro) - py * Math.sin(giro)
    const v = px * Math.sin(giro) + py * Math.cos(giro)
    return (u / forma.rx) ** 2 + (v / forma.ry) ** 2 <= 1
  }
  const { r, centros } = hoja(forma)
  return centros.every(([cx, cy]) => Math.hypot(x - cx, y - cy) <= r)
}

function colorEn(x, y) {
  let color = null
  for (const forma of DIBUJO) if (adentro(forma, x, y)) color = forma.color
  return color
}

// El centro y el tamaño de lo pintado de negro, para ubicarlo en cada ícono.
function medidas() {
  const puntos = []
  for (let x = -60; x <= 60; x += 0.25) {
    for (let y = -60; y <= 60; y += 0.25) if (colorEn(x, y) === TINTA) puntos.push([x, y])
  }
  const xs = puntos.map(([x]) => x)
  const ys = puntos.map(([, y]) => y)
  const centro = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
  return {
    centro,
    lado: Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)),
    radio: Math.max(...puntos.map(([x, y]) => Math.hypot(x - centro[0], y - centro[1]))),
  }
}

const MEDIDAS = medidas()

// Cuánto se agranda el dibujo para un ícono de `tamaño` px. El común ocupa el
// 78 % del lado. El adaptable entra en un círculo del 72 % del lado, adentro
// del 80 % que Android deja sin recortar.
const escala = (tamaño, adaptable) =>
  adaptable ? (tamaño * 0.36) / MEDIDAS.radio : (tamaño * 0.78) / MEDIDAS.lado

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

function pixeles(tamaño, adaptable) {
  const s = escala(tamaño, adaptable)
  const muestras = 4 // por lado, para suavizar los bordes
  const fondo = rgb(FONDO)
  const datos = Buffer.alloc(tamaño * tamaño * 3)
  for (let fila = 0; fila < tamaño; fila++) {
    for (let col = 0; col < tamaño; col++) {
      const suma = [0, 0, 0]
      for (let i = 0; i < muestras; i++) {
        for (let j = 0; j < muestras; j++) {
          const x = (col + (j + 0.5) / muestras - tamaño / 2) / s + MEDIDAS.centro[0]
          const y = (fila + (i + 0.5) / muestras - tamaño / 2) / s + MEDIDAS.centro[1]
          const color = colorEn(x, y)
          const [r, g, b] = color ? rgb(color) : fondo
          suma[0] += r
          suma[1] += g
          suma[2] += b
        }
      }
      suma.forEach((total, canal) => (datos[(fila * tamaño + col) * 3 + canal] = Math.round(total / muestras ** 2)))
    }
  }
  return datos
}

function png(tamaño, datos) {
  const bloque = (tipo, contenido) => {
    const largo = Buffer.alloc(4)
    largo.writeUInt32BE(contenido.length)
    const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), contenido])
    const control = Buffer.alloc(4)
    control.writeUInt32BE(crc32(cuerpo))
    return Buffer.concat([largo, cuerpo, control])
  }
  const cabecera = Buffer.alloc(13)
  cabecera.writeUInt32BE(tamaño, 0)
  cabecera.writeUInt32BE(tamaño, 4)
  cabecera[8] = 8 // bits por canal
  cabecera[9] = 2 // RGB
  // Cada fila empieza con el filtro 0, que deja los bytes tal cual.
  const ancho = tamaño * 3
  const filas = Buffer.alloc((ancho + 1) * tamaño)
  for (let fila = 0; fila < tamaño; fila++) datos.copy(filas, fila * (ancho + 1) + 1, fila * ancho, (fila + 1) * ancho)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', cabecera),
    bloque('IDAT', deflateSync(filas, { level: 9 })),
    bloque('IEND', Buffer.alloc(0)),
  ])
}

function svg() {
  const lado = 100
  const s = escala(lado, false)
  const n = (valor) => Number(valor.toFixed(2))
  const formas = DIBUJO.map((forma) => {
    if (forma.forma === 'elipse') {
      const [cx, cy] = forma.centro.map(n)
      return `<ellipse cx="${cx}" cy="${cy}" rx="${forma.rx}" ry="${forma.ry}" transform="rotate(${forma.giro} ${cx} ${cy})" fill="${forma.color}"/>`
    }
    const { r } = hoja(forma)
    const [a, b] = [forma.desde.map(n), forma.hasta.map(n)]
    return `<path d="M${a} A${n(r)} ${n(r)} 0 0 1 ${b} A${n(r)} ${n(r)} 0 0 1 ${a}Z" fill="${forma.color}"/>`
  })
  const mover = [lado / 2 - s * MEDIDAS.centro[0], lado / 2 - s * MEDIDAS.centro[1]].map(n)
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}">`,
    `<rect width="${lado}" height="${lado}" rx="22" fill="${FONDO}"/>`,
    `<g transform="translate(${mover.join(' ')}) scale(${n(s)})">`,
    ...formas,
    '</g>',
    '</svg>',
    '',
  ].join('\n')
}

mkdirSync(CARPETA, { recursive: true })
writeFileSync(`${CARPETA}/icono.svg`, svg())
for (const [archivo, tamaño, adaptable] of [
  ['icono-192.png', 192, false],
  ['icono-512.png', 512, false],
  ['icono-adaptable-512.png', 512, true],
]) {
  writeFileSync(`${CARPETA}/${archivo}`, png(tamaño, pixeles(tamaño, adaptable)))
  console.log(`${CARPETA}/${archivo}`)
}
console.log(`${CARPETA}/icono.svg`)
