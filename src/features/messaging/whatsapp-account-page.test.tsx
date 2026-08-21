import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ApiError } from '@/api/http-client'
import type { WhatsAppAccount } from '@/api/generated/model'

const m = vi.hoisted(() => ({
  connected: false,
  account: null as WhatsAppAccount | null,
  conectar: vi.fn(),
  desconectar: vi.fn(),
  avisos: [] as { texto: string; extra?: string }[],
  permisos: new Set<string>(),
  byo: true,
}))

vi.mock('sonner', () => ({
  toast: {
    success: (texto: string, opts?: { description?: string }) =>
      m.avisos.push({ texto, extra: opts?.description }),
    error: (texto: string, opts?: { description?: string }) =>
      m.avisos.push({ texto, extra: opts?.description }),
  },
}))
vi.mock('@/features/organizations/hooks', () => ({
  useCurrentOrg: () => ({ orgId: 'o1', organization: { defaultCurrency: 'COP' } }),
}))
vi.mock('@/features/platform/permissions', () => ({
  useCan: () => (permiso: string) => m.permisos.has(permiso),
  useFeature: () => m.byo,
}))
vi.mock('./hooks', () => ({
  useWhatsAppAccount: () => ({
    connected: m.connected,
    account: m.account,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useConnectWhatsAppAccount: () => ({ mutateAsync: m.conectar, isPending: false }),
  useDisconnectWhatsAppAccount: () => ({ mutateAsync: m.desconectar, isPending: false }),
}))

const { WhatsAppAccountPage } = await import('./whatsapp-account-page')

function cuenta(over: Partial<WhatsAppAccount> = {}): WhatsAppAccount {
  return {
    phoneNumberId: '123456789',
    phoneNumberLabel: 'Cobranza',
    accessTokenLast4: '9f2c',
    wabaId: 'waba-1',
    hasAppSecret: true,
    updatedAt: '2026-08-10T12:00:00Z',
    ...over,
  }
}

const pintar = () =>
  render(
    <MemoryRouter>
      <WhatsAppAccountPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  m.connected = false
  m.account = null
  m.conectar = vi.fn().mockResolvedValue({})
  m.desconectar = vi.fn().mockResolvedValue({})
  m.avisos = []
  m.byo = true
  m.permisos = new Set(['whatsapp.settings.read', 'whatsapp.settings.manage'])
})
afterEach(cleanup)

test('no tener número propio no es un error: es una de las dos formas de funcionar', () => {
  pintar()

  expect(screen.getByText('Sale por el número de Nummo')).toBeInTheDocument()
  expect(screen.getByText(/descuenta del cupo mensual/i)).toBeInTheDocument()
  // Ni error ni «pendiente de configurar».
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Conectar mi número/ })).toBeInTheDocument()
})

test('el token no se enseña entero: solo sus últimos cuatro', () => {
  m.connected = true
  m.account = cuenta()
  pintar()

  expect(screen.getByText('••••••••9f2c')).toBeInTheDocument()
  expect(screen.getByText('Conectado')).toBeInTheDocument()
})

test('reemplazar no rellena el token, porque el backend no lo devuelve', async () => {
  m.connected = true
  m.account = cuenta()
  pintar()
  await userEvent.click(screen.getByRole('button', { name: 'Reemplazar credenciales' }))

  const campo = screen.getByLabelText(/Token de acceso/)
  expect(campo).toHaveValue('')
  expect(screen.getByText(/no lo guardamos de forma que se pueda volver a leer/i)).toBeInTheDocument()
})

test('desconectar avisa de que la cobranza NO se apaga y vuelve a gastar cupo', async () => {
  m.connected = true
  m.account = cuenta()
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Desconectar/ }))

  const dialogo = screen.getByRole('dialog')
  expect(within(dialogo).getByText(/La cobranza no se apaga/)).toBeInTheDocument()
  expect(within(dialogo).getByText(/vuelven a gastar el cupo/)).toBeInTheDocument()

  await userEvent.click(within(dialogo).getByRole('button', { name: 'Desconectar' }))
  expect(m.desconectar).toHaveBeenCalledWith({ orgId: 'o1' })
  expect(m.avisos.at(-1)?.extra).toMatch(/sigue saliendo/i)
})

test('un número que ya reclamó otra organización se cuenta como tal, no como fallo genérico', async () => {
  // Un `ApiError` de verdad y no un objeto parecido: `errorCode` e `isApiStatus`
  // comprueban `instanceof`, así que un doble a mano probaría otra cosa.
  m.conectar = vi.fn().mockRejectedValue(
    new ApiError(409, { code: 'CONFLICT', message: 'El número ya está en uso' }),
  )
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Conectar mi número/ }))
  await userEvent.type(screen.getByLabelText(/ID del número de teléfono/), '123')
  await userEvent.type(screen.getByLabelText(/Token de acceso/), 'tok')
  await userEvent.click(screen.getByRole('button', { name: 'Conectar' }))

  expect(m.avisos.at(-1)?.texto).toMatch(/ya está conectado en otra organización/i)
})

test('los campos opcionales vacíos viajan como null, no como cadena vacía', async () => {
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Conectar mi número/ }))
  await userEvent.type(screen.getByLabelText(/ID del número de teléfono/), '123456789')
  await userEvent.type(screen.getByLabelText(/Token de acceso/), 'EAAG...')
  await userEvent.click(screen.getByRole('button', { name: 'Conectar' }))

  expect(m.conectar).toHaveBeenCalledWith({
    orgId: 'o1',
    data: {
      phoneNumberId: '123456789',
      phoneNumberLabel: null,
      accessToken: 'EAAG...',
      wabaId: null,
      appSecret: null,
    },
  })
})

test('el formulario vacío no llega al API: el `required` nativo no vale aquí', async () => {
  // `FormDialog` monta su <form> con `noValidate`, así que quien valida es Zod.
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Conectar mi número/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Conectar' }))

  expect(m.conectar).not.toHaveBeenCalled()
  expect(await screen.findByText(/Sin el ID del número/)).toBeInTheDocument()
  expect(screen.getByText(/Hace falta el token que da Meta/)).toBeInTheDocument()
})

test('un token escrito y abandonado no reaparece al volver a abrir', async () => {
  // El diálogo se monta solo mientras está abierto: con `open={false}` React no
  // lo desmonta y su estado sobrevive — y aquí ese estado es un secreto.
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Conectar mi número/ }))
  await userEvent.type(screen.getByLabelText(/Token de acceso/), 'SECRETO-123')
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  await userEvent.click(screen.getByRole('button', { name: /Conectar mi número/ }))

  expect(screen.getByLabelText(/Token de acceso/)).toHaveValue('')
})

test('conectado sin detalle de cuenta no se cuenta como desconectado', () => {
  // El contrato permite `connected: true` con `account: null`; caer en la
  // tarjeta de «sale por el número de Nummo» diría lo contrario de la verdad.
  m.connected = true
  m.account = null
  pintar()

  expect(screen.getByText('Conectado')).toBeInTheDocument()
  expect(screen.queryByText('Sale por el número de Nummo')).not.toBeInTheDocument()
})

test('sin la feature no se ofrece conectar, pero se dice que se envía igual', () => {
  m.byo = false
  pintar()

  expect(screen.getByText('Sale por el número de Nummo')).toBeInTheDocument()
  expect(screen.getByText(/Tu plan no incluye conectar tu propio número/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Conectar mi número/ })).not.toBeInTheDocument()
})

test('sin permiso de escritura se mira y no se toca', () => {
  m.permisos = new Set(['whatsapp.settings.read'])
  m.connected = true
  m.account = cuenta()
  pintar()

  expect(screen.getByText('••••••••9f2c')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Desconectar/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Reemplazar credenciales' })).not.toBeInTheDocument()
})

test('sin permiso de lectura sale el candado', () => {
  m.permisos = new Set()
  pintar()
  expect(screen.getByText('No puedes ver esto')).toBeInTheDocument()
})
