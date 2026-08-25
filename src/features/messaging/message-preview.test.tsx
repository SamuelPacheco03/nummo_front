import { afterEach, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { WhatsAppTemplate } from '@/api/generated/model'
import { MessagePreview } from './message-preview'

afterEach(cleanup)

function plantilla(over: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate {
  return {
    id: 't1',
    organizationId: null,
    templateKey: 'cobro_vencido',
    name: 'Cobro vencido',
    displayName: 'Vencida',
    purpose: 'El aviso de mora de una sola cuenta.',
    language: 'es',
    category: 'UTILITY',
    status: 'APPROVED',
    canSend: true,
    parameterNames: ['nombre', 'monto', 'como_pagar'],
    rejectedReason: null,
    lastSyncedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    ...over,
  }
}

const pintar = (props: Partial<Parameters<typeof MessagePreview>[0]> = {}) =>
  render(
    <MessagePreview
      template={plantilla()}
      paymentLines={['Bancolombia ahorros 123-456789-00 a nombre de Semillas']}
      paymentLink=""
      contact={{ phone: '310 594 8908', email: null }}
      when="Sale 3 días antes del vencimiento, a las 12:00."
      tabs={[{ label: 'Por vencer · una', active: true, onSelect: () => {} }]}
      {...props}
    />,
  )

test('NO se inventa el texto del mensaje: el contrato no lo publica', () => {
  /*
    De una plantilla llegan `purpose` y `parameterNames`, nunca su cuerpo — el
    texto lo aprueba Meta y no viaja. Fabricar aquí un «Hola, Ana María…» sería
    peor que no enseñar nada: el usuario confiaría en una vista previa que no es
    lo que sale.
  */
  pintar()

  expect(screen.getByText(/El aviso de mora de una sola cuenta/)).toBeInTheDocument()
  expect(screen.getByText(/lo pone la plantilla/)).toBeInTheDocument()
  // Lo que sí se dice es QUÉ lleva, que es lo único que el contrato sabe.
  expect(screen.getByText(/Lleva su nombre y el monto/)).toBeInTheDocument()
})

test('el renglón de pago es el que compone el servidor, no uno armado aquí', () => {
  // Armarlo por nuestra cuenta garantizaría que la vista previa y el mensaje real
  // acaben diciendo cosas distintas de la misma cuenta.
  pintar()
  expect(
    screen.getByText(/Bancolombia ahorros 123-456789-00 a nombre de Semillas/),
  ).toBeInTheDocument()
})

test('sin cuentas publicadas se ve lo que de verdad le llega al deudor', () => {
  /*
    Es el degradado silencioso que nadie veía venir: el mensaje no se queda en
    blanco —una variable vacía haría que Meta rechazara el envío entero— pero
    manda al deudor a llamar para preguntar a dónde pagar.
  */
  pintar({ paymentLines: [] })
  expect(screen.getByText(/comunícate con nosotros/)).toBeInTheDocument()
})

test('el enlace se enseña sin el https, que en un mensaje es ruido', () => {
  pintar({ paymentLink: 'https://pagos.miempresa.co' })
  expect(screen.getByText(/pagos\.miempresa\.co/)).toBeInTheDocument()
})

test('sin contacto de la empresa no se promete a dónde escribir', () => {
  // La frase se corta en vez de quedar «escríbenos al », que se lee como un fallo.
  pintar({ contact: { phone: null, email: null } })
  expect(screen.queryByText(/escríbenos al/)).toBeNull()
  expect(screen.getByText(/Si ya pagaste, ignora este mensaje/)).toBeInTheDocument()
})

test('sin plantilla se dice que ese aviso no sale, en vez de pintar una burbuja vacía', () => {
  pintar({ template: undefined })
  expect(screen.getByText(/Sin plantilla, este aviso no sale/)).toBeInTheDocument()
})

test('dice cuándo sale, que es la otra mitad de la pregunta', () => {
  // Dos veces en el DOM: la cabecera plegable del teléfono y la fija de escritorio.
  // Las separa el ancho del contenedor, no el DOM.
  pintar()
  expect(screen.getAllByText('Sale 3 días antes del vencimiento, a las 12:00.')).toHaveLength(2)
})
