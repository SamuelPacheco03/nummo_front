import { expect, test } from 'vitest'
import { initialValues, readSchemaFields, toArgs } from './schema-fields'

test('un esquema plano se convierte en campos', () => {
  const fields = readSchemaFields({
    type: 'object',
    properties: {
      contactId: { type: 'string', description: 'A quién' },
      amount: { type: 'number' },
      confirmed: { type: 'boolean' },
      purpose: { enum: ['RECEIVABLE', 'ADVANCE'] },
    },
    required: ['contactId', 'amount'],
  })

  expect(fields).toEqual([
    { name: 'contactId', type: 'string', options: [], description: 'A quién', required: true },
    { name: 'amount', type: 'number', options: [], description: null, required: true },
    { name: 'confirmed', type: 'boolean', options: [], description: null, required: false },
    {
      name: 'purpose',
      type: 'enum',
      options: ['RECEIVABLE', 'ADVANCE'],
      description: null,
      required: false,
    },
  ])
})

test('«esto o nada» sigue siendo su tipo', () => {
  const fields = readSchemaFields({
    type: 'object',
    properties: { note: { type: ['string', 'null'] } },
  })

  expect(fields?.[0]).toMatchObject({ name: 'note', type: 'string' })
})

test('lo que no se puede pintar entero no se pinta a medias', () => {
  // Un objeto anidado con cuatro cajas de texto manda argumentos que no son los que la
  // herramienta espera. Ahí la pantalla ofrece el editor de JSON.
  expect(
    readSchemaFields({
      type: 'object',
      properties: { allocations: { type: 'array', items: { type: 'object' } } },
    }),
  ).toBeNull()

  expect(readSchemaFields({ type: 'object', properties: { filter: { type: 'object' } } })).toBeNull()
  expect(readSchemaFields(null)).toBeNull()
  expect(readSchemaFields({ type: 'string' })).toBeNull()
})

test('una herramienta sin argumentos es un formulario sin campos, no un fallo', () => {
  expect(readSchemaFields({ type: 'object', properties: {} })).toEqual([])
})

test('lo que se dejó vacío no viaja', () => {
  const fields = readSchemaFields({
    type: 'object',
    properties: {
      contactId: { type: 'string' },
      note: { type: 'string' },
      amount: { type: 'number' },
      confirmed: { type: 'boolean' },
    },
  })!

  const values = { ...initialValues(fields), contactId: 'c1', amount: '1500', confirmed: true }
  expect(toArgs(fields, values)).toEqual({ contactId: 'c1', amount: 1500, confirmed: true })
})

test('un booleano en falso tampoco viaja: no es lo mismo que decir que no', () => {
  const fields = readSchemaFields({ type: 'object', properties: { confirmed: { type: 'boolean' } } })!
  expect(toArgs(fields, initialValues(fields))).toEqual({})
})
