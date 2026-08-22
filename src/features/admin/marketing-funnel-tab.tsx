import { Panel } from '@/components/panel'
import { ErrorState } from '@/components/ui/error-state'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import type { MarketingSectionReach } from '@/api/generated/model'
import { useMarketingFunnel } from './hooks'

const ENTEROS = new Intl.NumberFormat('es-CO')

/**
 * Cómo se llama cada sección **en la portada**, no en el enum.
 *
 * El catálogo del backend se cerró antes de que la página existiera, así que los nombres
 * no coinciden con lo que hoy se lee en pantalla: `product_demo` es la sección del gráfico
 * y `automation` es la de cobranza por WhatsApp. Traducir aquí es lo honesto — renombrar
 * el enum sería tocar el contrato por una etiqueta.
 */
const NOMBRES: Record<string, string> = {
  hero: 'Hero',
  automation: 'Cobranza por WhatsApp',
  product_demo: 'El gráfico («¿Cómo vas este mes?»)',
  numi: 'Numi',
  use_cases: 'Para quién es',
  integrations: 'Integraciones',
  pricing: 'Precios',
  final_cta: 'Cierre',
}

/**
 * Secciones que el catálogo tiene y **la portada no**.
 *
 * `integrations` nunca se maquetó: siempre valdrá cero, y un cero sin explicación se lee
 * como «esta sección no la mira nadie» en vez de como «esta sección no existe». Está
 * pedido al backend en `nummo_api#2`; mientras tanto, la pantalla lo dice.
 */
const INEXISTENTES = new Set(['integrations'])

/**
 * **Hasta dónde baja la gente antes de irse.**
 *
 * Es el termómetro directo del texto de la portada: cada `reach` sale de un
 * `section_viewed` que dispara `useSectionViewed` cuando la sección entra en pantalla
 * (§97.7). Si una sección se reescribe y su alcance no se mueve, el problema no era el
 * texto sino que nadie llega hasta ahí.
 *
 * **El orden es el del API y no se reordena por alcance.** Un embudo ordenado de mayor a
 * menor deja de ser un embudo: lo que se lee aquí es el desplome entre una sección y la
 * siguiente, y eso solo se ve en el orden en que están en la página.
 */
export function MarketingFunnelTab({ from, to }: { from: string; to: string }) {
  const { funnel, isPending, isError, error } = useMarketingFunnel({ from, to })

  if (isError) return <ErrorState error={error} fallback="No se pudo cargar el embudo." />
  if (isPending || !funnel) return <Skeleton className="h-80 w-full" />

  const fantasmas = funnel.sections.filter((s) => INEXISTENTES.has(s.section))

  return (
    <div className="space-y-4">
      <Panel title="Alcance por sección">
        <ul className="space-y-4">
          {funnel.sections.map((s) => (
            <Seccion key={s.section} seccion={s} />
          ))}
        </ul>
      </Panel>

      <Panel title="Y al final">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">Clics en una llamada a la acción</dt>
            <dd className="font-display nums mt-1 text-2xl font-semibold tracking-tight">
              {ENTEROS.format(funnel.ctaClicks)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Registros</dt>
            <dd className="font-display nums mt-1 text-2xl font-semibold tracking-tight">
              {ENTEROS.format(funnel.signups)}
            </dd>
          </div>
        </dl>
      </Panel>

      {fantasmas.length > 0 && (
        <Note tone="info" title="Hay secciones aquí que no existen en la portada">
          {fantasmas.map((s) => NOMBRES[s.section] ?? s.section).join(', ')} vienen del catálogo
          del backend, que se cerró antes de maquetar la página. Su cero no significa que nadie
          las mire: significa que no están. Pedido en `nummo_api#2`.
        </Note>
      )}
    </div>
  )
}

function Seccion({ seccion }: { seccion: MarketingSectionReach }) {
  const inexistente = INEXISTENTES.has(seccion.section)
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className={inexistente ? 'text-muted-foreground' : undefined}>
          {NOMBRES[seccion.section] ?? seccion.section}
          {inexistente && <span className="text-muted-foreground"> · no está en la página</span>}
        </span>
        <span className="nums text-muted-foreground shrink-0">
          {ENTEROS.format(seccion.reach)} · {(seccion.share * 100).toFixed(0)}%
        </span>
      </div>
      <div className="bg-secondary mt-1.5 h-1 overflow-hidden rounded-full">
        <div
          className="bg-brand h-full rounded-full transition-[width]"
          style={{ width: `${Math.min(seccion.share * 100, 100)}%` }}
        />
      </div>
    </li>
  )
}
