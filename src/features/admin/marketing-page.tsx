import { DateRangeFields } from '@/components/date-range-fields'
import { PageHeader } from '@/components/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { defaultRange } from '@/lib/date-range'
import { useListFilters } from '@/lib/use-list-filters'
import { MarketingFunnelTab } from './marketing-funnel-tab'
import { MarketingOverviewTab } from './marketing-overview-tab'
import { MarketingSourcesTab } from './marketing-sources-tab'
import { PlatformPage } from './platform-page'

const KEYS = ['vista', 'desde', 'hasta'] as const
type Key = (typeof KEYS)[number]

type Tab = 'resumen' | 'embudo' | 'campanas'

const TABS: { value: Tab; label: string }[] = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'embudo', label: 'Embudo' },
  { value: 'campanas', label: 'Campañas' },
]

/**
 * **La consola de marketing: qué hace la gente en la portada.**
 *
 * Es la otra punta de `src/marketing/`. La portada lleva desde la fase 2 mandando señales
 * a `POST /public/signals` —qué secciones se miran, dónde se pulsa, de qué campaña vino
 * cada visita— y **no había ninguna pantalla donde leerlas**: se medía a ciegas. Los tres
 * endpoints existían en el contrato desde entonces; el handoff avisó de que eran «una
 * pantalla de `/plataforma` y va después» y el después no había llegado.
 *
 * **Tres pestañas y no tres destinos**, porque son la misma pregunta a tres escalas —
 * cuánta gente llegó, hasta dónde bajó, y de dónde venía— y sobre todo porque **comparten
 * la ventana**: los tres endpoints piden el mismo `from`/`to`. Con tres destinos, mover
 * una fecha en uno dejaría los otros dos midiendo otra cosa, y comparar dos pantallas que
 * dicen mirar el mismo período y no lo hacen es cómo se llega a una conclusión falsa.
 *
 * Por eso el rango vive **aquí arriba**, encima del selector, y no dentro de cada pestaña.
 *
 * Vive fuera de `requireTenant`: el embudo es de la plataforma, no de ninguna organización.
 */
export function MarketingPage() {
  const { values, set } = useListFilters<Key>('nummo:plataforma:marketing', KEYS)
  const tab = (TABS.find((t) => t.value === values.vista)?.value ?? 'resumen') as Tab

  const porDefecto = defaultRange()
  const from = values.desde || porDefecto.from
  const to = values.hasta || porDefecto.to

  return (
    <PlatformPage>
      <PageHeader
        title="Marketing"
        description="Qué pasa en la portada pública: cuánta gente llega, hasta dónde baja y qué campaña la trajo."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-md">
        <DateRangeFields
          idPrefix="mk"
          from={from}
          to={to}
          onChange={(r) => set({ ...(r.from && { desde: r.from }), ...(r.to && { hasta: r.to }) })}
        />
      </div>

      <SegmentedControl
        aria-label="Qué se mira"
        options={TABS}
        value={tab}
        onChange={(vista) => set({ vista })}
      />

      {tab === 'resumen' && <MarketingOverviewTab from={from} to={to} />}
      {tab === 'embudo' && <MarketingFunnelTab from={from} to={to} />}
      {tab === 'campanas' && <MarketingSourcesTab from={from} to={to} />}
    </PlatformPage>
  )
}
