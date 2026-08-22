import { Users } from 'lucide-react'
import { KpiStrip, KpiTile } from '@/components/kpi-tile'
import { Panel } from '@/components/panel'
import { Chart } from '@/components/ui/chart'
import { DonutChart } from '@/components/ui/chart'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { delta, previousRange } from '@/lib/date-range'
import { useMarketingOverview } from './hooks'

const ENTEROS = new Intl.NumberFormat('es-CO')

/**
 * **Cuánta gente llegó a la portada y cuánta abrió cuenta.**
 *
 * La comparación con el período anterior son **dos llamadas de verdad** a la misma ruta y
 * no una estimación: el contrato devuelve una ventana y solo una, así que la de antes se
 * pide (§70 — un dato que no se tiene no se inventa; este sí se tiene, hay que ir por él).
 * Es el mismo criterio del panel de actividad del playground, y por eso `previousRange`
 * vive en `lib/` y no en una de las dos.
 *
 * **Todo aquí son cuentas, no dinero.** `Chart` va con `unit="count"`: un `$` delante de
 * «visitantes» no sería un formato pobre, sería una cifra falsa.
 */
export function MarketingOverviewTab({ from, to }: { from: string; to: string }) {
  const actual = useMarketingOverview({ from, to })
  const anterior = useMarketingOverview(previousRange(from, to))

  if (actual.isError) {
    return <ErrorState error={actual.error} fallback="No se pudo cargar el resumen." />
  }
  if (actual.isPending || !actual.overview) {
    return <Skeleton className="h-80 w-full" />
  }

  const o = actual.overview
  const previo = anterior.overview

  /*
    La conversión llega ya calculada por el backend y NO se recalcula aquí: dividir
    `signups / visitors` en el front daría otro número en cuanto el servidor cambie de
    criterio —sesiones en vez de visitantes, por ejemplo— y la pantalla contaría una
    historia distinta de la del API sin que nadie lo note (§70).
  */
  const conversion = o.conversionRate

  return (
    <div className="space-y-4">
      <KpiStrip
        featured={
          <KpiTile
            featured
            label="Visitantes"
            value={ENTEROS.format(o.visitors)}
            delta={{ pct: pct(delta(o.visitors, previo?.visitors)), higherIsGood: true }}
            sub="Personas distintas que abrieron la portada"
          />
        }
      >
        <KpiTile
          label="Registros"
          value={ENTEROS.format(o.signups)}
          delta={{ pct: pct(delta(o.signups, previo?.signups)), higherIsGood: true }}
        />
        <KpiTile
          label="Conversión"
          value={`${(conversion * 100).toFixed(1)}%`}
          delta={{ pct: pct(delta(conversion, previo?.conversionRate)), higherIsGood: true }}
        />
      </KpiStrip>

      <Panel title="Día a día">
        <Chart
          unit="count"
          x="day"
          data={o.daily as unknown as Record<string, string | number>[]}
          series={[
            { key: 'visitors', label: 'Visitantes', tone: 'chart-1', shape: 'area' },
            { key: 'sessions', label: 'Sesiones', tone: 'chart-2', shape: 'line' },
            { key: 'signups', label: 'Registros', tone: 'success', shape: 'line' },
          ]}
          empty="Nadie pasó por la portada en este período."
        />
      </Panel>

      <Panel title="Desde dónde la miran">
        {o.devices.mobile + o.devices.tablet + o.devices.desktop === 0 ? (
          <EmptyState
            Icon={Users}
            title="Sin visitas en el período"
            description="Cuando alguien entre, aquí se ve con qué dispositivo lo hizo."
          />
        ) : (
          <DonutChart
            slices={[
              { id: 'mobile', label: 'Móvil', value: o.devices.mobile },
              { id: 'tablet', label: 'Tableta', value: o.devices.tablet },
              { id: 'desktop', label: 'Escritorio', value: o.devices.desktop },
            ]}
          />
        )}
      </Panel>
    </div>
  )
}

/** `KpiTile` pinta el delta en porcentaje; `delta` lo devuelve en tanto por uno. */
function pct(value: number | null): number | null {
  return value === null ? null : value * 100
}
