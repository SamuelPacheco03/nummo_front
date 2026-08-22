import { Megaphone } from 'lucide-react'
import { Panel } from '@/components/panel'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { MarketingCampaign } from '@/api/generated/model'
import { useMarketingSources } from './hooks'

const ENTEROS = new Intl.NumberFormat('es-CO')

/** Los canales del enum `utm.source`, en el idioma en que se habla de ellos. */
const CANALES: Record<string, string> = {
  google: 'Google',
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  email: 'Correo',
  direct: 'Directo',
  other: 'Otro',
}

/**
 * **Qué trae cada canal, hasta la organización que paga.**
 *
 * Es la única de las tres que llega al dinero, y por eso es la que decide en qué se gasta:
 * un canal con muchos visitantes y cero pagando no es un buen canal, es uno caro.
 *
 * Que la atribución sobrevive al camino entero lo hace una cookie de visitante `HttpOnly`
 * que escribe el backend al responder a `/public/signals` — el front ni la lee ni la
 * necesita (§97.20). Por eso `paying` puede contar una organización que se registró
 * semanas después de la visita que la trajo.
 *
 * **Tabla y no gráfica**: son cuatro cifras por fila que se leen comparando hacia abajo,
 * y lo que se busca aquí es exactamente dónde se cae el embudo de un canal concreto.
 */
export function MarketingSourcesTab({ from, to }: { from: string; to: string }) {
  const { sources, isPending, isError, error } = useMarketingSources({ from, to })

  if (isError) return <ErrorState error={error} fallback="No se pudieron cargar las campañas." />
  if (isPending || !sources) return <Skeleton className="h-80 w-full" />

  if (sources.campaigns.length === 0) {
    return (
      <Panel title="Campañas">
        <EmptyState
          Icon={Megaphone}
          title="Sin campañas en el período"
          description="Aquí aparece cada campaña que trajo visitas, con sus UTM. Las visitas sin UTM se agrupan como «Directo»."
        />
      </Panel>
    )
  }

  return (
    <Panel title="Campañas">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Canal</TableHead>
            <TableHead>Campaña</TableHead>
            <TableHead className="text-right">Visitantes</TableHead>
            <TableHead className="text-right">Registros</TableHead>
            <TableHead className="text-right">Con organización</TableHead>
            <TableHead className="text-right">Pagando</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.campaigns.map((c) => (
            <Fila key={`${c.source}·${c.campaign}`} campana={c} />
          ))}
        </TableBody>
      </Table>
    </Panel>
  )
}

function Fila({ campana }: { campana: MarketingCampaign }) {
  return (
    <TableRow>
      <TableCell>{CANALES[campana.source] ?? campana.source}</TableCell>
      {/*
        Una campaña sin nombre no es un error: es tráfico con `utm_source` y sin
        `utm_campaign`, que es la mitad de lo que llega. Se dice, no se deja en blanco.
      */}
      <TableCell className={campana.campaign ? undefined : 'text-muted-foreground'}>
        {campana.campaign || 'Sin campaña'}
      </TableCell>
      <TableCell className="nums text-right">{ENTEROS.format(campana.visitors)}</TableCell>
      <TableCell className="nums text-right">{ENTEROS.format(campana.signups)}</TableCell>
      <TableCell className="nums text-right">{ENTEROS.format(campana.withOrganization)}</TableCell>
      {/* La única columna que es plata. Se distingue con peso, no con color. */}
      <TableCell className="nums text-right font-semibold">{ENTEROS.format(campana.paying)}</TableCell>
    </TableRow>
  )
}
