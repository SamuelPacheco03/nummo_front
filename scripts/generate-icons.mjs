/**
 * Genera los iconos de la PWA (y el favicon) a partir de `brand/logo_nummo.png`.
 *
 * El original (1254px, 774KB) vive fuera de `public/` para no acabar en el deploy:
 * a la web solo van los derivados ya optimizados.
 *
 * El PNG original viene sin canal alfa: el logo está compuesto sobre blanco.
 * Como la marca es 100% saturada y el fondo es gris/blanco puro, recuperamos el
 * alfa desde la saturación (max-min de RGB) y "des-componemos" el color sobre
 * blanco para que los bordes antialiased no dejen halo claro en modo oscuro.
 *
 * Uso: pnpm icons:gen
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = path.join(root, 'public')
const ICONS = path.join(PUBLIC, 'icons')
const SOURCE = path.join(root, 'brand', 'logo_nummo.png')

/** Fondo de los iconos "any": el logo se diseñó sobre blanco. */
const BG = { r: 255, g: 255, b: 255, alpha: 1 }

/** Umbral de saturación por debajo del cual el píxel se considera fondo. */
const SAT_FLOOR = 6
/** Pendiente de la rampa alfa (satura rápido para no comerse el borde). */
const SAT_GAIN = 8

/** Devuelve el logo recortado y con fondo transparente, como buffer PNG. */
async function buildTransparentMark() {
  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const out = Buffer.alloc(data.length)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const sat = Math.max(r, g, b) - Math.min(r, g, b)
    const a = Math.min(255, Math.max(0, (sat - SAT_FLOOR) * SAT_GAIN))

    if (a === 0) {
      out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0
      continue
    }
    // c_original = (c_compuesto - 255 * (1 - a)) / a
    const k = a / 255
    out[i] = Math.min(255, Math.max(0, Math.round((r - 255 * (1 - k)) / k)))
    out[i + 1] = Math.min(255, Math.max(0, Math.round((g - 255 * (1 - k)) / k)))
    out[i + 2] = Math.min(255, Math.max(0, Math.round((b - 255 * (1 - k)) / k)))
    out[i + 3] = a
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer()
}

/**
 * Compone la marca centrada en un lienzo cuadrado.
 * @param ratio proporción del lado que ocupa el logo (1 = sin margen).
 */
async function square(mark, size, { ratio = 1, background = null } = {}) {
  const inner = Math.round(size * ratio)
  const resized = await sharp(mark)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer()
}

/**
 * Empaqueta varios PNG en un .ico. El formato admite PNG embebido desde Vista,
 * así que no hace falta bitmap crudo. Lo servimos porque el navegador pide
 * `/favicon.ico` por su cuenta cuando el <link> falla o está cacheado a un
 * icono viejo, y ahí un 404 se ve como el globo genérico.
 */
function buildIco(frames) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reservado
  header.writeUInt16LE(1, 2) // 1 = icono
  header.writeUInt16LE(frames.length, 4)

  const directory = Buffer.alloc(16 * frames.length)
  let offset = header.length + directory.length

  frames.forEach(({ size, png }, i) => {
    const at = i * 16
    directory[at] = size >= 256 ? 0 : size // 0 significa 256
    directory[at + 1] = size >= 256 ? 0 : size
    directory[at + 2] = 0 // colores de la paleta (0 = sin paleta)
    directory[at + 3] = 0 // reservado
    directory.writeUInt16LE(1, at + 4) // planos
    directory.writeUInt16LE(32, at + 6) // bits por píxel
    directory.writeUInt32LE(png.length, at + 8)
    directory.writeUInt32LE(offset, at + 12)
    offset += png.length
  })

  return Buffer.concat([header, directory, ...frames.map((f) => f.png)])
}

async function main() {
  await mkdir(ICONS, { recursive: true })
  const mark = await buildTransparentMark()

  // Marca transparente para la UI (sidebar, login) — sirve en claro y oscuro.
  // 256px basta: en la UI se pinta a 28-44px (holgado incluso a 3x de DPR).
  await writeFile(path.join(PUBLIC, 'logo-mark.png'), await square(mark, 256, { ratio: 0.96 }))

  // Iconos "any": fondo blanco, el logo casi a sangre.
  await writeFile(
    path.join(ICONS, 'icon-192.png'),
    await square(mark, 192, { ratio: 0.82, background: BG }),
  )
  await writeFile(
    path.join(ICONS, 'icon-512.png'),
    await square(mark, 512, { ratio: 0.82, background: BG }),
  )

  // Maskable: Android recorta hasta un 20% por lado → el logo va al 60% (zona segura).
  await writeFile(
    path.join(ICONS, 'maskable-192.png'),
    await square(mark, 192, { ratio: 0.6, background: BG }),
  )
  await writeFile(
    path.join(ICONS, 'maskable-512.png'),
    await square(mark, 512, { ratio: 0.6, background: BG }),
  )

  // iOS no respeta transparencia en el icono de inicio: fondo blanco explícito.
  await writeFile(
    path.join(PUBLIC, 'apple-touch-icon.png'),
    await square(mark, 180, { ratio: 0.8, background: BG }),
  )

  // Favicons PNG para el <link>, e .ico para la petición implícita del navegador.
  await writeFile(path.join(PUBLIC, 'favicon-32.png'), await square(mark, 32, { ratio: 1 }))
  await writeFile(path.join(PUBLIC, 'favicon-96.png'), await square(mark, 96, { ratio: 1 }))

  const icoSizes = [16, 32, 48]
  const frames = await Promise.all(
    icoSizes.map(async (size) => ({ size, png: await square(mark, size, { ratio: 1 }) })),
  )
  await writeFile(path.join(PUBLIC, 'favicon.ico'), buildIco(frames))

  console.log('Iconos generados en public/ y public/icons/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
