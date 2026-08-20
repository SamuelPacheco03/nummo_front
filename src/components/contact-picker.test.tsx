import { useState } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { json, ORG_ID, tenantApiResponse } from '@/test/tenant-api'
import { ContactPicker } from './contact-picker'

/*
  Lo que se prueba aquí es la puerta nueva: nombrar a alguien que todavía no
  está en la agenda. El contrato acepta `payerContactId` **o** `payerName`, uno
  de los dos, así que lo que no puede pasar es que el selector deje los dos
  puestos a la vez.
*/

const estado = vi.hoisted(() => ({ contactos: [] as Record<string, unknown>[] }))

function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url)
      if (u.includes('/contacts')) {
        // Filtra como el servidor: sin esto, buscar «Netflix» seguiría
        // devolviendo a Laura y el vacío no se podría probar.
        const q = (new URL(u, 'http://x').searchParams.get('q') ?? '').toLowerCase()
        const data = estado.contactos.filter((c) =>
          String(c.displayName).toLowerCase().includes(q),
        )
        return json({
          data,
          page: 1,
          pageSize: 8,
          total: data.length,
          totalPages: 1,
        })
      }
      return tenantApiResponse(u) ?? json({})
    }),
  )
}

/** El selector con los dos campos que tiene el formulario de verdad. */
function Anfitrion({ conCrear = true }: { conCrear?: boolean }) {
  const [id, setId] = useState<string | null>(null)
  const [name, setName] = useState('')
  return (
    <>
      <ContactPicker
        label="Pagador"
        orgId={ORG_ID}
        value={id}
        onChange={(next) => {
          setId(next)
          setName('')
        }}
        newName={name || null}
        onNewName={conCrear ? setName : undefined}
      />
      <p data-testid="salida">{JSON.stringify({ id, name })}</p>
    </>
  )
}

function montar(props?: { conCrear?: boolean }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <Anfitrion {...props} />
    </QueryClientProvider>,
  )
}

const salida = () => JSON.parse(screen.getByTestId('salida').textContent ?? '{}')

beforeEach(() => {
  estado.contactos = [
    { id: 'k1', displayName: 'Laura Gómez', contactType: 'PERSON', isActive: true },
  ]
  stubApi()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('lo que ya existe va primero, y crear al final', async () => {
  const user = userEvent.setup()
  montar()

  await user.click(screen.getByRole('combobox', { name: 'Pagador' }))
  await user.type(screen.getByPlaceholderText('Buscar contacto…'), 'Laura')

  const opciones = await screen.findAllByRole('button')
  const textos = opciones.map((b) => b.textContent ?? '')
  // La primera respuesta a un nombre es el contacto que ya está en la agenda.
  expect(textos.findIndex((t) => t.includes('Laura Gómez'))).toBeLessThan(
    textos.findIndex((t) => t.includes('Crear')),
  )
})

test('crear por nombre deja el nombre y ningún id', async () => {
  const user = userEvent.setup()
  montar()

  await user.click(screen.getByRole('combobox', { name: 'Pagador' }))
  await user.type(screen.getByPlaceholderText('Buscar contacto…'), 'Netflix')
  await user.click(await screen.findByRole('button', { name: /Crear «Netflix»/ }))

  expect(salida()).toEqual({ id: null, name: 'Netflix' })
  // Al cerrarse, el botón dice que ese nombre todavía no existe.
  expect(screen.getByRole('combobox', { name: 'Pagador' })).toHaveTextContent('Netflix')
  expect(screen.getByRole('combobox', { name: 'Pagador' })).toHaveTextContent('nuevo')
})

test('elegir un contacto de verdad borra el nombre escrito', async () => {
  // Los dos a la vez son un 422: el selector no puede dejarlos puestos.
  const user = userEvent.setup()
  montar()

  await user.click(screen.getByRole('combobox', { name: 'Pagador' }))
  await user.type(screen.getByPlaceholderText('Buscar contacto…'), 'Netflix')
  await user.click(await screen.findByRole('button', { name: /Crear «Netflix»/ }))

  await user.click(screen.getByRole('combobox', { name: 'Pagador' }))
  await user.click(await screen.findByRole('button', { name: /Laura Gómez/ }))

  expect(salida()).toEqual({ id: 'k1', name: '' })
})

test('un nombre que ya existe no se ofrece dos veces', async () => {
  estado.contactos = [
    { id: 'k2', displayName: 'Netflix', contactType: 'COMPANY', isActive: true },
  ]
  const user = userEvent.setup()
  montar()

  await user.click(screen.getByRole('combobox', { name: 'Pagador' }))
  await user.type(screen.getByPlaceholderText('Buscar contacto…'), 'netflix')

  expect(await screen.findByRole('button', { name: /Netflix/ })).toBeVisible()
  expect(screen.queryByRole('button', { name: /Crear «netflix»/ })).not.toBeInTheDocument()
})

test('sin la puerta abierta el selector es el de siempre', async () => {
  // Al editar no se ofrece: el `PATCH` no acepta el nombre y sería un camino
  // que termina en error.
  const user = userEvent.setup()
  montar({ conCrear: false })

  await user.click(screen.getByRole('combobox', { name: 'Pagador' }))
  await user.type(screen.getByPlaceholderText('Buscar contacto…'), 'Netflix')

  expect(await screen.findByText('Sin resultados.')).toBeVisible()
  expect(screen.queryByRole('button', { name: /Crear/ })).not.toBeInTheDocument()
})
