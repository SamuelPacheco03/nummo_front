import type { Contact } from '@/api/generated/model'

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  PERSON: 'Persona',
  COMPANY: 'Empresa',
}

export function contactTypeLabel(type: string): string {
  return CONTACT_TYPE_LABELS[type] ?? type
}

export function documentText(c: Contact): string {
  if (!c.documentNumber) return '—'
  return [c.documentType, c.documentNumber].filter(Boolean).join(' ')
}

export function contactText(c: Contact): string {
  return [c.email, c.phone].filter(Boolean).join(' · ') || '—'
}
