import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { CAPABILITIES, json, tenantApiResponse } from '@/test/tenant-api'
import { FinancialAccountsPage } from './financial-accounts-page'

/*
  Lo que se prueba aquí es **lo que el deudor acaba viendo**, que es la parte
  nueva: los datos de pago dejaron de ser un recurso propio y viven en la cuenta.
  El CRUD de un maestro ya está cubierto por conceptos de cobro (§94.0).
*/

const estado = vi.hoisted(() => ({
  permisos: [] as string[],
  items: [] as Record<string, unknown>[],
  llamadas: [] as { method: string; url: string; body: Record<string, unknown> | undefined }[],
}))

function cuenta(over: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    branchId: null,
    name: 'Bancolombia principal',
    accountType: 'BANK',
    currency: 'COP',
    openingBalance: '0.00',
    openingBalanceDate: '2026-01-01',
    paymentDetails: null,
    paymentPreview: null,
    publishInReminders: false,
    sortOrder: 0,
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    ...over,
  }
}

beforeEach(() => {
  estado.permisos = ['financial_accounts.read', 'financial_accounts.manage', 'financial_accounts.publish']
  estado.items = []
  estado.llamadas = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      const method = (init?.method ?? 'GET').toUpperCase()
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined
      estado.llamadas.push({ method, url: u, body })

      if (u.includes('/financial-accounts')) {
        if (method !== 'GET') return json(cuenta(body), 201)
        return json({
          data: estado.items,
          page: 1,
          pageSize: 10,
          total: estado.items.length,
          totalPages: 1,
        })
      }
      if (u.includes('/me/capabilities')) return json({ ...CAPABILITIES, permissions: estado.permisos })
      return tenantApiResponse(u) ?? json({})
    }),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
})

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/maestros/cuentas']}>
        <FinancialAccountsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const escrituras = () =>
  estado.llamadas.filter((c) => c.url.includes('/financial-accounts') && c.method !== 'GET')

/*
  `MasterCrud` monta a la vez la barra de escritorio y el botón flotante de
  móvil —las separa el breakpoint, no el DOM—, así que «Nueva cuenta» existe dos
  veces. Cualquiera de las dos abre el mismo diálogo.
*/
async function abrirNueva(user: ReturnType<typeof userEvent.setup>) {
  const [boton] = await screen.findAllByRole('button', { name: /Nueva cuenta/ })
  await user.click(boton!)
  return screen.findByRole('dialog')
}

test('crear una cuenta NO la publica: son dos decisiones', async () => {
  /*
    Una caja chica no debe salir en los mensajes a los deudores porque alguien la
    creó. Publicar viene apagado y hay que pedirlo.
  */
  const user = userEvent.setup()
  montar()
  const dialogo = await abrirNueva(user)

  expect(within(dialogo).getByRole('checkbox', { name: /Enseñársela a quien te debe/ })).not.toBeChecked()
})

test('el formulario cambia de campos según dónde esté la plata', async () => {
  const user = userEvent.setup()
  montar()
  const dialogo = await abrirNueva(user)

  // Una caja no tiene dónde consignar: ni un campo de pago.
  await user.selectOptions(within(dialogo).getByLabelText('Tipo'), 'CASH')
  expect(within(dialogo).queryByLabelText('Banco')).toBeNull()
  expect(within(dialogo).queryByLabelText('Billetera')).toBeNull()

  await user.selectOptions(within(dialogo).getByLabelText('Tipo'), 'BANK')
  expect(within(dialogo).getByLabelText('Banco')).toBeInTheDocument()
  expect(within(dialogo).getByLabelText('Número')).toBeInTheDocument()
  expect(within(dialogo).queryByLabelText('Billetera')).toBeNull()

  await user.selectOptions(within(dialogo).getByLabelText('Tipo'), 'DIGITAL_WALLET')
  expect(within(dialogo).getByLabelText('Billetera')).toBeInTheDocument()
  expect(within(dialogo).getByLabelText('Celular')).toBeInTheDocument()
  expect(within(dialogo).queryByLabelText('Número')).toBeNull()
})

test('publicar sin los datos no pasa: no habría qué enseñarle al deudor', async () => {
  const user = userEvent.setup()
  montar()
  const dialogo = await abrirNueva(user)

  await user.type(within(dialogo).getByLabelText(/^Nombre/), 'Bancolombia')
  await user.selectOptions(within(dialogo).getByLabelText('Tipo'), 'BANK')
  await user.click(within(dialogo).getByRole('checkbox', { name: /Enseñársela a quien te debe/ }))
  await user.click(within(dialogo).getByRole('button', { name: 'Crear' }))

  expect(await within(dialogo).findByText(/Sin el número no se puede consignar/)).toBeInTheDocument()
  expect(escrituras()).toHaveLength(0)
})

test('una caja no se le puede publicar a nadie, y se dice por qué', async () => {
  // Publicar una caja le diría al deudor que venga a pagar a una caja que no
  // sabe dónde está.
  const user = userEvent.setup()
  montar()
  const dialogo = await abrirNueva(user)

  await user.type(within(dialogo).getByLabelText(/^Nombre/), 'Caja chica')
  await user.selectOptions(within(dialogo).getByLabelText('Tipo'), 'CASH')
  await user.click(within(dialogo).getByRole('checkbox', { name: /Enseñársela a quien te debe/ }))
  await user.click(within(dialogo).getByRole('button', { name: 'Crear' }))

  expect(await within(dialogo).findByText(/Una caja no tiene dónde consignar/)).toBeInTheDocument()
  expect(escrituras()).toHaveLength(0)
})

test('los datos completos viajan como `paymentDetails`, con su `kind`', async () => {
  const user = userEvent.setup()
  montar()
  const dialogo = await abrirNueva(user)

  await user.type(within(dialogo).getByLabelText(/^Nombre/), 'Bancolombia principal')
  await user.selectOptions(within(dialogo).getByLabelText('Tipo'), 'BANK')
  await user.type(within(dialogo).getByLabelText('Banco'), 'Bancolombia')
  await user.selectOptions(within(dialogo).getByLabelText('Tipo de cuenta'), 'SAVINGS')
  await user.type(within(dialogo).getByLabelText('Número'), '123-456789-00')
  await user.type(within(dialogo).getByLabelText('A nombre de'), 'Distribuidora El Sol')
  await user.click(within(dialogo).getByRole('checkbox', { name: /Enseñársela a quien te debe/ }))
  await user.click(within(dialogo).getByRole('button', { name: 'Crear' }))

  const [enviada] = escrituras()
  expect(enviada?.body?.paymentDetails).toMatchObject({
    kind: 'BANK',
    bankName: 'Bancolombia',
    accountKind: 'SAVINGS',
    accountNumber: '123-456789-00',
    holderName: 'Distribuidora El Sol',
  })
  expect(enviada?.body?.publishInReminders).toBe(true)
})

test('datos a medias y sin publicar van como null, no como medio objeto', async () => {
  /*
    El contrato exige el juego entero en cuanto hay `kind`, así que mandar media
    cuenta sería un 422. Y como los datos solo se exigen al publicar, dejarlos a
    medias es un estado normal.
  */
  const user = userEvent.setup()
  montar()
  const dialogo = await abrirNueva(user)

  await user.type(within(dialogo).getByLabelText(/^Nombre/), 'Banco sin datos')
  await user.selectOptions(within(dialogo).getByLabelText('Tipo'), 'BANK')
  await user.type(within(dialogo).getByLabelText('Banco'), 'Bancolombia')
  await user.click(within(dialogo).getByRole('button', { name: 'Crear' }))

  const [enviada] = escrituras()
  expect(enviada?.body?.paymentDetails).toBeNull()
  expect(enviada?.body?.publishInReminders).toBe(false)
})

test('media llave no lleva a ninguna parte: el par se exige junto', async () => {
  const user = userEvent.setup()
  montar()
  const dialogo = await abrirNueva(user)

  await user.type(within(dialogo).getByLabelText(/^Nombre/), 'Bancolombia')
  await user.selectOptions(within(dialogo).getByLabelText('Tipo'), 'BANK')
  await user.selectOptions(within(dialogo).getByLabelText(/Llave de transferencia/), 'PHONE')
  await user.click(within(dialogo).getByRole('button', { name: 'Crear' }))

  expect(await within(dialogo).findByText(/La llave en sí/)).toBeInTheDocument()
})

test('sin permiso de publicar la cuenta se edita igual, pero eso no se toca', async () => {
  // Es un permiso más que el de crear cuentas: decide a qué número consignan los
  // clientes, y el deudor no puede notar un cambio.
  estado.permisos = ['financial_accounts.read', 'financial_accounts.manage']
  const user = userEvent.setup()
  montar()
  const dialogo = await abrirNueva(user)

  expect(within(dialogo).getByRole('checkbox', { name: /Enseñársela a quien te debe/ })).toBeDisabled()
  expect(within(dialogo).getByLabelText(/^Nombre/)).toBeEnabled()
  expect(within(dialogo).getByText(/Tu rol no incluye publicar cuentas/)).toBeInTheDocument()
})

test('lo que ve el deudor se pinta tal cual lo compone el servidor', async () => {
  /*
    `paymentPreview` es el renglón exacto del mensaje. Armarlo por nuestra cuenta
    garantizaría que las dos versiones acaben diciendo cosas distintas.
  */
  estado.items = [
    cuenta({
      publishInReminders: true,
      paymentPreview: 'Bancolombia ahorros 123-456789-00 a nombre de Distribuidora El Sol',
    }),
  ]
  montar()

  const vistas = await screen.findAllByText(
    'Bancolombia ahorros 123-456789-00 a nombre de Distribuidora El Sol',
  )
  expect(vistas.length).toBeGreaterThan(0)
})
