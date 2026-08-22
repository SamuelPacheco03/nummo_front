import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentInstructionDialog } from './payment-instruction-dialog'

/*
  Los rótulos se buscan con regex anclada y no con texto exacto: `Field` le pega
  un « *» a los obligatorios, así que `getByLabelText('Banco')` no casa con
  «Banco *».
*/

const enviar = vi.fn()

const pintar = (editing = null) =>
  render(
    <PaymentInstructionDialog
      open
      onOpenChange={() => {}}
      editing={editing}
      loading={false}
      onSubmit={enviar}
    />,
  )

beforeEach(() => {
  enviar.mockReset()
  enviar.mockResolvedValue(undefined)
})
afterEach(cleanup)

test('el formulario cambia de campos con el tipo', async () => {
  pintar()
  // Arranca en cuenta bancaria.
  expect(screen.getByLabelText(/^Banco/)).toBeInTheDocument()
  expect(screen.queryByLabelText(/^Celular/)).not.toBeInTheDocument()

  await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'WALLET')

  expect(await screen.findByLabelText(/^Celular/)).toBeInTheDocument()
  expect(screen.queryByLabelText(/Tipo de cuenta/)).not.toBeInTheDocument()
})

test('una cuenta bancaria manda los cinco campos, y el documento vacío va como null', async () => {
  pintar()
  await userEvent.type(screen.getByLabelText(/^Banco/), 'Bancolombia')
  await userEvent.selectOptions(screen.getByLabelText(/Tipo de cuenta/), 'SAVINGS')
  await userEvent.type(screen.getByLabelText(/^Número/), '123-456789-00')
  await userEvent.type(screen.getByLabelText(/^A nombre de/), 'Distribuidora El Sol')
  await userEvent.click(screen.getByRole('button', { name: 'Añadir' }))

  expect(enviar).toHaveBeenCalledWith({
    label: null,
    details: {
      kind: 'BANK_ACCOUNT',
      bankName: 'Bancolombia',
      accountKind: 'SAVINGS',
      accountNumber: '123-456789-00',
      holderName: 'Distribuidora El Sol',
      holderDocument: null,
    },
  })
})

test('el tipo de cuenta es obligatorio: consignar a la que no es rebota', async () => {
  pintar()
  await userEvent.type(screen.getByLabelText(/^Banco/), 'Bancolombia')
  await userEvent.type(screen.getByLabelText(/^Número/), '123')
  await userEvent.type(screen.getByLabelText(/^A nombre de/), 'Ana')
  await userEvent.click(screen.getByRole('button', { name: 'Añadir' }))

  expect(enviar).not.toHaveBeenCalled()
  expect(await screen.findByText(/consignar a la que no es rebota/)).toBeInTheDocument()
})

test('un enlace http se rechaza aquí: este enlace le pide dinero a alguien', async () => {
  pintar()
  await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'PAYMENT_LINK')
  await userEvent.type(await screen.findByLabelText(/^Dirección/), 'http://pagos.example.com')
  await userEvent.click(screen.getByRole('button', { name: 'Añadir' }))

  expect(enviar).not.toHaveBeenCalled()
  expect(await screen.findByText(/tiene que empezar por https/i)).toBeInTheDocument()
})

test('un enlace https pasa', async () => {
  pintar()
  await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'PAYMENT_LINK')
  await userEvent.type(await screen.findByLabelText(/^Dirección/), 'https://pagos.example.com')
  await userEvent.click(screen.getByRole('button', { name: 'Añadir' }))

  expect(enviar).toHaveBeenCalledWith({
    label: null,
    details: { kind: 'PAYMENT_LINK', url: 'https://pagos.example.com' },
  })
})

test('el formulario vacío no llega al API', async () => {
  // `FormDialog` va con `noValidate`: quien valida es Zod.
  pintar()
  await userEvent.click(screen.getByRole('button', { name: 'Añadir' }))
  expect(enviar).not.toHaveBeenCalled()
})

test('ningún campo es un textarea: estos textos van dentro de una plantilla de Meta', () => {
  // Meta rechaza el envío entero con saltos de línea.
  const { container } = pintar()
  expect(container.querySelectorAll('textarea')).toHaveLength(0)
})

test('avisa de que lo escrito lo va a leer quien debe', () => {
  pintar()
  expect(screen.getByText(/lo va a leer quien te debe/i)).toBeInTheDocument()
})
