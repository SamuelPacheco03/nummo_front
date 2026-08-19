import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AdminOrganizationDetailDto } from '@/api/generated/model'

const m = vi.hoisted(() => ({ guardar: vi.fn(), avisos: [] as string[] }))

vi.mock('sonner', () => ({
  toast: {
    success: (texto: string) => m.avisos.push(texto),
    error: (texto: string) => m.avisos.push(texto),
  },
}))
vi.mock('./hooks', () => ({ useSetOverrides: () => ({ mutateAsync: m.guardar, isPending: false }) }))

const { OverridesDialog } = await import('./overrides-dialog')

function detalle(overrides: AdminOrganizationDetailDto['overrides']): AdminOrganizationDetailDto {
  return {
    id: 'o1',
    name: 'Jardín Demo',
    status: 'ACTIVE',
    type: 'SCHOOL',
    createdAt: '2026-01-05T00:00:00.000Z',
    planCode: 'PRO',
    members: 4,
    contacts: 300,
    period: '2026-08',
    usage: { ai_messages_monthly: 10, voice_minutes_monthly: 2 },
    features: { ai_byok: true },
    limits: { max_contacts: 1500, max_users: 10 },
    overrides,
  }
}

beforeEach(() => {
  m.guardar = vi.fn().mockResolvedValue({ data: {} })
  m.avisos = []
})
afterEach(cleanup)

test('lo que queda «como diga el plan» no viaja como override', async () => {
  // Se manda el conjunto entero, así que dejar algo heredado es lo que lo quita.
  // Si mandáramos todas las claves, cada guardado congelaría el plan del cliente.
  render(
    <OverridesDialog detail={detalle({ features: {}, limits: {} })} open onOpenChange={() => {}} />,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Guardar condiciones' }))

  expect(m.guardar).toHaveBeenCalledTimes(1)
  expect(m.guardar.mock.calls[0][0].data).toEqual({ features: {}, limits: {} })
})

test('«sin límite» y «un tope propio» son cosas distintas, y ninguna es cero', async () => {
  render(
    <OverridesDialog detail={detalle({ features: {}, limits: {} })} open onOpenChange={() => {}} />,
  )

  await userEvent.selectOptions(screen.getByLabelText('Tope de contactos'), 'unlimited')
  await userEvent.selectOptions(screen.getByLabelText('Tope de miembros'), 'custom')
  await userEvent.type(screen.getByLabelText('Cuántos miembros'), '15')
  await userEvent.click(screen.getByRole('button', { name: 'Guardar condiciones' }))

  expect(m.guardar.mock.calls[0][0].data.limits).toEqual({ max_contacts: null, max_users: 15 })
})

test('lo ya negociado llega marcado, no en blanco', () => {
  render(
    <OverridesDialog
      detail={detalle({ features: { ai_byok: true }, limits: { max_users: 15 } })}
      open
      onOpenChange={() => {}}
    />,
  )

  expect(screen.getByLabelText('Tope de miembros')).toHaveValue('custom')
  expect(screen.getByLabelText('Cuántos miembros')).toHaveValue(15)
})

test('un tope que no es un entero no se manda', async () => {
  render(
    <OverridesDialog detail={detalle({ features: {}, limits: {} })} open onOpenChange={() => {}} />,
  )
  await userEvent.selectOptions(screen.getByLabelText('Tope de miembros'), 'custom')
  await userEvent.type(screen.getByLabelText('Cuántos miembros'), '-3')
  await userEvent.click(screen.getByRole('button', { name: 'Guardar condiciones' }))

  expect(m.guardar).not.toHaveBeenCalled()
  expect(m.avisos.at(-1)).toMatch(/entero de cero para arriba/)
})
