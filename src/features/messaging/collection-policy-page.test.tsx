import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { CollectionPolicy, WhatsAppTemplate } from '@/api/generated/model'

const m = vi.hoisted(() => ({
  guardar: vi.fn(),
  avisos: [] as string[],
  politica: null as CollectionPolicy | null,
  plantillas: [] as WhatsAppTemplate[],
  feature: true,
  permisos: new Set<string>(),
  correr: vi.fn(),
  formasDePago: [] as { showInReminders: boolean }[],
}))

vi.mock('sonner', () => ({
  toast: { success: (t: string) => m.avisos.push(t), error: (t: string) => m.avisos.push(t) },
}))
vi.mock('@/features/finances/hooks', () => ({
  usePaymentInstructions: () => ({ instructions: m.formasDePago }),
}))
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', organization: { defaultCurrency: 'COP' } }),
}))
vi.mock('@/features/platform/permissions', () => ({
  useCan: () => (permiso: string) => m.permisos.has(permiso),
  useFeature: () => m.feature,
}))
vi.mock('./hooks', () => ({
  useCollectionPolicy: () => ({
    policy: m.politica ?? undefined,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUpdateCollectionPolicy: () => ({ mutateAsync: m.guardar, isPending: false }),
  // La pantalla monta «Enviar ahora» cuando la política guardada está activa.
  useRunCollectionReminders: () => ({ mutateAsync: m.correr, isPending: false }),
  useWhatsAppTemplates: () => ({
    templates: m.plantillas,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

const { CollectionPolicyPage } = await import('./collection-policy-page')

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

function politica(over: Partial<CollectionPolicy> = {}): CollectionPolicy {
  return {
    enabled: true,
    quietStart: '22:00',
    quietEnd: '07:00',
    dueSoonTemplateKey: 'cobro_por_vencer',
    overdueTemplateKey: 'cobro_vencido',
    overdueSummaryTemplateKey: 'cobro_vencido_resumen',
    updatedAt: '2026-08-01T10:00:00Z',
    ...over,
  }
}

const pintar = () =>
  render(
    <MemoryRouter>
      <CollectionPolicyPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  m.guardar = vi.fn().mockResolvedValue({ data: politica() })
  m.avisos = []
  m.politica = politica()
  m.plantillas = [plantilla(), plantilla({ id: 't2', templateKey: 'cobro_por_vencer', name: 'Por vencer' })]
  m.feature = true
  m.permisos = new Set([
    'messaging.read',
    'messaging.settings.manage',
    'messaging.send',
    'whatsapp.templates.read',
    'payment_instructions.read',
  ])
  m.formasDePago = [{ showInReminders: true }]
  m.correr = vi.fn().mockResolvedValue({
    data: { dueSoon: 0, overdue: 0, queued: 0, skipped: 0, overdueDeferred: 0, withoutPhone: 0 },
  })
})
afterEach(cleanup)

test('la ventana que cruza medianoche se dice entera, con el día siguiente', () => {
  // `22:00 → 07:00` es el caso normal, no el raro: dos campos de hora sueltos no
  // cuentan que la franja pasa por la madrugada.
  pintar()
  expect(screen.getByText(/De 22:00 a 07:00 del día siguiente/)).toBeInTheDocument()
})

test('cambiar las horas recalcula la franja aunque el fin sea menor que el inicio', async () => {
  m.politica = politica({ quietStart: '13:00', quietEnd: '15:00' })
  pintar()
  expect(screen.getByText(/De 13:00 a 15:00/)).toBeInTheDocument()
  expect(screen.queryByText(/día siguiente/)).not.toBeInTheDocument()

  await userEvent.clear(screen.getByLabelText('Desde'))
  await userEvent.type(screen.getByLabelText('Desde'), '20:00')

  expect(await screen.findByText(/De 20:00 a 15:00 del día siguiente/)).toBeInTheDocument()
})

test('el silencio aplaza y la pantalla no dice que se pierda', () => {
  pintar()
  expect(screen.getByText(/no se pierde: se aplaza/)).toBeInTheDocument()
})

test('sin plantilla de vencidos se dice que ese aviso no sale', () => {
  // Es una regla del backend, no un campo vacío: con `overdueTemplateKey` en
  // null los vencidos no se avisan aunque `enabled` sea true.
  m.politica = politica({ overdueTemplateKey: null })
  pintar()
  expect(
    screen.getByText(/Sin plantilla, no se avisa de la mora aunque la cobranza esté encendida/),
  ).toBeInTheDocument()
})

test('una plantilla que Meta no aprobó se ofrece, pero avisada', () => {
  m.plantillas = [plantilla({ status: 'PENDING', canSend: false })]
  pintar()
  expect(screen.getByText(/Meta todavía no la aprobó/)).toBeInTheDocument()
})

test('vaciar la plantilla manda null, no cadena vacía', async () => {
  pintar()
  await userEvent.selectOptions(
    screen.getByLabelText(/cuando debe una sola factura/),
    '',
  )
  await userEvent.click(screen.getByRole('button', { name: /Guardar política/ }))

  expect(m.guardar).toHaveBeenCalledWith({
    orgId: 'o1',
    data: expect.objectContaining({ overdueTemplateKey: null }),
  })
})

test('la mora lleva dos plantillas, y la pantalla explica por qué', () => {
  // Meta no pluraliza: con una sola saldría «tienes 1 facturas vencidas».
  pintar()

  expect(screen.getByLabelText(/cuando debe una sola factura/)).toBeInTheDocument()
  expect(screen.getByLabelText(/cuando debe varias/)).toBeInTheDocument()
  expect(screen.getByText(/Meta no pluraliza/)).toBeInTheDocument()
})

test('sin la de resumen NO se apaga el aviso: se degrada, y se dice sin ámbar', () => {
  /*
    Es la diferencia con los otros dos huecos. Sin plantilla de «por vencer» o de
    mora ese aviso **no sale**; sin la de resumen sale igual, con el total pero
    sin el conteo. Degradar no es fallar, así que no gasta el ámbar de §7.
  */
  m.politica = politica({ overdueSummaryTemplateKey: null })
  pintar()

  const aviso = screen.getByText(/se usa la de arriba, con el total pero sin decir cuántas/)
  expect(aviso).toBeInTheDocument()
  expect(aviso).not.toHaveClass('text-warning-strong')
})

test('la de resumen viaja al guardar, y vacía va como null', async () => {
  pintar()
  await userEvent.selectOptions(screen.getByLabelText(/cuando debe varias/), '')
  await userEvent.click(screen.getByRole('button', { name: /Guardar política/ }))

  expect(m.guardar).toHaveBeenCalledWith({
    orgId: 'o1',
    data: expect.objectContaining({ overdueSummaryTemplateKey: null }),
  })
})

test('sin la feature del plan se lee pero no se guarda, y se ofrece el plan', () => {
  // `FEATURE_NOT_AVAILABLE` es el momento de ofrecer el upgrade, no un error
  // que aparezca al pulsar guardar (§45.5).
  m.feature = false
  pintar()

  expect(screen.getByText(/Tu plan no incluye la cobranza por WhatsApp/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ver planes' })).toHaveAttribute('href', '/config/plan')
  expect(screen.queryByRole('button', { name: /Guardar política/ })).not.toBeInTheDocument()
})

test('sin permiso de escritura la pantalla se enseña igual, sin el botón', () => {
  m.permisos = new Set(['messaging.read'])
  pintar()

  expect(screen.getByText(/Horas en las que no se molesta/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Guardar política/ })).not.toBeInTheDocument()
})

test('sin permiso de lectura sale el candado y no la política', () => {
  m.permisos = new Set()
  pintar()

  expect(screen.getByText('No puedes ver esto')).toBeInTheDocument()
  expect(screen.queryByText(/Horas en las que no se molesta/)).not.toBeInTheDocument()
})

test('una política que nadie ha tocado lo dice', () => {
  m.politica = politica({ updatedAt: null })
  pintar()
  expect(screen.getByText(/Nadie ha tocado esta política todavía/)).toBeInTheDocument()
})

test('«Enviar ahora» solo con la política guardada activa, no con la casilla', async () => {
  // Apagada, el endpoint responde 409: ofrecer el botón sería ofrecer un error.
  m.politica = politica({ enabled: false })
  pintar()
  expect(screen.queryByRole('button', { name: /Enviar ahora/ })).not.toBeInTheDocument()

  cleanup()
  m.politica = politica({ enabled: true })
  pintar()
  expect(screen.getByRole('button', { name: /Enviar ahora/ })).toBeInTheDocument()
})

test('sin `messaging.send` la política se guarda igual, pero no se dispara', () => {
  m.permisos = new Set(['messaging.read', 'messaging.settings.manage'])
  pintar()

  expect(screen.getByRole('button', { name: /Guardar política/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Enviar ahora/ })).not.toBeInTheDocument()
})

test('sin formas de pago publicadas se avisa: el recordatorio no dice dónde pagar', () => {
  /*
    El mensaje no se queda en blanco —una variable vacía haría que Meta rechazara
    el envío entero—, pero dice «comunícate con nosotros». Desde esta pantalla no
    había forma de enterarse.
  */
  m.formasDePago = [{ showInReminders: false }]
  pintar()

  expect(screen.getByText(/Los recordatorios no dicen dónde pagar/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Añadir una' })).toHaveAttribute(
    'href',
    '/config/formas-de-pago',
  )
})

test('con al menos una publicada el aviso no sale', () => {
  m.formasDePago = [{ showInReminders: true }]
  pintar()
  expect(screen.queryByText(/Los recordatorios no dicen dónde pagar/)).not.toBeInTheDocument()
})

test('con la cobranza apagada el aviso sobra, aunque no haya formas de pago', () => {
  // Apagada no hay mensaje que salga mal: el aviso sería ruido.
  m.formasDePago = []
  m.politica = politica({ enabled: false })
  pintar()

  expect(screen.queryByText(/Los recordatorios no dicen dónde pagar/)).not.toBeInTheDocument()
})
