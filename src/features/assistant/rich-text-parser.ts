/**
 * Parser del markdown ligero que devuelven los modelos: párrafos, viñetas,
 * **negrita** y `código`. Vive aparte del componente para poder probarse solo
 * (y para no romper el Fast Refresh del render).
 */

export type InlineToken = { type: 'text' | 'bold' | 'code'; value: string }
export type Block = { type: 'p'; text: string } | { type: 'ul'; items: string[] }

/** `- item`, `* item`, `• item`, `1. item`, `1) item` */
const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/
const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`/g

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

  for (const raw of text.split(/\r?\n/)) {
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
