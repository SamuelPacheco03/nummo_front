import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { json, tenantApiResponse } from '@/test/tenant-api'
import type { AutoCharge, SetAutoCharge } from '@/api/generated/model'
import { AutoChargeSection, type AutoChargeCopy } from './auto-charge-section'

/*
  Una sola suite para las dos caras del espejo (§92.3): el mecanismo es uno y lo
  que cambia entre cobrar y pagar son las palabras, que llegan como props. Dos
  archivos calcados serían el duplicado que el componente compartido vino a
  quitar.
*/

const guardado = vi.hoisted(() => ({ cuerpos: [] as SetAutoCharge[] }))

const COPY: AutoChargeCopy = {
  title: 'Cobro automático',
  description: 'Se registra solo el día que vence.',
  warning: { title: 'Solo para plata que sabes que entra', body: 'Apaga la mora y el interés.' },
  enableTitle: 'Activar el cobro automático',
  disableDescription: 'Volverá a esperar que alguien lo registre.',
}

function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url)
      const pagina = (data: unknown[]) => json({ data, page: 1, pageSize: 100, total: data.length, totalPages: 1 })
      if (u.includes('/financial-accounts')) {
        return pagina([{ id: 'fa1', name: 'Bancolombia', isActive: true }])
      }
      if (u.includes('/payment-methods')) {
        return pagina([{ id: 'pm1', name: 'Transferencia', isActive: true }])
      }
      return tenantApiResponse(u) ?? json({})
    }),
  )
}

function montar(autoCharge: AutoCharge | null, canManage = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AutoChargeSection
          autoCharge={autoCharge}
          canManage={canManage}
          copy={COPY}
          onSave={async (body) => {
            guardado.cuerpos.push(body)
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const ENCENDIDO: AutoCharge = {
  mode: 'AUTO_RECORD',
  financialAccountId: 'fa1',
  paymentMethodId: 'pm1',
  startDate: '2026-08-01',
  enabledBy: null,
}

beforeEach(() => {
  guardado.cuerpos = []
  stubApi()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('apagado dice qué haría, y encendido de dónde sale el dinero', async () => {
  montar(null)
  expect(screen.getByText('Apagado')).toBeVisible()
  expect(screen.getByText('Se registra solo el día que vence.')).toBeVisible()

  cleanup()
  montar(ENCENDIDO)
  expect(screen.getByText('Se registra solo')).toBeVisible()
  expect(await screen.findByText('Bancolombia')).toBeVisible()
  expect(screen.getByText('Transferencia')).toBeVisible()
})

test('«encendido sin cuenta de dónde sacar» no se puede mandar', async () => {
  /*
    El contrato lo hace imposible con una unión discriminada, y la pantalla tiene
    que decir lo mismo: sin cuenta y sin método no sale nada hacia el API.
  */
  const user = userEvent.setup()
  montar(null)

  await user.click(screen.getByRole('button', { name: 'Activar' }))
  const dialogo = await screen.findByRole('dialog')
  await user.click(within(dialogo).getByRole('button', { name: 'Activar' }))

  expect(guardado.cuerpos).toEqual([])
  expect(screen.getByRole('dialog')).toBeVisible()
})

test('encender manda el modo con su cuenta y su método', async () => {
  const user = userEvent.setup()
  montar(null)

  await user.click(screen.getByRole('button', { name: 'Activar' }))
  const dialogo = await screen.findByRole('dialog')
  // Lo que hay que saber antes de encenderlo, en el propio diálogo.
  expect(within(dialogo).getByText('Solo para plata que sabes que entra')).toBeVisible()

  await user.selectOptions(await within(dialogo).findByLabelText(/Cuenta de dinero/), 'fa1')
  await user.selectOptions(within(dialogo).getByLabelText(/Método de pago/), 'pm1')
  await user.click(within(dialogo).getByRole('button', { name: 'Activar' }))

  await waitFor(() =>
    expect(guardado.cuerpos).toEqual([
      { mode: 'AUTO_RECORD', financialAccountId: 'fa1', paymentMethodId: 'pm1' },
    ]),
  )
})

test('apagarlo pide confirmación y manda OFF', async () => {
  const user = userEvent.setup()
  montar(ENCENDIDO)

  await user.click(screen.getByRole('button', { name: 'Desactivar' }))
  const dialogo = await screen.findByRole('dialog')
  expect(within(dialogo).getByText('Volverá a esperar que alguien lo registre.')).toBeVisible()

  await user.click(within(dialogo).getByRole('button', { name: 'Desactivar' }))

  await waitFor(() => expect(guardado.cuerpos).toEqual([{ mode: 'OFF' }]))
})

test('sin el permiso se ve el estado y no se puede tocar', async () => {
  // El permiso llega como prop porque es distinto en cada cara del espejo
  // (§87.2): `payments.create` de un lado, `disbursements.create` del otro.
  montar(ENCENDIDO, false)

  expect(screen.getByText('Se registra solo')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Activar' })).not.toBeInTheDocument()
})

test('encendido enlaza a dónde se elige cómo enterarse si falla', async () => {
  montar(ENCENDIDO)

  expect(screen.getByRole('link', { name: 'tus notificaciones' })).toHaveAttribute(
    'href',
    '/config/notificaciones',
  )
})
