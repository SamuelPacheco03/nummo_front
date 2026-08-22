import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type {
  AdminInboundEvent,
  InboundQueueHealth,
  PlatformTemplateSync,
  WhatsAppTemplate,
} from '@/api/generated/model'

const m = vi.hoisted(() => ({
  salud: { PENDING: 0, PROCESSED: 0, FAILED: 0 } as InboundQueueHealth,
  eventos: [] as AdminInboundEvent[],
  params: null as Record<string, unknown> | null,
  plantillas: [] as WhatsAppTemplate[],
  reencolarUna: vi.fn(),
  reencolarTodas: vi.fn(),
  sincronizar: vi.fn(),
  avisos: [] as string[],
}))

vi.mock('sonner', () => ({
  toast: { success: (t: string) => m.avisos.push(t), error: (t: string) => m.avisos.push(t) },
}))
vi.mock('./hooks', () => ({
  useInboundHealth: () => ({ health: m.salud, isPending: false }),
  useInboundEvents: (params: Record<string, unknown>) => {
    m.params = params
    return {
      events: m.eventos,
      total: m.eventos.length,
      totalPages: 1,
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
    }
  },
  useRetryInboundEvent: () => ({ mutateAsync: m.reencolarUna, isPending: false }),
  useRetryFailedInboundEvents: () => ({ mutateAsync: m.reencolarTodas, isPending: false }),
  usePlatformTemplates: () => ({
    templates: m.plantillas,
    isPending: false,
    isError: false,
    error: null,
  }),
  useSyncPlatformTemplates: () => ({ mutateAsync: m.sincronizar, isPending: false }),
}))

const { WhatsAppChannelPage } = await import('./whatsapp-channel-page')

function evento(over: Partial<AdminInboundEvent> = {}): AdminInboundEvent {
  return {
    id: 'e1',
    phoneNumberId: 'PNID',
    status: 'PROCESSED',
    attempts: 0,
    lastError: null,
    shape: { fields: ['messages'], entries: 1 },
    receivedAt: '2026-08-21T12:00:00Z',
    availableAt: '2026-08-21T12:00:00Z',
    processedAt: '2026-08-21T12:00:01Z',
    ...over,
  }
}

function plantilla(over: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate {
  return {
    id: 't1',
    organizationId: null,
    templateKey: 'cobro_vencido',
    name: 'Cobro vencido',
    language: 'es',
    category: 'UTILITY',
    status: 'APPROVED',
    canSend: true,
    parameterNames: ['nombre', 'monto'],
    rejectedReason: null,
    lastSyncedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    ...over,
  }
}

const pintar = () =>
  render(
    <MemoryRouter>
      <WhatsAppChannelPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  m.salud = { PENDING: 0, PROCESSED: 1284, FAILED: 0 }
  m.eventos = [evento()]
  m.params = null
  m.plantillas = [plantilla()]
  m.reencolarUna = vi.fn().mockResolvedValue({})
  m.reencolarTodas = vi.fn().mockResolvedValue({ data: { requeued: 3 } })
  m.sincronizar = vi.fn().mockResolvedValue({
    data: { created: [], alreadyThere: ['cobro_vencido'], failed: [] } as PlatformTemplateSync,
  })
  m.avisos = []
})
afterEach(cleanup)

/* ---------- La cola de entrantes ---------- */

test('los tres estados se pintan aunque estén en cero', () => {
  // Un «FAILED: —» hace dudar de si no hay o no se pudo contar, y esta pantalla
  // existe justamente para quitar esa duda.
  m.salud = { PENDING: 0, PROCESSED: 0, FAILED: 0 }
  pintar()

  // El rótulo también está en el desplegable de filtro, así que se miran las
  // tres tarjetas de salud, que son botones.
  for (const label of ['En espera', 'Procesadas', 'Fallidas']) {
    const tarjeta = screen.getByRole('button', { name: new RegExp(label) })
    expect(within(tarjeta).getByText('0')).toBeInTheDocument()
  }
})

test('FAILED creciendo se destaca: no es una columna más', () => {
  m.salud = { PENDING: 0, PROCESSED: 1284, FAILED: 3 }
  pintar()

  expect(screen.getByText(/Meta manda algo que ya no sabemos leer/)).toBeInTheDocument()
})

test('pulsar un estado filtra la lista', async () => {
  m.salud = { PENDING: 0, PROCESSED: 1284, FAILED: 3 }
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Fallidas/ }))

  expect(m.params).toMatchObject({ status: 'FAILED' })
})

test('reencolar solo se ofrece en lo fallido: sobre lo procesado responde 404', () => {
  m.eventos = [evento({ id: 'a', status: 'PROCESSED' }), evento({ id: 'b', status: 'PENDING' })]
  pintar()

  expect(screen.queryByRole('button', { name: 'Reencolar' })).not.toBeInTheDocument()
})

test('reencolar una dice que se reintenta desde cero', async () => {
  // Un `attempts: 5` que pasa a `0` sin explicación parece pérdida de información.
  m.eventos = [evento({ status: 'FAILED', attempts: 5, lastError: 'boom' })]
  pintar()
  await userEvent.click(screen.getByRole('button', { name: 'Reencolar' }))

  expect(m.reencolarUna).toHaveBeenCalledWith({ id: 'e1' })
  expect(m.avisos.at(-1)).toBe('Vuelve a la cola')
})

test('el masivo se confirma, y avisa de que no procesa al instante', async () => {
  m.salud = { PENDING: 0, PROCESSED: 10, FAILED: 3 }
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Reencolar las fallidas/ }))

  const dialogo = screen.getByRole('dialog')
  expect(within(dialogo).getByText(/intentos a cero/)).toBeInTheDocument()
  expect(within(dialogo).getByText(/lo procesa el worker|las procesa el worker/i)).toBeInTheDocument()

  await userEvent.click(within(dialogo).getByRole('button', { name: 'Reencolar' }))
  expect(m.reencolarTodas).toHaveBeenCalled()
})

test('sin nada fallido no se ofrece el masivo', () => {
  m.salud = { PENDING: 0, PROCESSED: 10, FAILED: 0 }
  pintar()
  expect(screen.queryByRole('button', { name: /Reencolar las fallidas/ })).not.toBeInTheDocument()
})

test('se enseña el shape para diagnosticar, y se dice que el cuerpo no está', () => {
  m.eventos = [evento({ shape: { fields: ['message_template_status_update'], entries: 1 } })]
  pintar()

  expect(screen.getByText(/message_template_status_update/)).toBeInTheDocument()
  expect(screen.getByText(/no está el contenido de los mensajes/i)).toBeInTheDocument()
})

/* ---------- Las plantillas de plataforma ---------- */

test('el sync dice que no recrea lo que ya existe', async () => {
  // El instinto es no tocar un botón que habla con Meta.
  pintar()
  await userEvent.click(screen.getByRole('tab', { name: 'Plantillas' }))

  expect(screen.getByText(/no recrea lo que ya existe/)).toBeInTheDocument()
})

test('un sync sin cambios se cuenta como éxito, no como que no hizo nada', async () => {
  pintar()
  await userEvent.click(screen.getByRole('tab', { name: 'Plantillas' }))
  await userEvent.click(screen.getByRole('button', { name: /Sincronizar con Meta/ }))

  expect(await screen.findByText(/el catálogo ya estaba puesto/)).toBeInTheDocument()
})

test('lo creado no se promete como listo: queda en revisión', async () => {
  m.sincronizar = vi.fn().mockResolvedValue({
    data: { created: ['cobro_vencido_resumen'], alreadyThere: [], failed: [] },
  })
  pintar()
  await userEvent.click(screen.getByRole('tab', { name: 'Plantillas' }))
  await userEvent.click(screen.getByRole('button', { name: /Sincronizar con Meta/ }))

  expect(await screen.findByText(/quedan en revisión hasta que Meta las mire/)).toBeInTheDocument()
})

test('lo que falla se pinta: una plantilla rota no detiene a las demás', async () => {
  m.sincronizar = vi.fn().mockResolvedValue({
    data: { created: ['a'], alreadyThere: [], failed: [{ templateKey: 'b', reason: 'nope' }] },
  })
  pintar()
  await userEvent.click(screen.getByRole('tab', { name: 'Plantillas' }))
  await userEvent.click(screen.getByRole('button', { name: /Sincronizar con Meta/ }))

  expect(await screen.findByText(/1 fallaron/)).toBeInTheDocument()
})

test('lo que decide si se puede enviar es canSend, no el status', async () => {
  m.plantillas = [plantilla({ status: 'APPROVED', canSend: false })]
  pintar()
  await userEvent.click(screen.getByRole('tab', { name: 'Plantillas' }))

  expect(screen.getByText('Aprobada')).toBeInTheDocument()
  expect(screen.getByText('No se puede enviar')).toBeInTheDocument()
})

test('se avisa de que una pausada apaga la cobranza de todos', async () => {
  pintar()
  await userEvent.click(screen.getByRole('tab', { name: 'Plantillas' }))
  expect(screen.getByText(/apaga la cobranza de todos/)).toBeInTheDocument()
})
