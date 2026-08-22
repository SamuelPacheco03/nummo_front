import type { FeatureMap, LimitMap, PublicPlanCode } from '@/api/generated/model'

const PLAN_LABELS: Record<PublicPlanCode, string> = {
  FREE: 'Free',
  BASIC: 'Básico',
  PRO: 'Pro',
  ENTERPRISE: 'Empresa',
}

export function planLabel(code: string | undefined): string {
  if (!code) return '—'
  return PLAN_LABELS[code as PublicPlanCode] ?? code
}

/**
 * El catálogo de claves, en el orden en que se explican.
 *
 * Se declara una vez porque lo miran las dos caras: «Plan y consumo», que lo
 * enseña al cliente, y la consola de plataforma, que lo negocia. Dos listas
 * paralelas se habrían separado a la primera clave nueva.
 */
export const FEATURE_KEYS: (keyof FeatureMap)[] = [
  'ai_byok',
  'custom_roles',
  'accounting',
  'bank_reconciliation',
  'approvals',
  'api_access',
  'notifications_email',
  'notifications_whatsapp',
  'whatsapp_outbound',
  'whatsapp_byo',
]

/** Primero lo que se acumula (aforos), después lo que se gasta cada mes (cuotas). */
export const LIMIT_KEYS: (keyof LimitMap)[] = [
  'max_contacts',
  'max_users',
  'max_branches',
  'ai_messages_monthly',
  'voice_minutes_monthly',
  'vision_documents_monthly',
  'whatsapp_messages_monthly',
]

const FEATURE_LABELS: Record<keyof FeatureMap, string> = {
  ai_byok: 'usar tu propia llave de IA',
  custom_roles: 'los roles personalizados',
  accounting: 'la contabilidad',
  bank_reconciliation: 'la conciliación bancaria',
  approvals: 'las aprobaciones',
  api_access: 'el acceso por API',
  notifications_email: 'los avisos por correo',
  notifications_whatsapp: 'los avisos por WhatsApp',
  whatsapp_outbound: 'la cobranza por WhatsApp',
  whatsapp_byo: 'usar tu propia cuenta de WhatsApp',
}

/** El nombre de una feature **dentro de una frase**: «tu plan no incluye …». */
export function featureLabel(key: string): string {
  return FEATURE_LABELS[key as keyof FeatureMap] ?? key
}

/** El mismo nombre como título de una fila o columna. */
export function featureTitle(key: string): string {
  const label = featureLabel(key)
  const sinArticulo = label.replace(/^(el|la|los|las) /, '')
  return sinArticulo.charAt(0).toUpperCase() + sinArticulo.slice(1)
}

/**
 * Lo que cuenta cada tope, en plural y en las palabras del usuario.
 *
 * `free_organizations` no está en `LimitMap` a propósito: no es un tope del plan
 * de la organización sino el anti-abuso de organizaciones gratuitas por usuario.
 * Llega por la misma vía —un `LIMIT_EXCEEDED`— y se nombra igual, así que la
 * pantalla no tiene que distinguirlo.
 */
const LIMIT_LABELS: Record<keyof LimitMap | 'free_organizations', string> = {
  max_contacts: 'contactos',
  max_users: 'miembros',
  max_branches: 'sedes',
  ai_messages_monthly: 'mensajes de Numi',
  vision_documents_monthly: 'imágenes leídas',
  voice_minutes_monthly: 'minutos de voz',
  whatsapp_messages_monthly: 'mensajes de cobranza',
  free_organizations: 'organizaciones gratuitas',
}

export function limitLabel(key: string): string {
  return LIMIT_LABELS[key as keyof typeof LIMIT_LABELS] ?? key
}

/**
 * Los topes que se **acumulan por mes** y se reinician solos, frente a los que
 * cuentan filas que existen ahora. Cambia lo que se puede hacer al chocar con
 * uno: un contador se espera; un aforo se libera archivando.
 */
const PERIODIC_LIMITS = new Set<string>([
  'ai_messages_monthly',
  'voice_minutes_monthly',
  // El cupo de cobranza es mensual: chocar con él se arregla esperando al
  // siguiente período, no archivando nada. Es lo que hace que un mensaje
  // saltado por `quota_exceeded` no sea un callejón sin salida.
  'whatsapp_messages_monthly',
])

export function isPeriodicLimit(key: string): boolean {
  return PERIODIC_LIMITS.has(key)
}
