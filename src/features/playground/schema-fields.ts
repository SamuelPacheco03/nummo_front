/**
 * **El esquema de una herramienta, como campos de formulario** — cuando se puede.
 *
 * El catálogo publica el JSON Schema del input de cada herramienta, y con eso se puede
 * ofrecer un formulario en vez de obligar a escribir JSON a mano. Pero solo hasta donde
 * llega la honestidad: un esquema con objetos anidados, listas o uniones **no** se
 * representa con cuatro cajas de texto, y fingir que sí produce argumentos silenciosamente
 * distintos de los que la herramienta espera.
 *
 * Por eso esto devuelve `null` en cuanto encuentra algo que no sabe pintar: ahí la
 * pantalla ofrece el editor de JSON, que siempre puede con todo.
 */

export type SchemaFieldType = 'string' | 'number' | 'boolean' | 'enum'

export interface SchemaField {
  name: string
  type: SchemaFieldType
  /** Valores permitidos, solo en `enum`. */
  options: string[]
  description: string | null
  required: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * El tipo declarado, tolerando `["string", "null"]` — que es como los generadores de
 * esquemas escriben «esto o nada».
 */
function readType(raw: unknown): string | null {
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    const types = raw.filter((t): t is string => typeof t === 'string' && t !== 'null')
    if (types.length === 1) return types[0]
  }
  return null
}

function readField(name: string, raw: unknown, required: boolean): SchemaField | null {
  if (!isRecord(raw)) return null
  const description = typeof raw.description === 'string' ? raw.description : null

  if (Array.isArray(raw.enum)) {
    const options = raw.enum.filter((v): v is string => typeof v === 'string')
    if (options.length !== raw.enum.length) return null
    return { name, type: 'enum', options, description, required }
  }

  const type = readType(raw.type)
  if (type === 'string') return { name, type: 'string', options: [], description, required }
  if (type === 'number' || type === 'integer') {
    return { name, type: 'number', options: [], description, required }
  }
  if (type === 'boolean') return { name, type: 'boolean', options: [], description, required }

  // Objetos, listas, uniones: el editor de JSON.
  return null
}

/** Los campos del esquema, o `null` si no se deja pintar entero. */
export function readSchemaFields(schema: unknown): SchemaField[] | null {
  if (!isRecord(schema)) return null
  const properties = schema.properties
  if (!isRecord(properties)) return null

  const required = Array.isArray(schema.required)
    ? schema.required.filter((r): r is string => typeof r === 'string')
    : []

  const fields: SchemaField[] = []
  for (const [name, raw] of Object.entries(properties)) {
    const field = readField(name, raw, required.includes(name))
    if (!field) return null
    fields.push(field)
  }
  return fields
}

export type FieldValues = Record<string, string | boolean>

/** Valores de partida: todo vacío, los booleanos en falso. */
export function initialValues(fields: SchemaField[]): FieldValues {
  const values: FieldValues = {}
  for (const field of fields) values[field.name] = field.type === 'boolean' ? false : ''
  return values
}

/**
 * De los campos al cuerpo que se manda.
 *
 * Lo que se dejó vacío **no viaja**: mandar `""` donde la herramienta espera un id no es
 * lo mismo que no mandarlo, y el error que devuelve es peor de leer.
 */
export function toArgs(fields: SchemaField[], values: FieldValues): Record<string, unknown> {
  const args: Record<string, unknown> = {}
  for (const field of fields) {
    const value = values[field.name]
    if (field.type === 'boolean') {
      if (value === true) args[field.name] = true
      continue
    }
    const text = typeof value === 'string' ? value.trim() : ''
    if (text === '') continue
    args[field.name] = field.type === 'number' ? Number(text) : text
  }
  return args
}
