/**
 * Las variables que declara el texto de una plantilla, en orden y sin repetir.
 *
 * Meta pide **un ejemplo por variable** para poder aprobar la plantilla, y esos
 * ejemplos viajan como un objeto con la variable por clave
 * (`{ nombre: 'Ana Ruiz' }`). Derivarlos del propio texto es lo que evita el
 * fallo obvio: dos listas de lo mismo —las variables escritas a mano y las que
 * de verdad aparecen en el cuerpo— acaban discrepando, y aquí una discrepancia
 * es una plantilla que Meta rechaza o un envío al que le falta un parámetro.
 *
 * Es el mismo criterio que usa el backend con las plantillas de la plataforma.
 */
const VARIABLE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g

export function parseVariables(...texts: (string | null | undefined)[]): string[] {
  const found: string[] = []
  for (const text of texts) {
    if (!text) continue
    for (const match of text.matchAll(VARIABLE)) {
      const name = match[1]!
      if (!found.includes(name)) found.push(name)
    }
  }
  return found
}

/**
 * Los ejemplos que hay que mandar, quedándose **solo con las variables que el
 * texto usa ahora**.
 *
 * Sin este filtro, borrar una variable del cuerpo dejaría su ejemplo viajando
 * hacia Meta, que lo rechaza por no corresponder a ningún marcador.
 *
 * Devuelve `undefined` cuando no hay ninguna: el campo es opcional en el
 * contrato y un objeto vacío no es lo mismo que no mandarlo.
 */
export function buildExamples(
  text: string | null | undefined,
  values: Record<string, string>,
): Record<string, string> | undefined {
  const names = parseVariables(text)
  if (names.length === 0) return undefined
  const out: Record<string, string> = {}
  for (const name of names) out[name] = values[name]?.trim() ?? ''
  return out
}
