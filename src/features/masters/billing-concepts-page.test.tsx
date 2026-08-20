import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { CAPABILITIES, json, tenantApiResponse } from '@/test/tenant-api'
import { BillingConceptsPage } from './billing-concepts-page'

/*
  Se prueba la cara de conceptos de cobro y no las dos: categorías de gasto es su
  espejo y comparte las tres piezas nuevas —`IdentityField`, `CatalogOrderDrawer`
  y la tabla de `catalogs.ts`—. Lo que cambia entre ellas son las palabras y el
  endpoint, y eso no es lo que puede romperse (§94.0).
*/

const estado = vi.hoisted(() => ({
  permisos: [] as string[],
  items: [] as Record<string, unknown>[],
  llamadas: [] as { method: string; url: string; body: unknown }[],
}))

function concepto(over: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    code: null,
    name: 'Mensualidad',
    description: null,
    defaultAmount: '350000.00',
    icon: null,
    color: null,
    position: 0,
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    ...over,
  }
}

function stubApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      const method = (init?.method ?? 'GET').toUpperCase()
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      estado.llamadas.push({ method, url: u, body })

      if (u.includes('/billing-concepts')) {
        if (method !== 'GET') return json(concepto(body as Record<string, unknown>), 201)
        return json({
          data: estado.items,
          page: 1,
          pageSize: Number(new URL(u, 'http://x').searchParams.get('pageSize') ?? 10),
          total: estado.items.length,
          totalPages: 1,
        })
      }
      if (u.includes('/me/capabilities')) {
        return json({ ...CAPABILITIES, permissions: estado.permisos })
      }
      return tenantApiResponse(u) ?? json({})
    }),
  )
}

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/maestros/conceptos']}>
        <BillingConceptsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const conceptos = () => estado.llamadas.filter((c) => c.url.includes('/billing-concepts'))
/*
  `DataList` monta a la vez la tabla de escritorio y las tarjetas de móvil —las
  separa el breakpoint, no el DOM—, así que cada fila aparece dos veces. Se
  espera a que estén, sin elegir cuál.
*/
const esperarFilas = (texto: string) => screen.findAllByText(texto)
/**
 * La tarjeta de móvil de una fila: es un botón, y su nombre accesible empieza
 * por el título. La tabla de escritorio no tiene rol de botón, así que esto
 * elige la presentación apilada sin ambigüedad.
 */
const tarjeta = (texto: string | RegExp) => screen.findByRole('button', { name: texto })

/**
 * Abre el selector de icono y color, que es **otro diálogo** encima del
 * formulario: la rejilla entera dentro dejaba «Guardar» fuera de la pantalla en
 * un teléfono (§11.1.12).
 */
async function abrirSelector(user: ReturnType<typeof userEvent.setup>, dialogo: HTMLElement) {
  await user.click(within(dialogo).getByRole('button', { name: /^Icono y color/ }))
  return screen.findByRole('dialog', { name: 'Icono y color' })
}
const escrituras = () => conceptos().filter((c) => c.method !== 'GET')

beforeEach(() => {
  estado.permisos = ['billing_concepts.manage']
  estado.items = [concepto()]
  estado.llamadas = []
  sessionStorage.clear()
  stubApi()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('la lista pide el orden que eligió la organización', async () => {
  // El contrato cambió su orden por defecto de `name` a `position`, y §18.1 pide
  // que la pantalla ordene por lo que el endpoint acepta.
  montar()

  await esperarFilas('Mensualidad')
  expect(conceptos()[0].url).toContain('sort=position')
})

test('el icono y el color elegidos viajan en el alta', async () => {
  const user = userEvent.setup()
  montar()
  await esperarFilas('Mensualidad')

  await user.click(screen.getByRole('button', { name: 'Nuevo concepto' }))
  const dialogo = await screen.findByRole('dialog')
  await user.type(within(dialogo).getByLabelText(/Nombre/), 'Internet')

  const selector = await abrirSelector(user, dialogo)
  // Por su nombre en español: la clave del contrato es `wifi`, y nadie busca eso.
  await user.click(within(selector).getByRole('button', { name: 'Internet' }))
  await user.click(within(selector).getByRole('button', { name: 'Azul' }))
  await user.click(within(selector).getByRole('button', { name: 'Listo' }))

  await user.click(await screen.findByRole('button', { name: 'Crear' }))

  await waitFor(() => expect(escrituras()).toHaveLength(1))
  expect(escrituras()[0].body).toMatchObject({ name: 'Internet', icon: 'wifi', color: 'blue' })
})

test('«sin icono» es una opción, no el hueco de no elegir', async () => {
  // Las organizaciones que ya existían tienen los dos en `null`, así que hay que
  // poder volver ahí desde la edición.
  estado.items = [concepto({ icon: 'wifi', color: 'blue' })]
  const user = userEvent.setup()
  montar()

  await user.click(await tarjeta(/Mensualidad/))
  const dialogo = await screen.findByRole('dialog')
  // Lo guardado se lee sin abrir el selector, que es de lo que sirve la fila.
  expect(
    within(dialogo).getByRole('button', { name: 'Icono y color: Internet, Azul' }),
  ).toBeVisible()

  const selector = await abrirSelector(user, dialogo)
  await user.click(within(selector).getByRole('button', { name: 'Sin icono' }))
  await user.click(within(selector).getByRole('button', { name: 'Sin color' }))
  await user.click(within(selector).getByRole('button', { name: 'Listo' }))

  await user.click(await screen.findByRole('button', { name: 'Guardar' }))

  await waitFor(() => expect(escrituras()).toHaveLength(1))
  expect(escrituras()[0].body).toMatchObject({ icon: null, color: null })
})

test('ordenar guarda solo lo que se movió', async () => {
  estado.items = [
    concepto({ id: 'c1', name: 'Matrícula', position: 0 }),
    concepto({ id: 'c2', name: 'Mensualidad', position: 1 }),
    concepto({ id: 'c3', name: 'Uniforme', position: 2 }),
  ]
  const user = userEvent.setup()
  montar()

  await user.click(await screen.findByRole('button', { name: 'Ordenar' }))
  const cajon = await screen.findByRole('dialog')
  // Se piden todos: reordenar de a diez páginas no es reordenar.
  expect(conceptos().some((c) => c.url.includes('pageSize=100'))).toBe(true)

  await user.click(within(cajon).getByRole('button', { name: 'Subir Uniforme' }))
  await user.click(within(cajon).getByRole('button', { name: 'Guardar orden' }))

  await waitFor(() => expect(escrituras()).toHaveLength(2))
  // Matrícula no se movió: mandar los tres serían escrituras que no cambian nada.
  expect(escrituras().map((c) => [c.url.split('/').pop(), c.body])).toEqual([
    ['c3', { position: 1 }],
    ['c2', { position: 2 }],
  ])
})

test('sin nada movido no hay nada que guardar', async () => {
  estado.items = [
    concepto({ id: 'c1', name: 'Matrícula', position: 0 }),
    concepto({ id: 'c2', name: 'Mensualidad', position: 1 }),
  ]
  const user = userEvent.setup()
  montar()

  await user.click(await screen.findByRole('button', { name: 'Ordenar' }))
  const cajon = await screen.findByRole('dialog')

  expect(within(cajon).getByRole('button', { name: 'Guardar orden' })).toBeDisabled()
  // Los extremos no tienen a dónde ir.
  expect(within(cajon).getByRole('button', { name: 'Subir Matrícula' })).toBeDisabled()
  expect(within(cajon).getByRole('button', { name: 'Bajar Mensualidad' })).toBeDisabled()
})

test('sin permiso no se ofrece ni crear ni ordenar', async () => {
  estado.permisos = []
  montar()

  await esperarFilas('Mensualidad')
  expect(screen.queryByRole('button', { name: 'Ordenar' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Nuevo concepto' })).not.toBeInTheDocument()
})

test('la fila entera edita, que es la única manera de hacerlo en móvil', async () => {
  /*
    El lápiz vivía en una columna `hideOnStack`, así que por debajo de `lg` no
    había con qué abrir la edición: la tarjeta se pulsaba y no pasaba nada.
  */
  const user = userEvent.setup()
  montar()
  await esperarFilas('Mensualidad')

  await user.click(await tarjeta(/Mensualidad/))

  const dialogo = await screen.findByRole('dialog')
  expect(within(dialogo).getByLabelText(/Nombre/)).toHaveValue('Mensualidad')
})

test('sin permiso la fila no abre nada', async () => {
  estado.permisos = []
  montar()

  await esperarFilas('Mensualidad')
  expect(screen.queryByRole('button', { name: /Mensualidad/ })).not.toBeInTheDocument()
})

test('el buscador encuentra el icono por lo que es y por el gasto que nombra', async () => {
  /*
    Las claves del contrato son inglesas (`home`, `piggy-bank`), así que buscar
    en ellas no serviría de nada. Se busca por el nombre en español y por las
    palabras del negocio: quien está creando «Arriendo» escribe eso, no «casa».
  */
  const user = userEvent.setup()
  montar()

  await user.click(await screen.findByRole('button', { name: 'Nuevo concepto' }))
  const selector = await abrirSelector(user, await screen.findByRole('dialog'))

  await user.type(within(selector).getByLabelText('Buscar icono'), 'arriendo')

  expect(within(selector).getByRole('button', { name: 'Casa' })).toBeVisible()
  expect(within(selector).queryByRole('button', { name: 'Internet' })).not.toBeInTheDocument()
  // Y con lo que no existe se dice, en vez de dejar la rejilla vacía.
  await user.clear(within(selector).getByLabelText('Buscar icono'))
  await user.type(within(selector).getByLabelText('Buscar icono'), 'unicornio')
  expect(within(selector).getByText(/Ningún icono se llama así/)).toBeVisible()
})
