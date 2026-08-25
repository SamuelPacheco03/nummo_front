import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ApiError } from '@/api/http-client'
import type { CollectionPolicy, WhatsAppTemplate } from '@/api/generated/model'
import { horarioLegal, politicaDeCobranza as politica } from './policy-fixture'
import { sendTimeOutOfRange } from './errors'

const m = vi.hoisted(() => ({
  guardar: vi.fn(),
  avisos: [] as string[],
  politica: null as CollectionPolicy | null,
  cargando: false,
  plantillas: [] as WhatsAppTemplate[],
  feature: true,
  permisos: new Set<string>(),
  correr: vi.fn(),
  cuentasPublicadas: undefined as number | undefined,
  renglonesDePago: [] as string[],
  contacto: { phone: '+57 310 594 8908' as string | null, email: null as string | null },
  guardarContacto: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: (t: string) => m.avisos.push(t), error: (t: string) => m.avisos.push(t) },
}))
vi.mock('@/features/masters/hooks', () => ({
  useFinancialAccounts: () => ({ items: [] }),
  // `undefined` es «todavía no se sabe»; cero es «no hay ninguna publicada».
  usePublishedAccounts: () => ({ count: m.cuentasPublicadas, previews: m.renglonesDePago }),
}))
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({
    orgId: 'o1',
    organization: {
      defaultCurrency: 'COP',
      contactPhone: m.contacto.phone,
      contactEmail: m.contacto.email,
    },
  }),
}))
vi.mock('@/features/config/hooks', () => ({
  useUpdateOrg: () => ({ mutateAsync: m.guardarContacto, isPending: false }),
}))
vi.mock('@/features/platform/permissions', () => ({
  useCan: () => (permiso: string) => m.permisos.has(permiso),
  useFeature: () => m.feature,
}))
vi.mock('./hooks', () => ({
  useCollectionPolicy: () => ({
    policy: m.politica ?? undefined,
    isPending: m.cargando,
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
    displayName: 'Vencida — solo recordatorio',
    purpose: 'Se envía cuando el deudor tiene una sola factura vencida.',
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
      <CollectionPolicyPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  m.guardar = vi.fn().mockResolvedValue({ data: politica() })
  m.avisos = []
  m.politica = politica()
  m.cargando = false
  m.plantillas = [plantilla(), plantilla({ id: 't2', templateKey: 'cobro_por_vencer', name: 'Por vencer' })]
  m.feature = true
  m.permisos = new Set([
    'messaging.read',
    'messaging.settings.manage',
    'messaging.send',
    'whatsapp.templates.read',
    'financial_accounts.read',
    // Quien configura la cobranza suele poder editar la empresa: es el camino normal.
    'organization.manage',
  ])
  m.cuentasPublicadas = 1
  m.renglonesDePago = ['Bancolombia ahorros 123-456789-00 a nombre de Semillas']
  m.contacto = { phone: '+57 310 594 8908', email: null }
  m.guardarContacto = vi.fn().mockResolvedValue({ data: {} })
  m.correr = vi.fn().mockResolvedValue({
    data: { before: 0, onDue: 0, overdue: 0, queued: 0, skipped: 0, overdueDeferred: 0, withoutPhone: 0, sameDayDeferred: 0 },
  })
})
afterEach(cleanup)

test('lo guardado se pinta aunque la política llegue después del primer render', () => {
  /*
    Regresión, y es el caso **normal** y no el raro: la pantalla monta con
    `orgId` ya resuelto —sale de la caché de organizaciones— y la política
    todavía en vuelo, porque su consulta ni siquiera arranca hasta tener ese id.
    Así que los datos NUNCA llegan en el primer render.

    Si la clave de hidratación no cambia al llegar, el efecto ya corrió en vacío
    y no vuelve a correr: el formulario se queda con sus valores por defecto y lo
    que hay guardado se lee como si nadie lo hubiera configurado. Peor todavía,
    volver a pulsar «Guardar» escribiría esos valores por defecto encima.

    El resto de tests de este archivo entregan la política ya cargada en el
    primer render, que es justo el único camino en el que esto funcionaba.
  */
  m.cargando = true
  m.politica = null
  const { rerender } = pintar()
  expect(screen.queryByRole('switch', { name: /Cobranza automática/ })).toBeNull()

  m.cargando = false
  m.politica = politica({ enabled: true, overdueTemplateKey: 'cobro_vencido' })
  rerender(
    <MemoryRouter>
      <CollectionPolicyPage />
    </MemoryRouter>,
  )

  expect(screen.getByRole('switch', { name: /Cobranza automática/ })).toBeChecked()
  expect(screen.getByLabelText(/Vencida, cuando es una sola cuenta/)).toHaveValue('cobro_vencido')
})

test('la semana legal se enseña agrupada, y el domingo con palabras', () => {
  /*
    No es una preferencia: la fija la ley y no se puede tocar ni para ampliarla ni
    para recortarla. Aun así se enseña —en vez de esconderse— porque es lo que
    explica por qué un recordatorio no salió el domingo.
  */
  pintar()

  // Siete pastillas: se viene a comprobar un día concreto, no a leer un horario.
  for (const letra of ['L', 'M', 'X', 'J', 'V', 'S', 'D']) {
    expect(screen.getByText(letra)).toBeInTheDocument()
  }
  expect(screen.getAllByText('07:00')).toHaveLength(5)
  expect(screen.getByText('15:00')).toBeInTheDocument()
  // El domingo llega como `null`: pintarlo «de 00:00 a 00:00» diría que se
  // escribe a medianoche.
  expect(screen.getByText('nunca')).toBeInTheDocument()
})

test('el horario cita la norma que lo fija, no se lo atribuye a Nummo', () => {
  pintar()
  expect(screen.getByText(/Ley 2300 de 2023, art. 3/)).toBeInTheDocument()
})

test('el horario no se puede editar: no hay ni un control de hora suelto', () => {
  // Que un cliente quiera ser MÁS estricto tampoco se acepta: «no configurable»
  // vale en las dos direcciones.
  pintar()
  expect(screen.queryByLabelText('Desde')).toBeNull()
  expect(screen.queryByLabelText('Hasta')).toBeNull()
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

test('el horario NO viaja en el guardado: lo fija la ley y el PUT lo rechazaría', async () => {
  /*
    La Ley 2300 fija la franja, así que `quietStart`, `quietEnd`, `sendDays` y
    `skipHolidays` dejaron de aceptarse: mandar uno solo tumba el guardado entero
    con un 422 y no se salva ni una plantilla.

    Esto se vigila desde aquí y no desde los tipos porque el fallo es de omisión:
    el día que alguien vuelva a meter el campo en el objeto, TypeScript sí salta
    —ya no está en `UpdateCollectionPolicyInput`—, pero el día que se copie este
    formulario para otro país el guardarraíl tiene que ser una frase, no un tipo.
  */
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Guardar política/ }))

  const [{ data }] = m.guardar.mock.calls[0] as [{ data: Record<string, unknown> }]
  for (const prohibido of ['quietStart', 'quietEnd', 'sendDays', 'skipHolidays']) {
    expect(data).not.toHaveProperty(prohibido)
  }
})

test('vaciar la plantilla manda null, no cadena vacía', async () => {
  pintar()
  await userEvent.selectOptions(
    screen.getByLabelText(/Vencida, cuando es una sola cuenta/),
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

  expect(screen.getByLabelText(/Vencida, cuando es una sola cuenta/)).toBeInTheDocument()
  expect(screen.getByLabelText(/Vencida, cuando son varias/)).toBeInTheDocument()
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
  await userEvent.selectOptions(screen.getByLabelText(/Vencida, cuando son varias/), '')
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

  expect(screen.getByText('Horario permitido')).toBeInTheDocument()
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

test('sin ninguna cuenta publicada se avisa: el recordatorio no dice dónde pagar', () => {
  /*
    El mensaje no se queda en blanco —una variable vacía haría que Meta rechazara
    el envío entero—, pero dice «comunícate con nosotros». Desde esta pantalla no
    había forma de enterarse.
  */
  m.cuentasPublicadas = 0
  pintar()

  expect(screen.getByText(/Los recordatorios no dicen dónde pagar/)).toBeInTheDocument()
  // Ya no hay pantalla de formas de pago: se fusionaron con las cuentas.
  expect(screen.getByRole('link', { name: 'Publicar una cuenta' })).toHaveAttribute(
    'href',
    '/maestros/cuentas',
  )
})

test('con al menos una publicada el aviso no sale', () => {
  m.cuentasPublicadas = 1
  pintar()
  expect(screen.queryByText(/Los recordatorios no dicen dónde pagar/)).not.toBeInTheDocument()
})

test('con la cobranza apagada el aviso sobra, aunque no haya formas de pago', () => {
  // Apagada no hay mensaje que salga mal: el aviso sería ruido.
  m.cuentasPublicadas = 0
  m.politica = politica({ enabled: false })
  pintar()

  expect(screen.queryByText(/Los recordatorios no dicen dónde pagar/)).not.toBeInTheDocument()
})

/* ---------- Las dos generaciones de plantilla ---------- */

/** Una que dice dónde pagar se reconoce por su variable, no por su nombre. */
function conDatosDePago(over: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate {
  return plantilla({
    id: 'v2',
    templateKey: 'cobro_vencido_v2',
    name: 'Cobro vencido (con datos de pago)',
    parameterNames: ['nombre', 'empresa', 'concepto', 'monto', 'fecha', 'como_pagar'],
    ...over,
  })
}

test('las dos generaciones van agrupadas, no seis opciones en fila', () => {
  m.plantillas = [plantilla(), conDatosDePago()]
  pintar()

  const select = screen.getByLabelText(/Vencida, cuando es una sola cuenta/)
  const grupos = [...select.querySelectorAll('optgroup')].map((g) => g.label)
  expect(grupos).toEqual(['Dicen dónde pagar', 'Sin datos de pago'])
})

test('con una aprobada que dice dónde pagar, se ofrece repuntar', () => {
  /*
    El repunte es un acto del usuario: el backend no cambia la política solo. Sin
    el aviso, quien tenga la vieja puesta no tendría cómo enterarse.
  */
  m.plantillas = [plantilla(), conDatosDePago()]
  pintar()

  expect(
    screen.getByRole('button', { name: /Hay una versión que dice dónde pagar/ }),
  ).toBeInTheDocument()
})

test('pulsarlo cambia la plantilla elegida', async () => {
  m.plantillas = [plantilla(), conDatosDePago()]
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Hay una versión/ }))
  await userEvent.click(screen.getByRole('button', { name: /Guardar política/ }))

  expect(m.guardar).toHaveBeenCalledWith({
    orgId: 'o1',
    data: expect.objectContaining({ overdueTemplateKey: 'cobro_vencido_v2' }),
  })
})

test('mientras Meta la revisa NO se ofrece: no hay nada que hacer todavía', () => {
  // Repuntar a una que no puede enviar dejaría la cobranza muda.
  m.plantillas = [plantilla(), conDatosDePago({ status: 'PENDING', canSend: false })]
  pintar()

  expect(screen.queryByRole('button', { name: /Hay una versión/ })).not.toBeInTheDocument()
})

test('si la puesta ya dice dónde pagar, no se sugiere nada', () => {
  m.politica = politica({ overdueTemplateKey: 'cobro_vencido_v2' })
  m.plantillas = [plantilla(), conDatosDePago()]
  pintar()

  expect(screen.queryByRole('button', { name: /Hay una versión/ })).not.toBeInTheDocument()
})

test('sin pareja no se sugiere: una plantilla propia no se llama `_v2`', () => {
  /*
    El emparejado va por la clave, que es lo único que relaciona las dos. Es una
    heurística acotada, y falla hacia el silencio.
  */
  m.plantillas = [plantilla(), conDatosDePago({ templateKey: 'mi_plantilla_propia' })]
  pintar()

  expect(screen.queryByRole('button', { name: /Hay una versión/ })).not.toBeInTheDocument()
})

/* ---------- Las tres etapas ---------- */

test('apagar una etapa manda null, y cero es otra cosa', async () => {
  /*
    La distinción que se pierde con un solo campo numérico: `null` es «esta etapa
    no manda nada» y `0` es «el mismo día del vencimiento» —un aviso más, no uno
    menos—. Por eso el interruptor va separado del número.
  */
  pintar()
  await userEvent.click(screen.getByRole('switch', { name: 'Avisar antes' }))
  await userEvent.click(screen.getByRole('button', { name: /Guardar política/ }))

  expect(m.guardar).toHaveBeenCalledWith({
    orgId: 'o1',
    data: expect.objectContaining({ daysBefore: null }),
  })
})

test('el número de días viaja cuando la etapa está encendida', async () => {
  m.politica = politica({ daysAfter: 4 })
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Avisar la mora: un día más/ }))
  await userEvent.click(screen.getByRole('button', { name: /Guardar política/ }))

  expect(m.guardar).toHaveBeenCalledWith({
    orgId: 'o1',
    data: expect.objectContaining({ daysAfter: 5 }),
  })
})

test('el stepper no se sale del rango que acepta el contrato', async () => {
  // `daysAfter` va de 0 a 90, y cero es válido: avisa el mismo día del vencimiento.
  m.politica = politica({ daysAfter: 0 })
  pintar()
  expect(screen.getByRole('button', { name: /Avisar la mora: un día menos/ })).toBeDisabled()
  expect(screen.getByLabelText(/Avisar la mora, el mismo día/)).toHaveTextContent('0')
})

test('apagada, la etapa no deja un número suelto que no se va a guardar', () => {
  m.politica = politica({ daysBefore: null })
  pintar()

  expect(screen.getByRole('switch', { name: 'Avisar antes' })).not.toBeChecked()
  expect(screen.queryByRole('button', { name: /Avisar antes: un día más/ })).toBeNull()
  expect(screen.getByText('Apagada: no sale este aviso.')).toBeInTheDocument()
})

test('la pantalla dice lo que nadie va a suponer: la mora avisa UNA vez', () => {
  /*
    Antes el aviso de mora salía cada día mientras la deuda existiera. Ahora sale
    una vez y nunca más, así que a quien no paga Nummo deja de escribirle. Es
    deliberado, pero es lo bastante distinto de lo que la gente espera como para
    que la pantalla lo diga.
  */
  pintar()
  expect(screen.getByText(/no vuelve a insistir/)).toBeInTheDocument()
  expect(screen.getByText(/de 3 avisos por cuenta/)).toBeInTheDocument()
})

test('el tope sale de la respuesta, no escrito a mano en la pantalla', () => {
  // No es un número que el backend comprueba: es que no existen más etapas.
  m.politica = politica({ schedule: horarioLegal({ maxRemindersPerReceivable: 2 }) })
  pintar()
  expect(screen.getByText(/de 2 avisos por cuenta/)).toBeInTheDocument()
})

test('con las tres apagadas se dice que no sale nada, en vez de callar', () => {
  m.politica = politica({ daysBefore: null, remindOnDueDate: false, daysAfter: null })
  pintar()
  expect(screen.getByText(/no se le escribe nunca/)).toBeInTheDocument()
})

test('con la mora a 0 días se avisa de que «el día que vence» no va a salir', () => {
  // Los dos caen el mismo día y gana el de mora, porque se mira primero. No es un
  // error, pero deja una casilla marcada que no hace nada.
  m.politica = politica({ remindOnDueDate: true, daysAfter: 0 })
  pintar()
  expect(screen.getByText(/gana el de mora/)).toBeInTheDocument()
})

/* ---------- La hora de envío ---------- */

test('el desplegable de horas no ofrece las 15:00', async () => {
  /*
    La franja es `[inicio, fin)` y acaba a las 14:59 porque el sábado cierra a
    las tres. Ofrecer las 15:00 sería ofrecer un valor que el PUT rechaza.
  */
  pintar()
  const select = screen.getByLabelText(/A qué hora salen/)
  const horas = within(select).getAllByRole('option').map((o) => o.textContent)

  expect(horas).toContain('08:00')
  expect(horas).toContain('14:00')
  expect(horas).not.toContain('15:00')
  expect(horas).not.toContain('07:00')
})

test('la hora elegida viaja al guardar', async () => {
  pintar()
  await userEvent.selectOptions(screen.getByLabelText(/A qué hora salen/), '09:00')
  await userEvent.click(screen.getByRole('button', { name: /Guardar política/ }))

  expect(m.guardar).toHaveBeenCalledWith({
    orgId: 'o1',
    data: expect.objectContaining({ sendAt: '09:00' }),
  })
})

test('una hora fuera de rango se explica con el rango que manda el servidor', async () => {
  /*
    El rango sale del error, no escrito aquí: es el backend quien sabe que el
    sábado cierra a las tres. Codificarlo sería la ley escrita en el front.
  */
  m.guardar = vi.fn().mockRejectedValue(
    new ApiError(422, {
      code: 'VALIDATION',
      message: 'Invalid',
      details: { reason: 'SEND_TIME_OUT_OF_RANGE', earliest: '08:00', latest: '14:59' },
    }),
  )
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Guardar política/ }))

  expect(m.avisos.at(-1)).toMatch(/queda fuera del horario/)
})

test('un 422 sin motivo cae al mensaje genérico, no inventa uno', () => {
  // Sin `details.reason` es un fallo de esquema corriente y no tiene nada que ver
  // con la ley: darle el texto del horario mentiría sobre la causa.
  expect(sendTimeOutOfRange(new ApiError(422, { code: 'VALIDATION', message: 'x' }))).toBeNull()
})

/* ---------- El cuarto selector ---------- */

test('«por vencer» también lleva su plural: son cuatro plantillas, no dos', async () => {
  // Meta no pluraliza, así que cada momento necesita su singular y su plural.
  pintar()

  expect(screen.getByLabelText(/Por vencer, cuando es una sola cuenta/)).toBeInTheDocument()
  expect(screen.getByLabelText(/Por vencer, cuando son varias/)).toBeInTheDocument()

  await userEvent.selectOptions(screen.getByLabelText(/Por vencer, cuando son varias/), '')
  await userEvent.click(screen.getByRole('button', { name: /Guardar política/ }))

  expect(m.guardar).toHaveBeenCalledWith({
    orgId: 'o1',
    data: expect.objectContaining({ dueSoonSummaryTemplateKey: null }),
  })
})

/* ---------- El enlace de pago ---------- */

test('el enlace guardado se pinta, y vacío viaja como null', async () => {
  m.politica = politica({ paymentLink: 'https://pagos.miempresa.co/x' })
  pintar()

  const campo = screen.getByLabelText(/Enlace de pago/)
  expect(campo).toHaveValue('https://pagos.miempresa.co/x')

  await userEvent.clear(campo)
  await userEvent.click(screen.getByRole('button', { name: /Guardar política/ }))
  expect(m.guardar).toHaveBeenCalledWith({
    orgId: 'o1',
    data: expect.objectContaining({ paymentLink: null }),
  })
})

test('un enlace sin cifrar no sale hacia el deudor', async () => {
  /*
    El contrato solo declara `format: uri`, así que esta comprobación es la única
    que hay: un enlace que pide dinero dentro de un mensaje de cobro no puede ir
    por http, o enseñamos a los deudores a fiarse de cualquier enlace.
  */
  pintar()
  await userEvent.type(screen.getByLabelText(/Enlace de pago/), 'http://pagos.example.com')
  await userEvent.click(screen.getByRole('button', { name: /Guardar política/ }))

  expect(m.avisos.at(-1)).toMatch(/tiene que empezar por https/)
  expect(m.guardar).not.toHaveBeenCalled()
})

test('un espacio delante no convierte un enlace válido en un error', async () => {
  // Copiar de WhatsApp o de una hoja de cálculo arrastra el espacio, y el campo
  // `type="url"` lo esconde: el usuario ve un https y le dicen que no lo es.
  pintar()
  await userEvent.click(screen.getByLabelText(/Enlace de pago/))
  await userEvent.paste('  https://pagos.miempresa.co/x  ')
  await userEvent.click(screen.getByRole('button', { name: /Guardar política/ }))

  expect(m.guardar).toHaveBeenCalledWith({
    orgId: 'o1',
    data: expect.objectContaining({ paymentLink: 'https://pagos.miempresa.co/x' }),
  })
})

/* ---------- El aviso de «dónde pagar» ---------- */

test('mientras no se sabe si hay cuentas publicadas, no se avisa', () => {
  /*
    La política llega antes que las cuentas, así que avisar con la lista todavía
    vacía ponía el ámbar por delante de una organización bien configurada. Y a
    quien no puede ver cuentas se le quedaba puesto para siempre, con un enlace a
    una pantalla que no puede abrir.
  */
  m.cuentasPublicadas = undefined
  pintar()
  expect(screen.queryByText(/Los recordatorios no dicen dónde pagar/)).toBeNull()
})

/* ---------- A dónde escribe el deudor ---------- */

test('sin contacto de la empresa se pide aquí mismo, no en otra pantalla', async () => {
  /*
    Los recordatorios salen de un número que no recibe respuestas —el de la
    plataforma es compartido—, así que el mensaje tiene que decir a dónde
    contestar. Sin eso, encender la cobranza responde 422.
  */
  m.contacto = { phone: null, email: null }
  pintar()

  expect(screen.getByText(/Falta decirle al deudor a dónde escribirte/)).toBeInTheDocument()

  await userEvent.type(screen.getByLabelText('Correo'), 'cartera@miempresa.co')
  await userEvent.click(screen.getByRole('button', { name: /Guardar contacto/ }))

  expect(m.guardarContacto).toHaveBeenCalledWith({
    orgId: 'o1',
    data: { contactPhone: null, contactEmail: 'cartera@miempresa.co' },
  })
})

test('guardar el contacto no envía la política entera', async () => {
  // El bloque vive dentro del formulario de la política: sin `type="button"` el
  // botón mandaría justo la petición que el backend acaba de rechazar.
  m.contacto = { phone: null, email: null }
  pintar()

  await userEvent.type(screen.getByLabelText('Teléfono'), '+57 310 594 8908')
  await userEvent.click(screen.getByRole('button', { name: /Guardar contacto/ }))

  expect(m.guardarContacto).toHaveBeenCalled()
  expect(m.guardar).not.toHaveBeenCalled()
})

test('con uno de los dos basta, y sin ninguno se dice antes de gastar la petición', async () => {
  m.contacto = { phone: null, email: null }
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Guardar contacto/ }))

  expect(m.avisos.at(-1)).toMatch(/al menos un teléfono o un correo/)
  expect(m.guardarContacto).not.toHaveBeenCalled()
})

test('con contacto puesto el aviso no sale', () => {
  m.contacto = { phone: '+57 310 594 8908', email: null }
  pintar()
  expect(screen.queryByText(/Falta decirle al deudor a dónde escribirte/)).toBeNull()
})

test('con la cobranza apagada no se pide: solo estorba al encenderla', async () => {
  m.contacto = { phone: null, email: null }
  m.politica = politica({ enabled: false })
  pintar()

  expect(screen.queryByText(/Falta decirle al deudor a dónde escribirte/)).toBeNull()

  // Y aparece en cuanto se marca la casilla, sin esperar a guardar.
  await userEvent.click(screen.getByRole('switch', { name: /Cobranza automática/ }))
  expect(screen.getByText(/Falta decirle al deudor a dónde escribirte/)).toBeInTheDocument()
})

test('quien no puede editar la organización sabe a quién pedírselo', () => {
  // No hay nada que pueda hacer aquí, así que el formulario en línea sobraría.
  m.contacto = { phone: null, email: null }
  m.permisos = new Set(['messaging.read', 'messaging.settings.manage'])
  pintar()

  expect(screen.getByText(/pídeselo a quien la administre/)).toBeInTheDocument()
  expect(screen.queryByLabelText('Teléfono')).toBeNull()
})

test('el 422 de contacto se explica, no se enseña crudo', async () => {
  // El contrato todavía no lo declara, así que solo se lee el motivo.
  m.guardar = vi.fn().mockRejectedValue(
    new ApiError(422, {
      code: 'VALIDATION',
      message: 'Invalid',
      details: { reason: 'ORGANIZATION_CONTACT_REQUIRED', fields: ['contactPhone', 'contactEmail'] },
    }),
  )
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Guardar política/ }))

  expect(m.avisos.at(-1)).toMatch(/a dónde te escribe quien te debe/)
})
