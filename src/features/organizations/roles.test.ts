import { expect, test } from 'vitest'
import { roleLabel } from './roles'

test('roleLabel traduce roles conocidos y cae a crudo/—', () => {
  expect(roleLabel('OWNER')).toBe('Propietario')
  expect(roleLabel('VIEWER')).toBe('Lector')
  expect(roleLabel(undefined)).toBe('—')
  expect(roleLabel('DESCONOCIDO')).toBe('DESCONOCIDO')
})
