import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { BillingAgreementCollectionReminders, CollectionPolicy } from '@/api/generated/model'

const m = vi.hoisted(() => ({
  politica: null as CollectionPolicy | null,
  guardar: vi.fn(),
  avisos: [] as string[],
  permisos: new Set<string>(['messaging.read']),
}))

vi.mock('sonner', () => ({
  toast: { success: (t: string) => m.avisos.push(t), error: (t: string) => m.avisos.push(t) },
}))
vi.mock('@/features/platform/permissions', () => ({
  useCan: () => (permiso: string) => m.permisos.has(permiso),
  useFeature: () => true,
}))
vi.mock('./hooks', () => ({
  useCollectionPolicy: () => ({
    policy: m.politica ?? undefined,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

const { CollectionRemindersSection } = await import('./collection-reminders-section')

function politica(over: Partial<CollectionPolicy> = {}): CollectionPolicy {
  return {
    enabled: true,
    quietStart: '22:00',
    quietEnd: '07:00',
    dueSoonTemplateKey: 'cobro_por_vencer',
    overdueTemplateKey: 'cobro_vencido',
    updatedAt: '2026-08-01T10:00:00Z',
    ...over,
  }
}

const pintar = (
  value: BillingAgreementCollectionReminders = 'INHERIT',
  canManage = true,
) =>
  render(
    <MemoryRouter>
      <CollectionRemindersSection
        orgId="o1"
        value={value}
        canManage={canManage}
        onSave={m.guardar}
      />
    </MemoryRouter>,
  )

beforeEach(() => {
  m.politica = politica()
  m.guardar = vi.fn().mockResolvedValue({})
  m.avisos = []
  m.permisos = new Set(['messaging.read'])
})
afterEach(cleanup)

test('son tres opciones y no un interruptor', () => {
  // Con un booleano no habría forma de distinguir «este cliente pidió silencio»
  // de «nadie lo ha decidido».
  pintar()
  const opciones = screen.getAllByRole('tab').map((t) => t.textContent)
  expect(opciones).toEqual(['Según la política', 'Sí', 'No'])
})

test('el valor por defecto dice de qué está heredando', () => {
  pintar('INHERIT')
  expect(screen.getByText(/Según la política de la organización/)).toBeInTheDocument()
  expect(screen.getByText('se le escribe')).toBeInTheDocument()
  expect(screen.getByText(/de 22:00 a 07:00 del día siguiente/i)).toBeInTheDocument()
})

test('heredar de una política apagada dice que no se le escribe', () => {
  m.politica = politica({ enabled: false })
  pintar('INHERIT')
  expect(screen.getByText('no se le escribe')).toBeInTheDocument()
})

test('sin poder leer la política, heredar se cuenta sin inventar qué dice', () => {
  m.permisos = new Set()
  m.politica = null
  pintar('INHERIT')

  expect(screen.getByText(/Hace lo que diga la política de cobranza/)).toBeInTheDocument()
  expect(screen.queryByText('se le escribe')).not.toBeInTheDocument()
})

test('OFF es una decisión de este cobro, y lo dice frente a la organización', () => {
  pintar('OFF')
  expect(screen.getByText(/aunque la organización tenga la cobranza encendida/)).toBeInTheDocument()
})

test('ON sigue respetando las horas de silencio', () => {
  pintar('ON')
  expect(screen.getByText(/sigue respetando las horas de silencio/)).toBeInTheDocument()
})

test('elegir una opción la guarda', async () => {
  pintar('INHERIT')
  await userEvent.click(screen.getByRole('tab', { name: 'No' }))

  expect(m.guardar).toHaveBeenCalledWith('OFF')
  expect(m.avisos.at(-1)).toBe('Recordatorios actualizados')
})

test('volver a elegir lo que ya está puesto no escribe', async () => {
  pintar('ON')
  await userEvent.click(screen.getByRole('tab', { name: 'Sí' }))
  expect(m.guardar).not.toHaveBeenCalled()
})

test('sin permiso se lee el valor y no hay control', () => {
  pintar('OFF', false)
  expect(screen.queryAllByRole('tab')).toHaveLength(0)
  expect(screen.getByText('No')).toBeInTheDocument()
})
