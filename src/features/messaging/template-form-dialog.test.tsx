import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/*
  Las llaves se pegan, no se teclean: `userEvent.type` trata `{` como el inicio
  de una tecla especial y colapsa `{{` en `{`, así que escribir «{{nombre}}» a
  máquina produce «{nombre}}» y la prueba mediría otra cosa.
*/
async function escribir(campo: HTMLElement, texto: string) {
  await userEvent.click(campo)
  await userEvent.paste(texto)
}
import type { CreateWhatsAppTemplateInput } from '@/api/generated/model'
import { TemplateFormDialog } from './template-form-dialog'

const enviar = vi.fn<(data: CreateWhatsAppTemplateInput) => Promise<void>>()

const pintar = () =>
  render(
    <TemplateFormDialog open onOpenChange={() => {}} loading={false} onSubmit={enviar} />,
  )

beforeEach(() => {
  enviar.mockReset()
  enviar.mockResolvedValue(undefined)
})
afterEach(cleanup)

test('el formulario vacío no llega al API', async () => {
  // `FormDialog` va con `noValidate`: el `required` nativo no para nada.
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Crear y enviar/ }))

  expect(enviar).not.toHaveBeenCalled()
  expect(await screen.findByText(/Sin mensaje no hay plantilla/)).toBeInTheDocument()
})

test('una clave con mayúsculas o espacios se rechaza aquí, no en Meta', async () => {
  pintar()
  await userEvent.type(screen.getByLabelText(/Clave/), 'Cobro Vencido')
  await userEvent.type(screen.getByLabelText(/Nombre en Meta/), 'x')
  await userEvent.type(screen.getByLabelText(/^Mensaje/), 'Hola')
  await userEvent.click(screen.getByRole('button', { name: /Crear y enviar/ }))

  expect(enviar).not.toHaveBeenCalled()
  expect(await screen.findByText(/Solo minúsculas, números y guion bajo/)).toBeInTheDocument()
})

test('los campos de ejemplo aparecen con las variables que se escriben', async () => {
  pintar()
  expect(screen.queryByText('{{nombre}}')).not.toBeInTheDocument()

  await escribir(screen.getByLabelText(/^Mensaje/), 'Hola {{nombre}}, debes {{monto}}')

  expect(await screen.findByText('{{nombre}}')).toBeInTheDocument()
  expect(screen.getByText('{{monto}}')).toBeInTheDocument()
})

test('se manda un ejemplo por variable, y los opcionales vacíos no viajan', async () => {
  pintar()
  await userEvent.type(screen.getByLabelText(/Clave/), 'cobro_recordatorio')
  await userEvent.type(screen.getByLabelText(/Nombre en Meta/), 'Recordatorio')
  await escribir(screen.getByLabelText(/^Mensaje/), 'Hola {{nombre}}')
  await userEvent.type(await screen.findByLabelText('{{nombre}}'), 'Ana Ruiz')
  await userEvent.click(screen.getByRole('button', { name: /Crear y enviar/ }))

  expect(enviar).toHaveBeenCalledWith({
    templateKey: 'cobro_recordatorio',
    name: 'Recordatorio',
    language: 'es',
    metaCategory: 'UTILITY',
    spec: {
      body: 'Hola {{nombre}}',
      bodyExamples: { nombre: 'Ana Ruiz' },
      header: undefined,
      headerExamples: undefined,
      footer: undefined,
    },
  })
})

test('la cobranza es de servicio: la categoría arranca en UTILITY', () => {
  pintar()
  expect(screen.getByLabelText(/Categoría/)).toHaveValue('UTILITY')
})

test('avisa de que no se puede pedir que respondan', () => {
  // No hay bandeja de entrada; un «responde STOP» además sería el opt-out que
  // Nummo no ofrece a propósito.
  pintar()
  expect(screen.getByText(/No pidas que respondan/)).toBeInTheDocument()
})
