import { type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { useGetHealth } from '@/api/generated/endpoints/system/system'
import { ApiError } from '@/api/http-client'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusDot } from '@/components/ui/status-badge'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

function formatUptime(totalSeconds: number): string {
  const s = Math.floor(totalSeconds % 60)
  const m = Math.floor((totalSeconds / 60) % 60)
  const h = Math.floor((totalSeconds / 3600) % 24)
  const d = Math.floor(totalSeconds / 86400)
  const parts: string[] = []
  if (d) parts.push(`${d}d`)
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

function Row({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="nums col-span-2">{children ?? value}</dd>
    </div>
  )
}

export function HealthPage() {
  const { data, isPending, isError, error, refetch, isFetching } = useGetHealth({
    query: { refetchInterval: 15_000 },
  })
  const health = data?.data

  return (
    <div>
      <PageHeader title="Estado del sistema" description="Salud del backend vía GET /health.">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
          Actualizar
        </Button>
      </PageHeader>

      {isError ? (
        <div className="max-w-lg rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="font-medium text-destructive">Backend no disponible</div>
          <p className="mt-1 text-muted-foreground">{getErrorMessage(error)}</p>
          <p className="mt-2 text-muted-foreground">
            Verifica que la API esté corriendo en el puerto 4010 (<code>pnpm dev</code> en{' '}
            <code>nummo-api</code>).
          </p>
          {error instanceof ApiError && (
            <p className="mt-2 text-xs text-muted-foreground">code: {error.code}</p>
          )}
        </div>
      ) : isPending ? (
        <Skeleton className="h-56 w-full max-w-lg" />
      ) : health ? (
        <Card className="max-w-lg gap-0 py-0">
          <dl className="divide-y">
            <Row label="Estado">
              <StatusDot
                active={health.status === 'ok'}
                activeLabel="Operativo"
                inactiveLabel="Degradado"
              />
            </Row>
            <Row label="Base de datos">
              <StatusDot active={health.db === 'up'} activeLabel="Conectada" inactiveLabel="Caída" />
            </Row>
            <Row label="Uptime" value={formatUptime(health.uptimeSeconds)} />
            <Row label="Versión" value={health.version} />
            <Row label="Timestamp" value={new Date(health.timestamp).toLocaleString()} />
          </dl>
        </Card>
      ) : null}
    </div>
  )
}
