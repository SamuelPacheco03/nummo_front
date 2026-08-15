import { expect, test } from 'vitest'
import type { Contact } from '@/api/generated/model'
import { contactText, contactTypeLabel, documentText } from './utils'

const base: Contact = {
  id: '1',
  contactType: 'PERSON',
  displayName: 'Ana Ruiz',
  firstName: 'Ana',
  lastName: 'Ruiz',
  companyName: null,
  documentType: 'CC',
  documentNumber: '123456',
  email: 'ana@example.com',
  phone: '3001234567',
  address: null,
  notes: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

test('contactTypeLabel', () => {
  expect(contactTypeLabel('PERSON')).toBe('Persona')
  expect(contactTypeLabel('COMPANY')).toBe('Empresa')
})

test('documentText', () => {
  expect(documentText(base)).toBe('CC 123456')
  expect(documentText({ ...base, documentNumber: null })).toBe('—')
  expect(documentText({ ...base, documentType: null })).toBe('123456')
})

test('contactText', () => {
  expect(contactText(base)).toBe('ana@example.com · 3001234567')
  expect(contactText({ ...base, email: null, phone: null })).toBe('—')
})
