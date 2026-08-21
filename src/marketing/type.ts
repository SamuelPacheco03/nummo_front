/**
 * Las tipografías que se comparan en el laboratorio.
 *
 * «Grotesca apretada» no se resuelve eligiendo otra familia: Archivo y Bricolage traen
 * eje de ancho (`font-stretch`, 62–125%), así que lo apretado se pide con el eje y no
 * cambiando de fuente. Por eso cada candidata lleva su propio `stretch`: comparar dos
 * grotescas al mismo ancho óptico es lo único que dice cuál se lee mejor grande.
 *
 * Sora entra como control por la misma razón que la paleta `azul`: es lo que la consola
 * usa hoy en `font-display`, y sin ella la comparación no tiene suelo.
 */
export interface DisplayFace {
  id: DisplayFaceId
  name: string
  /** Valor literal de `font-family`. */
  stack: string
  /** Ancho óptico, solo si la familia tiene eje. */
  stretch?: string
  note: string
}

export type DisplayFaceId = 'sora' | 'archivo' | 'bricolage'

export const DISPLAY_FACES: readonly DisplayFace[] = [
  {
    id: 'sora',
    name: 'Sora',
    stack: "'Sora Variable', ui-sans-serif, system-ui, sans-serif",
    note: 'La de la consola. El control.',
  },
  {
    id: 'archivo',
    name: 'Archivo',
    stack: "'Archivo Variable', ui-sans-serif, system-ui, sans-serif",
    stretch: '84%',
    note: 'Grotesca de rejilla, apretada al 84%. La más neutra de las tres.',
  },
  {
    id: 'bricolage',
    name: 'Bricolage',
    stack: "'Bricolage Grotesque Variable', ui-sans-serif, system-ui, sans-serif",
    stretch: '88%',
    note: 'Grotesca de display, con más carácter en los remates.',
  },
]

/** La serif de los destacados. Una sola: la decisión abierta es la grotesca, no esta. */
export const SERIF_STACK = "'Instrument Serif', ui-serif, Georgia, serif"

export function faceById(id: DisplayFaceId): DisplayFace {
  const found = DISPLAY_FACES.find((f) => f.id === id)
  if (!found) throw new Error(`Tipografía desconocida: ${id}`)
  return found
}
