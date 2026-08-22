import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { MarketingFunnel, MarketingOverview, MarketingSources } from '@/api/generated/model'

const m = vi.hoisted(() => ({
  overview: null as MarketingOverview | null,
  funnel: null as MarketingFunnel | null,
  sources: null as MarketingSources | null,
  /** Con qué ventana se pidió cada cosa. Es lo que prueba que las tres comparten rango. */
  rangos: [] as { from: string; to: string }[],
}))

vi.mock('./hooks', () => ({
  useMarketingOverview: (p: { from: string; to: string }) => {
    m.rangos.push(p)
    return { overview: m.overview, isPending: false, isError: false, error: null }
  },
  useMarketingFunnel: (p: { from: string; to: string }) => {
    m.rangos.push(p)
    return { funnel: m.funnel, isPending: false, isError: false, error: null }
  },
  useMarketingSources: (p: { from: string; to: string }) => {
    m.rangos.push(p)
    return { sources: m.sources, isPending: false, isError: false, error: null }
  },
}))

/* El shell de plataforma arrastra sesión y permisos; aquí se mira la pantalla. */
vi.mock('./platform-page', () => ({
  PlatformPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const { MarketingPage } = await import('./marketing-page')

beforeEach(() => {
  /*
    `useListFilters` recuerda la pestaña y el rango en `sessionStorage`, que en Vitest vive
    entre tests del mismo fichero: sin esto, el que cambia de pestaña deja a los siguientes
    entrando por «Campañas» y fallando por algo que no es lo que prueban.
  */
  sessionStorage.clear()
  m.rangos = []
  m.overview = {
    from: '2026-07-24',
    to: '2026-08-22',
    visitors: 1240,
    signups: 62,
    conversionRate: 0.05,
    devices: { mobile: 900, tablet: 40, desktop: 300 },
    daily: [{ day: '2026-08-22', visitors: 100, sessions: 120, signups: 5 }],
  }
  m.funnel = {
    from: '2026-07-24',
    to: '2026-08-22',
    sections: [
      { section: 'hero', reach: 1240, share: 1 },
      { section: 'automation', reach: 400, share: 0.32 },
      { section: 'integrations', reach: 0, share: 0 },
      { section: 'pricing', reach: 210, share: 0.17 },
    ],
    ctaClicks: 180,
    signups: 62,
  }
  m.sources = {
    from: '2026-07-24',
    to: '2026-08-22',
    campaigns: [
      { source: 'instagram', campaign: 'lanzamiento', visitors: 600, signups: 30, withOrganization: 12, paying: 4 },
      { source: 'direct', campaign: '', visitors: 300, signups: 10, withOrganization: 3, paying: 1 },
    ],
  }
})
afterEach(cleanup)

const pintar = () =>
  render(
    <MemoryRouter>
      <MarketingPage />
    </MemoryRouter>,
  )

/*
  La razón de que las tres sean pestañas y no destinos: comparten la ventana. Con tres
  destinos, mover una fecha en uno dejaría los otros dos midiendo otra cosa, y comparar dos
  pantallas que dicen mirar el mismo período y no lo hacen es cómo se llega a una conclusión
  falsa sin que nada falle.
*/
test('las tres pestañas miran la misma ventana', async () => {
  pintar()
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-08-01' } })

  m.rangos = []
  await userEvent.click(screen.getByRole('tab', { name: 'Embudo' }))
  await userEvent.click(screen.getByRole('tab', { name: 'Campañas' }))

  expect(m.rangos.length).toBeGreaterThan(0)
  for (const r of m.rangos) expect(r.from).toBe('2026-08-01')
})

test('el resumen enseña visitantes, registros y conversión', () => {
  pintar()
  expect(screen.getByText('1.240')).toBeInTheDocument()
  expect(screen.getByText('62')).toBeInTheDocument()
  // La conversión llega calculada por el backend; no se recalcula aquí.
  expect(screen.getByText('5.0%')).toBeInTheDocument()
})

/*
  El embudo se lee por el desplome de una sección a la siguiente, así que el orden es el del
  API. Reordenar por alcance lo convertiría en un ranking, que responde otra pregunta.
*/
test('el embudo respeta el orden del API, no el alcance', async () => {
  pintar()
  await userEvent.click(screen.getByRole('tab', { name: 'Embudo' }))

  const items = screen.getAllByRole('listitem').map((li) => li.textContent ?? '')
  const posicion = (txt: string) => items.findIndex((t) => t.includes(txt))
  expect(posicion('Hero')).toBeLessThan(posicion('Cobranza por WhatsApp'))
  expect(posicion('Cobranza por WhatsApp')).toBeLessThan(posicion('Precios'))
})

/*
  `integrations` está en el catálogo del backend y no en la portada: siempre valdrá cero.
  Un cero sin explicación se lee como «esto no lo mira nadie» en vez de «esto no existe».
*/
test('una sección que no está en la portada se marca, no se deja en cero a secas', async () => {
  pintar()
  await userEvent.click(screen.getByRole('tab', { name: 'Embudo' }))

  const fila = screen.getAllByRole('listitem').find((li) => li.textContent?.includes('Integraciones'))
  expect(fila).toBeDefined()
  expect(within(fila!).getByText(/no está en la página/)).toBeInTheDocument()
  expect(screen.getByText(/no existen en la portada/i)).toBeInTheDocument()
})

test('las campañas llegan hasta quién paga', async () => {
  pintar()
  await userEvent.click(screen.getByRole('tab', { name: 'Campañas' }))

  const fila = screen.getAllByRole('row').find((r) => r.textContent?.includes('lanzamiento'))
  expect(fila).toBeDefined()
  expect(within(fila!).getByText('4')).toBeInTheDocument()
})

/* Tráfico con `utm_source` y sin `utm_campaign` es la mitad de lo que llega: se dice. */
test('una campaña sin nombre se dice, no se deja en blanco', async () => {
  pintar()
  await userEvent.click(screen.getByRole('tab', { name: 'Campañas' }))
  expect(screen.getByText('Sin campaña')).toBeInTheDocument()
})
