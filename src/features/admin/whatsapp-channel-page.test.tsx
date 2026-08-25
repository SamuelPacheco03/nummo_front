import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type {
  AdminInboundEvent,
  InboundQueueHealth,
  PlatformTemplateSync,
  WhatsAppStatusOutput,
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
  estado: null as WhatsAppStatusOutput | null,
  enviarPrueba: vi.fn(),
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
  usePlatformWhatsAppStatus: () => ({
    status: m.estado,
    isPending: false,
    isError: false,
    error: null,
  }),
  useSendPlatformTestMessage: () => ({ mutateAsync: m.enviarPrueba, isPending: false }),
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
    displayName: 'Vencida — solo recordatorio',
    purpose: 'Se envía cuando el deudor tiene una sola factura vencida.',
    language: 'es',
    metaCategory: 'UTILITY',
    categoryId: null,
    status: 'APPROVED',
    canSend: true,
    parameterNames: ['nombre', 'monto'],
    rejectedReason: null,
    lastSyncedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    ...over,
  }
}

/*
  «Estado» es ahora la pestaña de entrada —esta pantalla existe para diagnosticar, y «¿el
  canal está siquiera encendido?» es la primera pregunta—, así que las pruebas de las otras
  dos empiezan navegando. Antes entraban directas a «Entrantes».
*/
async function pintar(tab?: 'Entrantes' | 'Plantillas') {
  render(
    <MemoryRouter>
      <WhatsAppChannelPage />
    </MemoryRouter>,
  )
  if (tab) await userEvent.click(screen.getByRole('tab', { name: tab }))
}

beforeEach(() => {
  /*
    `useListFilters` recuerda la pestaña en `sessionStorage`, que en Vitest vive entre tests
    del mismo fichero: sin esto, los que navegan dejan a los siguientes entrando por la
    pestaña equivocada y fallando por algo que no es lo que prueban.
  */
  sessionStorage.clear()
  m.salud = { PENDING: 0, PROCESSED: 1284, FAILED: 0 }
  m.eventos = [evento()]
  m.params = null
  m.plantillas = [plantilla()]
  m.reencolarUna = vi.fn().mockResolvedValue({})
  m.reencolarTodas = vi.fn().mockResolvedValue({ data: { requeued: 3 } })
  m.sincronizar = vi.fn().mockResolvedValue({
    data: {
      created: [],
      alreadyThere: ['cobro_vencido'],
      failed: [],
      orphaned: [],
    } as PlatformTemplateSync,
  })
  m.estado = {
    gatewayConfigured: true,
    platformAccountConfigured: true,
    phoneNumberId: 'PNID',
    wabaId: 'WABA',
    appSecretConfigured: true,
    verifyTokenConfigured: true,
  }
  m.enviarPrueba = vi.fn().mockResolvedValue({})
  m.avisos = []
})
afterEach(cleanup)

/* ---------- La cola de entrantes ---------- */

test('los tres estados se pintan aunque estén en cero', async () => {
  // Un «FAILED: —» hace dudar de si no hay o no se pudo contar, y esta pantalla
  // existe justamente para quitar esa duda.
  m.salud = { PENDING: 0, PROCESSED: 0, FAILED: 0 }
  await pintar('Entrantes')

  // El rótulo también está en el desplegable de filtro, así que se miran las
  // tres tarjetas de salud, que son botones.
  for (const label of ['En espera', 'Procesadas', 'Fallidas']) {
    const tarjeta = screen.getByRole('button', { name: new RegExp(label) })
    expect(within(tarjeta).getByText('0')).toBeInTheDocument()
  }
})

test('FAILED creciendo se destaca: no es una columna más', async () => {
  m.salud = { PENDING: 0, PROCESSED: 1284, FAILED: 3 }
  await pintar('Entrantes')

  expect(screen.getByText(/Meta manda algo que ya no sabemos leer/)).toBeInTheDocument()
})

test('pulsar un estado filtra la lista', async () => {
  m.salud = { PENDING: 0, PROCESSED: 1284, FAILED: 3 }
  await pintar('Entrantes')
  await userEvent.click(screen.getByRole('button', { name: /Fallidas/ }))

  expect(m.params).toMatchObject({ status: 'FAILED' })
})

test('reencolar solo se ofrece en lo fallido: sobre lo procesado responde 404', async () => {
  m.eventos = [evento({ id: 'a', status: 'PROCESSED' }), evento({ id: 'b', status: 'PENDING' })]
  await pintar('Entrantes')

  expect(screen.queryByRole('button', { name: 'Reencolar' })).not.toBeInTheDocument()
})

test('reencolar una dice que se reintenta desde cero', async () => {
  // Un `attempts: 5` que pasa a `0` sin explicación parece pérdida de información.
  m.eventos = [evento({ status: 'FAILED', attempts: 5, lastError: 'boom' })]
  await pintar('Entrantes')
  await userEvent.click(screen.getByRole('button', { name: 'Reencolar' }))

  expect(m.reencolarUna).toHaveBeenCalledWith({ id: 'e1' })
  expect(m.avisos.at(-1)).toBe('Vuelve a la cola')
})

test('el masivo se confirma, y avisa de que no procesa al instante', async () => {
  m.salud = { PENDING: 0, PROCESSED: 10, FAILED: 3 }
  await pintar('Entrantes')
  await userEvent.click(screen.getByRole('button', { name: /Reencolar las fallidas/ }))

  const dialogo = screen.getByRole('dialog')
  expect(within(dialogo).getByText(/intentos a cero/)).toBeInTheDocument()
  expect(within(dialogo).getByText(/lo procesa el worker|las procesa el worker/i)).toBeInTheDocument()

  await userEvent.click(within(dialogo).getByRole('button', { name: 'Reencolar' }))
  expect(m.reencolarTodas).toHaveBeenCalled()
})

test('sin nada fallido no se ofrece el masivo', async () => {
  m.salud = { PENDING: 0, PROCESSED: 10, FAILED: 0 }
  await pintar('Entrantes')
  expect(screen.queryByRole('button', { name: /Reencolar las fallidas/ })).not.toBeInTheDocument()
})

test('se enseña el shape para diagnosticar, y se dice que el cuerpo no está', async () => {
  m.eventos = [evento({ shape: { fields: ['message_template_status_update'], entries: 1 } })]
  await pintar('Entrantes')

  expect(screen.getByText(/message_template_status_update/)).toBeInTheDocument()
  expect(screen.getByText(/no está el contenido de los mensajes/i)).toBeInTheDocument()
})

/* ---------- Las plantillas de plataforma ---------- */

test('el sync dice que no recrea lo que ya existe', async () => {
  // El instinto es no tocar un botón que habla con Meta.
  await pintar('Plantillas')

  expect(screen.getByText(/no recrea lo que ya existe/)).toBeInTheDocument()
})

test('un sync sin cambios se cuenta como éxito, no como que no hizo nada', async () => {
  await pintar('Plantillas')
  await userEvent.click(screen.getByRole('button', { name: /Sincronizar con Meta/ }))

  expect(await screen.findByText(/el catálogo ya estaba puesto/)).toBeInTheDocument()
})

test('lo creado no se promete como listo: queda en revisión', async () => {
  m.sincronizar = vi.fn().mockResolvedValue({
    data: { created: ['cobro_vencido_resumen'], alreadyThere: [], failed: [] },
  })
  await pintar('Plantillas')
  await userEvent.click(screen.getByRole('button', { name: /Sincronizar con Meta/ }))

  expect(await screen.findByText(/quedan en revisión hasta que Meta las mire/)).toBeInTheDocument()
})

test('lo que falla se pinta: una plantilla rota no detiene a las demás', async () => {
  m.sincronizar = vi.fn().mockResolvedValue({
    data: { created: ['a'], alreadyThere: [], failed: [{ templateKey: 'b', reason: 'nope' }] },
  })
  await pintar('Plantillas')
  await userEvent.click(screen.getByRole('button', { name: /Sincronizar con Meta/ }))

  expect(await screen.findByText(/1 fallaron/)).toBeInTheDocument()
})

test('lo que decide si se puede enviar es canSend, no el status', async () => {
  m.plantillas = [plantilla({ status: 'APPROVED', canSend: false })]
  await pintar('Plantillas')

  expect(screen.getByText('Aprobada')).toBeInTheDocument()
  expect(screen.getByText('No se puede enviar')).toBeInTheDocument()
})

test('se avisa de que una pausada apaga la cobranza de todos', async () => {
  await pintar('Plantillas')
  expect(screen.getByText(/apaga la cobranza de todos/)).toBeInTheDocument()
})

/* ---------- El estado del canal ---------- */

/*
  Es la pieza que dejaba a las otras dos pestañas sin diagnóstico: una cola vacía y un
  catálogo vacío se ven **exactamente igual** con el canal apagado que con el canal
  encendido y sin tráfico.
*/
test('lo que falta se dice con palabras, no solo con color', async () => {
  m.estado = {
    gatewayConfigured: true,
    platformAccountConfigured: true,
    phoneNumberId: 'PNID',
    wabaId: null,
    appSecretConfigured: true,
    verifyTokenConfigured: false,
  }
  await pintar()

  const fila = screen
    .getAllByRole('listitem')
    .find((li) => li.textContent?.includes('Token de verificación'))
  expect(fila).toBeDefined()
  expect(within(fila!).getByText('Falta')).toBeInTheDocument()

  // Un id ausente no es un fallo: se dice, no se deja en blanco.
  const waba = screen.getAllByRole('listitem').find((li) => li.textContent?.includes('WABA ID'))
  expect(within(waba!).getByText('Sin definir')).toBeInTheDocument()
})

/*
  Sin pasarela ni cuenta de plataforma el botón solo puede dar un error de configuración
  que la lista de arriba ya cuenta mejor.
*/
test('sin canal configurado no se ofrece mandar una prueba', async () => {
  m.estado = {
    gatewayConfigured: false,
    platformAccountConfigured: false,
    phoneNumberId: null,
    wabaId: null,
    appSecretConfigured: false,
    verifyTokenConfigured: false,
  }
  await pintar()

  expect(screen.queryByRole('button', { name: 'Enviar' })).not.toBeInTheDocument()
  expect(screen.getByText(/Falta configurar el canal/i)).toBeInTheDocument()
})

/*
  **202, no 200.** Meta lo aceptó para entregarlo, que no es lo mismo que entregado:
  prometer «enviado» aquí es lo que hace que alguien descarte el canal como culpable
  cuando sí lo era.
*/
test('la prueba se anuncia como aceptada, no como entregada', async () => {
  await pintar()
  await userEvent.type(screen.getByLabelText('A qué número'), '+573000000000')
  await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))

  expect(m.enviarPrueba).toHaveBeenCalledWith({
    data: { to: '+573000000000', body: 'Prueba de WhatsApp desde Nummo.' },
  })
  expect(m.avisos.join(' ')).toContain('Meta lo aceptó')
  expect(m.avisos.join(' ')).not.toMatch(/entregado|enviado con éxito/i)
})
