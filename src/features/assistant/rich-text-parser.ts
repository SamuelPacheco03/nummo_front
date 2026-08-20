/**
 * Parser del markdown ligero que devuelven los modelos: párrafos, viñetas,
 * **negrita** y `código`. Vive aparte del componente para poder probarse solo
 * (y para no romper el Fast Refresh del render).
 */

type InlineToken = { type: 'text' | 'bold' | 'code'; value: string }
type Block = { type: 'p'; text: string } | { type: 'ul'; items: string[] }

/** `- item`, `* item`, `• item`, `1. item`, `1) item` */
const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/
const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`/g

/**
 * **La costura entre dos generaciones.**
 *
 * Un turno de Numi no siempre es un solo texto: primero dice lo que va a hacer
 * («Déjame revisar tu situación…»), consulta los datos y después contesta. Las dos
 * partes llegan por el mismo flujo, trozo a trozo, y el servidor no separa la una de
 * la otra: lo que se lee es «…lo más urgente!Con datos de hoy…», dos frases pegadas
 * sin ni un espacio.
 *
 * Eso —punto, cierre de exclamación o de interrogación y **acto seguido** una
 * mayúscula, sin nada en medio— no lo escribe un modelo dentro de una misma
 * respuesta: es siempre la juntura. Así que ahí va el párrafo.
 *
 * Se exige minúscula (o un cierre de comilla o paréntesis) **antes** del punto a
 * propósito: sin eso, «Semillas S.A.S.» y «J.P. Morgan» se partirían por la mitad,
 * que es el error que este arreglo no puede permitirse.
 *
 * Los `*` de la negrita se saltan, porque la segunda parte suele empezar en negrita.
 * Dos asteriscos abren la segunda y se quedan con ella; cuatro son dos que cierran la
 * primera y dos que abren la segunda, y ahí el corte va por el medio.
 *
 * Lo correcto sería que el flujo marcase el corte; está pedido en
 * `contract/HANDOFF-numi-streaming.md`. Mientras tanto, esto se lee.
 */
const GLUED = /([a-záéíóúüñ)\]»”"'][.!?…])(\*\*(?=\*\*))?(?=\**[¡¿A-ZÁÉÍÓÚÜÑ])/g

export function splitGlued(text: string): string {
  return text.replace(GLUED, '$1$2\n\n')
}

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let last = 0
  for (const match of text.matchAll(INLINE)) {
    const start = match.index
    if (start > last) tokens.push({ type: 'text', value: text.slice(last, start) })
    tokens.push(
      match[1] !== undefined
        ? { type: 'bold', value: match[1] }
        : { type: 'code', value: match[2] },
    )
    last = start + match[0].length
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) })
  return tokens
}

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  let items: string[] = []
  let lines: string[] = []

  const closeList = () => {
    if (items.length) blocks.push({ type: 'ul', items })
    items = []
  }
  const closeParagraph = () => {
    if (lines.length) blocks.push({ type: 'p', text: lines.join('\n') })
    lines = []
  }

  for (const raw of splitGlued(text).split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      closeList()
      closeParagraph()
      continue
    }
    const bullet = BULLET.exec(line)
    if (bullet) {
      closeParagraph()
      items.push(bullet[1])
      continue
    }
    closeList()
    lines.push(line)
  }
  closeList()
  closeParagraph()
  return blocks
}
