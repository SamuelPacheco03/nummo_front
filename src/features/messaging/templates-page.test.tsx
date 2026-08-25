import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { WhatsAppTemplate, WhatsAppTemplateCategory } from '@/api/generated/model'

const m = vi.hoisted(() => ({
  plantillas: [] as WhatsAppTemplate[],
  categorias: [] as WhatsAppTemplateCategory[],
  clasificar: vi.fn(),
  crearCategoria: vi.fn(),
  editarCategoria: vi.fn(),
  archivarCategoria: vi.fn(),
  avisos: [] as { texto: string; extra?: string }[],
  permisos: new Set<string>(),
  conectado: true,
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
  useFeature: () => true,
}))
vi.mock('./hooks', () => ({
  useWhatsAppTemplates: () => ({
    templates: m.plantillas,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useWhatsAppTemplateCategories: () => ({
    categories: m.categorias,
    isPending: false,
    isError: false,
    error: null,
  }),
  useWhatsAppAccount: () => ({
    connected: m.conectado,
    account: null,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSyncWhatsAppTemplates: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateWhatsAppTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteWhatsAppTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSetWhatsAppTemplateCategory: () => ({ mutateAsync: m.clasificar, isPending: false }),
  useCreateWhatsAppTemplateCategory: () => ({ mutateAsync: m.crearCategoria, isPending: false }),
  useUpdateWhatsAppTemplateCategory: () => ({ mutateAsync: m.editarCategoria, isPending: false }),
  useArchiveWhatsAppTemplateCategory: () => ({
    mutateAsync: m.archivarCategoria,
    isPending: false,
  }),
}))

const { WhatsAppTemplatesPage } = await import('./templates-page')

function plantilla(over: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate {
  return {
    id: 't1',
    organizationId: null,
    templateKey: 'cobro_vencido',
    name: 'Cobro vencido',
    displayName: null,
    purpose: null,
    language: 'es',
    metaCategory: 'UTILITY',
    categoryId: null,
    status: 'APPROVED',
    canSend: true,
    parameterNames: [],
    rejectedReason: null,
    lastSyncedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    ...over,
  }
}

function categoria(over: Partial<WhatsAppTemplateCategory> = {}): WhatsAppTemplateCategory {
  return {
    id: 'c1',
    scope: 'PLATFORM',
    editable: false,
    key: 'cobranza',
    name: 'Cobranza',
    description: null,
    position: 0,
    isActive: true,
    templateCount: 1,
    createdAt: '2026-08-01T10:00:00Z',
    ...over,
  }
}

const pintar = () =>
  render(
    <MemoryRouter>
      <WhatsAppTemplatesPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  m.plantillas = [
    plantilla({ id: 't1', categoryId: 'c1' }),
    plantilla({
      id: 't2',
      organizationId: 'o1',
      templateKey: 'cita_recordatorio',
      name: 'Recordatorio de cita',
      categoryId: 'c2',
    }),
    plantilla({
      id: 't3',
      organizationId: 'o1',
      templateKey: 'suelta',
      name: 'Sin categoría',
      categoryId: null,
    }),
  ]
  m.categorias = [
    categoria(),
    categoria({
      id: 'c2',
      scope: 'ORGANIZATION',
      editable: true,
      key: 'citas',
      name: 'Citas',
      templateCount: 1,
    }),
  ]
  m.clasificar = vi.fn().mockResolvedValue({})
  m.crearCategoria = vi.fn().mockResolvedValue({})
  m.editarCategoria = vi.fn().mockResolvedValue({})
  m.archivarCategoria = vi.fn().mockResolvedValue({})
  m.avisos = []
  m.permisos = new Set(['whatsapp.templates.read', 'whatsapp.templates.manage'])
  m.conectado = true
})

afterEach(cleanup)

test('cada plantilla dice de qué categoría cuelga, y la que no tiene no dice nada', () => {
  pintar()
  // La clave se recorta y va en su propio elemento; el idioma y la categoría no.
  expect(screen.getByText('cobro_vencido')).toBeInTheDocument()
  expect(screen.getByText('· es · Cobranza')).toBeInTheDocument()
  expect(screen.getByText('· es · Citas')).toBeInTheDocument()
  expect(screen.getByText('· es')).toBeInTheDocument()
})

test('las fichas reparten por categoría y filtran la lista', async () => {
  pintar()
  // El reparto se ve sin filtrar nada: tres en total, una por categoría.
  expect(screen.getByRole('radio', { name: /Todas 3/ })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: /Sin clasificar 1/ })).toBeInTheDocument()

  await userEvent.click(screen.getByRole('radio', { name: /Citas 1/ }))
  expect(screen.getByText('Recordatorio de cita')).toBeInTheDocument()
  expect(screen.queryByText('Cobro vencido')).not.toBeInTheDocument()
})

test('con una sola categoría no hay fichas que repartir', () => {
  m.categorias = [categoria()]
  m.plantillas = [plantilla({ categoryId: 'c1' })]
  pintar()
  expect(screen.queryByRole('radio', { name: /Todas/ })).not.toBeInTheDocument()
})

test('clasificar manda la categoría elegida, y solo se ofrece en las propias', async () => {
  pintar()
  // La de la plataforma no se clasifica: la fila la comparten todas las empresas.
  expect(screen.queryByRole('button', { name: 'Clasificar Cobro vencido' })).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Clasificar Sin categoría' }))
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Categoría' }), 'c2')
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

  expect(m.clasificar).toHaveBeenCalledWith({
    orgId: 'o1',
    templateKey: 'suelta',
    data: { categoryId: 'c2' },
  })
})

test('«sin clasificar» es una opción de verdad y viaja como null', async () => {
  pintar()
  await userEvent.click(screen.getByRole('button', { name: 'Clasificar Recordatorio de cita' }))
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Categoría' }), '')
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

  expect(m.clasificar).toHaveBeenCalledWith({
    orgId: 'o1',
    templateKey: 'cita_recordatorio',
    data: { categoryId: null },
  })
})

test('la categoría de Nummo se usa pero no se edita', async () => {
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Categorías/ }))
  const cajon = screen.getByRole('dialog')

  expect(within(cajon).queryByRole('button', { name: 'Editar Cobranza' })).not.toBeInTheDocument()
  expect(within(cajon).getByRole('button', { name: 'Editar Citas' })).toBeInTheDocument()
})

test('una categoría con plantillas dentro no se archiva, y se dice cuántas tiene', async () => {
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Categorías/ }))
  const cajon = screen.getByRole('dialog')

  expect(
    within(cajon).getByRole('button', { name: 'No se puede archivar Citas: tiene 1 plantilla' }),
  ).toBeDisabled()

  m.categorias = [categoria(), categoria({ ...vacia() })]
  cleanup()
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Categorías/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Archivar Citas' }))
  expect(m.archivarCategoria).toHaveBeenCalledWith({ orgId: 'o1', categoryId: 'c2' })
})

function vacia(): Partial<WhatsAppTemplateCategory> {
  return {
    id: 'c2',
    scope: 'ORGANIZATION',
    editable: true,
    key: 'citas',
    name: 'Citas',
    templateCount: 0,
  }
}

test('una categoría archivada se puede reactivar desde el cajón', async () => {
  m.categorias = [categoria({ ...vacia(), isActive: false })]
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Categorías/ }))
  await userEvent.click(screen.getByRole('button', { name: /Reactivar/ }))

  expect(m.editarCategoria).toHaveBeenCalledWith({
    orgId: 'o1',
    categoryId: 'c2',
    data: { isActive: true },
  })
})

test('sin permiso de gestión el cajón se lee pero no se escribe', async () => {
  m.permisos = new Set(['whatsapp.templates.read'])
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Categorías/ }))
  const cajon = screen.getByRole('dialog')

  expect(within(cajon).getByText('Citas')).toBeInTheDocument()
  expect(within(cajon).queryByRole('button', { name: /Nueva categoría/ })).not.toBeInTheDocument()
  expect(within(cajon).queryByRole('button', { name: 'Editar Citas' })).not.toBeInTheDocument()
})

test('crear una categoría manda el nombre y la descripción', async () => {
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Categorías/ }))
  await userEvent.click(screen.getByRole('button', { name: /Nueva categoría/ }))
  await userEvent.type(screen.getByLabelText(/Nombre/), 'Postventa')
  await userEvent.type(screen.getByLabelText(/Descripción/), 'Después de la venta')
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

  expect(m.crearCategoria).toHaveBeenCalledWith({
    orgId: 'o1',
    data: { name: 'Postventa', description: 'Después de la venta' },
  })
})

test('sin nombre no se manda nada: lo dice el formulario, no el 422', async () => {
  pintar()
  await userEvent.click(screen.getByRole('button', { name: /Categorías/ }))
  await userEvent.click(screen.getByRole('button', { name: /Nueva categoría/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

  expect(m.crearCategoria).not.toHaveBeenCalled()
  expect(screen.getByText(/Ponle un nombre/)).toBeInTheDocument()
})
