import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PlanDto } from '@/api/generated/model'

const m = vi.hoisted(() => ({
  guardar: vi.fn(),
  avisos: [] as { tono: string; texto: string }[],
  planes: [] as PlanDto[],
}))

vi.mock('sonner', () => ({
  toast: {
    success: (texto: string) => m.avisos.push({ tono: 'success', texto }),
    error: (texto: string) => m.avisos.push({ tono: 'error', texto }),
  },
}))
vi.mock('./hooks', () => ({
  useAdminPlans: () => ({ plans: m.planes, isPending: false, isError: false, error: null }),
  useSavePlan: () => ({ mutateAsync: m.guardar, isPending: false }),
}))

const { AdminPlansPage } = await import('./plans-page')

function plan(over: Partial<PlanDto> = {}): PlanDto {
  return {
    code: 'BASIC',
    name: 'Básico',
    description: null,
    isPublic: true,
    sortOrder: 1,
    priceAmount: null,
    priceCurrency: 'COP',
    features: { ai_byok: false, custom_roles: false },
    limits: { max_contacts: 200, max_users: 3, max_branches: 1, ai_messages_monthly: 300, voice_minutes_monthly: 30 },
    ...over,
  }
}

beforeEach(() => {
  m.guardar = vi.fn().mockResolvedValue({ data: { plan: plan(), recomputed: 0 } })
  m.avisos = []
  m.planes = [plan()]
})
afterEach(cleanup)

test('un precio sin fijar se dice, no se pinta como gratis', () => {
  render(<AdminPlansPage />)

  expect(screen.getByText('Sin precio publicado')).toBeInTheDocument()
})

test('guardar exige decir si el cambio alcanza a los clientes actuales', async () => {
  // El contrato lo pide sin valor por defecto a propósito: cambiar topes o
  // precios sin querer a quien ya está es difícil de deshacer.
  render(<AdminPlansPage />)
  await userEvent.click(screen.getByRole('button', { name: /editar/i }))
  await userEvent.click(screen.getByRole('button', { name: 'Guardar plan' }))

  expect(m.guardar).not.toHaveBeenCalled()
  expect(m.avisos.at(-1)?.texto).toMatch(/Elige si el cambio alcanza/)
})

test('un tope vacío se manda como «sin límite», no como cero', async () => {
  render(<AdminPlansPage />)
  await userEvent.click(screen.getByRole('button', { name: /editar/i }))
  await userEvent.clear(screen.getByLabelText('Tope de contactos'))
  await userEvent.selectOptions(
    screen.getByLabelText(/Alcanza a quien ya tiene este plan/),
    'no',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Guardar plan' }))

  expect(m.guardar).toHaveBeenCalledTimes(1)
  const enviado = m.guardar.mock.calls[0][0]
  expect(enviado.data.limits.max_contacts).toBeNull()
  expect(enviado.data.applyToExisting).toBe(false)
})

test('recalcular a los actuales dice a cuántas alcanzó', async () => {
  m.guardar = vi.fn().mockResolvedValue({ data: { plan: plan(), recomputed: 12 } })
  render(<AdminPlansPage />)
  await userEvent.click(screen.getByRole('button', { name: /editar/i }))
  await userEvent.selectOptions(
    screen.getByLabelText(/Alcanza a quien ya tiene este plan/),
    'yes',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Guardar plan' }))

  expect(m.guardar.mock.calls[0][0].data.applyToExisting).toBe(true)
  expect(m.avisos.at(-1)?.texto).toMatch(/alcanzó a 12 organizaciones/)
})
