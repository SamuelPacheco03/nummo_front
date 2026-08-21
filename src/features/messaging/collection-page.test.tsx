import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { MessageConsent, OutboundMessage } from '@/api/generated/model'

const m = vi.hoisted(() => ({
  mensajes: [] as OutboundMessage[],
  consentimientos: [] as MessageConsent[],
  paramsMensajes: null as Record<string, unknown> | null,
  guardarConsentimiento: vi.fn(),
  avisos: [] as string[],
  permisos: new Set<string>(),
  numeroPropio: false,
  cupo: { max: 200 as number | null, used: 10 },
}))

vi.mock('sonner', () => ({
  toast: { success: (t: string) => m.avisos.push(t), error: (t: string) => m.avisos.push(t) },
}))
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', organization: { defaultCurrency: 'COP' } }),
}))
vi.mock('@/features/platform/permissions', () => ({
  useCan: () => (permiso: string) => m.permisos.has(permiso),
  useFeature: () => true,
}))
vi.mock('@/features/platform/hooks', () => ({
  useCapabilities: () => ({
    capabilities: {
      limits: { whatsapp_messages_monthly: m.cupo.max },
      usage: { whatsapp_messages_monthly: m.cupo.used },
    },
  }),
}))
// El selector de contacto llama al API por su cuenta; aquí solo estorba.
vi.mock('@/components/contact-picker', () => ({
  ContactPicker: () => null,
}))
vi.mock('./hooks', () => ({
  useOutboundMessages: (_orgId: string, params: Record<string, unknown>) => {
    m.paramsMensajes = params
    return {
      items: m.mensajes,
      total: m.mensajes.length,
      totalPages: 1,
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
    }
  },
  useMessageConsents: () => ({
    items: m.consentimientos,
    total: m.consentimientos.length,
    totalPages: 1,
    isPending: false,
    isError: false,
    error: null,
    isFetching: false,
  }),
  useSetMessageConsent: () => ({ mutateAsync: m.guardarConsentimiento, isPending: false }),
  useWhatsAppAccount: () => ({
    connected: m.numeroPropio,
    account: null,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

const { CollectionPage } = await import('./collection-page')

function mensaje(over: Partial<OutboundMessage> = {}): OutboundMessage {
  return {
    id: 'm1',
    channel: 'WHATSAPP',
    address: '+573001112233',
    contactId: 'c1',
    purpose: 'UTILITY',
    templateKey: 'cobro_vencido',
    status: 'SENT',
    skipReason: null,
    lastError: null,
    entityType: null,
    entityId: null,
    createdAt: '2026-08-10T12:00:00Z',
    sentAt: '2026-08-10T12:00:05Z',
    deliveredAt: null,
    readAt: null,
    ...over,
  }
}

function consentimiento(over: Partial<MessageConsent> = {}): MessageConsent {
  return {
    channel: 'WHATSAPP',
    address: '+573001112233',
    contactId: 'c1',
    status: 'UNKNOWN',
    source: 'IMPORTED',
    updatedAt: '2026-08-10T12:00:00Z',
    ...over,
  }
}

const pintar = (ruta = '/cartera/cobranza') =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <CollectionPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  m.mensajes = [mensaje()]
  m.consentimientos = [consentimiento()]
  m.paramsMensajes = null
  m.guardarConsentimiento = vi.fn().mockResolvedValue({})
  m.avisos = []
  m.permisos = new Set(['messaging.read', 'messaging.settings.manage'])
  m.numeroPropio = false
  m.cupo = { max: 200, used: 10 }
})
afterEach(cleanup)

/* ---------- El historial ---------- */

test('SKIPPED no es un error: se cuenta el motivo, sin pintarlo de fallo', () => {
  m.mensajes = [mensaje({ status: 'SKIPPED', skipReason: 'consent_revoked', sentAt: null })]
  pintar()

  expect(screen.getAllByText('No se envió').length).toBeGreaterThan(0)
  expect(
    screen.getAllByText('El destinatario pidió no recibir mensajes').length,
  ).toBeGreaterThan(0)
  // Lo que distingue «no se envió a propósito» de «falló» es que no hay error.
  expect(screen.queryByText(/No se pudo enviar/)).not.toBeInTheDocument()
})

test('cada motivo de skip se traduce; uno desconocido se enseña crudo y no rompe', () => {
  m.mensajes = [
    mensaje({ id: 'a', status: 'SKIPPED', skipReason: 'template_not_approved' }),
    mensaje({ id: 'b', status: 'SKIPPED', skipReason: 'motivo_que_no_conocemos' }),
  ]
  pintar()

  expect(
    screen.getAllByText('Meta todavía no aprobó la plantilla, o la pausó').length,
  ).toBeGreaterThan(0)
  expect(screen.getAllByText('motivo_que_no_conocemos').length).toBeGreaterThan(0)
})

test('quedarse sin cupo ofrece el plan, que es el único skip con arreglo', () => {
  m.mensajes = [mensaje({ status: 'SKIPPED', skipReason: 'quota_exceeded' })]
  pintar()

  const planes = screen.getAllByRole('link', { name: 'Ver planes' })
  expect(planes.length).toBeGreaterThan(0)
  for (const enlace of planes) expect(enlace).toHaveAttribute('href', '/config/plan')
})

test('un fallo sí dice qué se rompió', () => {
  m.mensajes = [mensaje({ status: 'FAILED', lastError: 'Meta respondió 470' })]
  pintar()
  expect(screen.getAllByText('Meta respondió 470').length).toBeGreaterThan(0)
})

test('quedarse en «Enviado» se explica como final normal, no como media entrega', () => {
  pintar()
  expect(screen.getByText(/«Enviado» puede ser el final del camino/)).toBeInTheDocument()
})

test('se enseña la última marca que ocurrió de verdad, no las cuatro', () => {
  m.mensajes = [mensaje({ deliveredAt: '2026-08-10T12:01:00Z', readAt: null })]
  pintar()

  expect(screen.getAllByText(/Entregado el/).length).toBeGreaterThan(0)
  expect(screen.queryByText(/Leído el/)).not.toBeInTheDocument()
})

test('el filtro de estado viaja al API', async () => {
  pintar()
  // Dos puertas al mismo dato: las fichas de móvil y el desplegable de
  // escritorio. Aquí se usa el segundo (§21.1).
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Estado' }), 'SKIPPED')

  expect(m.paramsMensajes).toMatchObject({ status: 'SKIPPED' })
})

test('un mensaje de una cuenta enlaza a su ficha; sin entidad no inventa ruta', () => {
  m.mensajes = [
    mensaje({ id: 'a', entityType: 'receivable', entityId: 'r1' }),
    mensaje({ id: 'b', entityType: 'algo_que_no_conocemos', entityId: 'x1' }),
  ]
  pintar()

  // `DataList` monta la tabla y las tarjetas a la vez, así que cada fila que
  // enlaza aparece dos veces; lo que se comprueba es que solo hay **un**
  // destino, el de la entidad que sí sabemos traducir.
  const destinos = new Set(
    screen.getAllByRole('link', { name: 'Ver la cuenta' }).map((a) => a.getAttribute('href')),
  )
  expect([...destinos]).toEqual(['/cartera/cxc/r1'])
})

/* ---------- El consentimiento ---------- */

test('UNKNOWN deja pasar la cobranza y no se presenta como pendiente', async () => {
  // A un cliente al que se le factura no se le pide permiso para cobrarle.
  pintar()
  await userEvent.click(screen.getByRole('tab', { name: 'Consentimiento' }))

  expect(screen.getAllByText('Puede recibir').length).toBeGreaterThan(0)
  expect(screen.queryByText(/Sin confirmar/)).not.toBeInTheDocument()
  expect(screen.queryByText(/pendiente/i)).not.toBeInTheDocument()
  expect(screen.getByText(/Cobrar no necesita permiso/)).toBeInTheDocument()
})

test('REVOKED es el único que bloquea, y se puede devolver', async () => {
  m.consentimientos = [consentimiento({ status: 'REVOKED', source: 'MANUAL' })]
  pintar()
  await userEvent.click(screen.getByRole('tab', { name: 'Consentimiento' }))

  expect(screen.getAllByText('Pidió no recibir').length).toBeGreaterThan(0)
  await userEvent.click(screen.getAllByRole('button', { name: 'Permitir de nuevo' })[0]!)

  expect(m.guardarConsentimiento).toHaveBeenCalledWith({
    orgId: 'o1',
    data: expect.objectContaining({ address: '+573001112233', status: 'GRANTED', source: 'MANUAL' }),
  })
})

test('dejar de escribirle se confirma, y dice que la deuda no cambia', async () => {
  pintar()
  await userEvent.click(screen.getByRole('tab', { name: 'Consentimiento' }))
  await userEvent.click(screen.getAllByRole('button', { name: 'No escribirle' })[0]!)

  const dialogo = screen.getByRole('dialog')
  expect(within(dialogo).getByText(/La deuda no cambia/)).toBeInTheDocument()

  await userEvent.click(within(dialogo).getByRole('button', { name: 'Dejar de escribirle' }))
  expect(m.guardarConsentimiento).toHaveBeenCalledWith({
    orgId: 'o1',
    data: expect.objectContaining({ status: 'REVOKED' }),
  })
})

test('sin permiso de escritura el consentimiento se lee y no se toca', async () => {
  m.permisos = new Set(['messaging.read'])
  pintar()
  await userEvent.click(screen.getByRole('tab', { name: 'Consentimiento' }))

  expect(screen.getAllByText('Puede recibir').length).toBeGreaterThan(0)
  expect(screen.queryAllByRole('button', { name: 'No escribirle' })).toHaveLength(0)
})

test('sin permiso de lectura sale el candado', () => {
  m.permisos = new Set()
  pintar()
  expect(screen.getByText('No puedes ver esto')).toBeInTheDocument()
})

/* ---------- El cupo ---------- */

test('el cupo se lee en cifras, no solo en barra', () => {
  m.cupo = { max: 200, used: 42 }
  pintar()
  expect(screen.getByText('42 de 200')).toBeInTheDocument()
})

test('agotado no es un fallo: dice cuándo vuelve y las dos salidas', () => {
  // No hay recargas de cupo: agotado es agotado hasta el próximo periodo.
  m.cupo = { max: 200, used: 200 }
  pintar()

  expect(screen.getByText(/no vuelven a salir hasta el próximo periodo/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ver planes' })).toHaveAttribute('href', '/config/plan')
  expect(screen.getByRole('link', { name: 'conectar tu número' })).toHaveAttribute(
    'href',
    '/config/whatsapp',
  )
})

test('con número propio el cupo deja de significar algo, y se dice', () => {
  m.numeroPropio = true
  m.cupo = { max: 200, used: 199 }
  pintar()

  expect(screen.getByText(/no gastan cupo del plan/i)).toBeInTheDocument()
  expect(screen.queryByText('199 de 200')).not.toBeInTheDocument()
})

test('un tope en null es «sin límite», nunca cero', () => {
  m.cupo = { max: null, used: 4321 }
  pintar()
  expect(screen.getByText(/Sin tope de mensajes este mes/)).toBeInTheDocument()
})
