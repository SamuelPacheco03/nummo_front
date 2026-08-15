import { expect, test } from 'vitest'
import { canManageOrg, roleLabel } from './roles'

test('canManageOrg: solo OWNER/ADMIN gestionan', () => {
  expect(canManageOrg('OWNER')).toBe(true)
  expect(canManageOrg('ADMIN')).toBe(true)
  expect(canManageOrg('ACCOUNTANT')).toBe(false)
  expect(canManageOrg('OPERATOR')).toBe(false)
  expect(canManageOrg('VIEWER')).toBe(false)
  expect(canManageOrg(undefined)).toBe(false)
})

test('roleLabel traduce roles conocidos y cae a crudo/—', () => {
  expect(roleLabel('OWNER')).toBe('Propietario')
  expect(roleLabel('VIEWER')).toBe('Lector')
  expect(roleLabel(undefined)).toBe('—')
  expect(roleLabel('DESCONOCIDO')).toBe('DESCONOCIDO')
})
