import { expect, test } from 'vitest'
import type { FeatureMap, LimitMap } from '@/api/generated/model'
import { FEATURE_KEYS, LIMIT_KEYS, featureLabel, limitLabel } from './labels'

/*
  `LIMIT_KEYS` y `FEATURE_KEYS` son la lista **única** que recorren las tarjetas
  de plan y los medidores de consumo. Una clave que el contrato estrene y no
  entre aquí no rompe nada visible: simplemente deja de verse, que es justo lo
  que pasó con el cupo de cobranza — el tope existía en `me/capabilities` y en
  las tarjetas, y en «Plan y consumo» no aparecía.

  Los objetos de abajo van tipados contra el contrato, así que una clave nueva
  rompe `tsc` aquí y estas pruebas dicen cuál falta por nombre.
*/

const TOPES: Record<keyof LimitMap, true> = {
  max_contacts: true,
  max_users: true,
  max_branches: true,
  ai_messages_monthly: true,
  voice_minutes_monthly: true,
  vision_documents_monthly: true,
  whatsapp_messages_monthly: true,
}

const FUNCIONES: Record<keyof FeatureMap, true> = {
  ai_byok: true,
  custom_roles: true,
  accounting: true,
  bank_reconciliation: true,
  approvals: true,
  api_access: true,
  notifications_email: true,
  notifications_whatsapp: true,
  whatsapp_outbound: true,
  whatsapp_byo: true,
}

test('ningún tope del contrato se queda fuera de la lista que se pinta', () => {
  expect([...LIMIT_KEYS].sort()).toEqual(Object.keys(TOPES).sort())
})

test('ninguna feature del contrato se queda fuera', () => {
  expect([...FEATURE_KEYS].sort()).toEqual(Object.keys(FUNCIONES).sort())
})

test('cada tope tiene palabras propias, no su clave cruda', () => {
  for (const key of LIMIT_KEYS) {
    expect(limitLabel(key), `«${key}» sale sin traducir`).not.toBe(key)
  }
})

test('cada feature tiene palabras propias', () => {
  for (const key of FEATURE_KEYS) {
    expect(featureLabel(key), `«${key}» sale sin traducir`).not.toBe(key)
  }
})

test('una clave que no conocemos se enseña cruda, que es feo pero visible', () => {
  expect(limitLabel('max_naves_espaciales')).toBe('max_naves_espaciales')
  expect(featureLabel('teletransporte')).toBe('teletransporte')
})
