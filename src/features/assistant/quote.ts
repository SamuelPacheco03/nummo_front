/**
 * **La cita, ida y vuelta.**
 *
 * Viaja dentro del texto del mensaje en formato `>` de markdown, y no como un campo
 * aparte, por una razón concreta: así **Numi la lee**. Un campo `replyTo` obligaría a
 * inyectarlo en el prompt a mano, y lo que se quiere es justo que el modelo vea a qué se
 * refiere la pregunta.
 *
 * Que además se pinte como un bloque —y no como un `>` suelto— es cosa de quien lo
 * dibuja: aquí solo se define el formato y cómo volver a partirlo.
 */

/** Quién dijo lo que se cita. Son dos literales nuestros, y por eso se pueden reconocer. */
export type QuoteAuthor = 'Numi' | 'Tú'

export interface Quoted {
  author: QuoteAuthor
  /** Lo citado, ya recortado a lo que cabe en un bloque. */
  quote: string
  /** Lo que la persona escribió debajo. */
  text: string
}

/** Lo que se enseña de un mensaje citado: lo justo para reconocerlo. */
const QUOTE_LENGTH = 160

const AUTHORS: QuoteAuthor[] = ['Numi', 'Tú']

/** Recorta la cita y le quita los saltos: en un bloque de dos líneas no caben. */
export function trimQuote(text: string): string {
  const flat = text.trim().replace(/\s+/g, ' ')
  return flat.length > QUOTE_LENGTH ? `${flat.slice(0, QUOTE_LENGTH - 1)}…` : flat
}

/** Arma el mensaje que sale hacia el servidor: la cita arriba y la pregunta debajo. */
export function withQuote(quoted: { author: QuoteAuthor; quote: string }, text: string): string {
  return `> ${quoted.author}: ${quoted.quote}\n\n${text}`
}

/**
 * Vuelve a partir un mensaje en cita y texto, o null si no lleva ninguna.
 *
 * Se exige el autor —uno de los dos nuestros— y no solo el `>`: un mensaje que alguien
 * empiece con «> » a mano no es una cita de esta aplicación, y pintarlo como tal sería
 * inventarle un origen que no tiene.
 */
export function splitQuote(content: string): Quoted | null {
  const [first, ...rest] = content.split('\n')
  if (!first?.startsWith('> ')) return null

  const head = first.slice(2)
  const author = AUTHORS.find((a) => head.startsWith(`${a}: `))
  if (!author) return null

  return {
    author,
    quote: head.slice(author.length + 2),
    // Entre la cita y la pregunta va una línea en blanco; lo que sobre se limpia.
    text: rest.join('\n').trimStart(),
  }
}
