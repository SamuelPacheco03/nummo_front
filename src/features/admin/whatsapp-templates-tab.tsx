import { useState } from 'react'
import { MessageSquareText, RefreshCw } from 'lucide-react'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Loader } from '@/components/ui/loader'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { toastApiError } from '@/features/platform/errors'
import { templateStatus } from '@/features/messaging/labels'
import { formatDateHuman } from '@/lib/format'
import type { PlatformTemplateSync, WhatsAppTemplate } from '@/api/generated/model'
import { usePlatformTemplates, useSyncPlatformTemplates } from './hooks'

/**
 * **Las plantillas de la plataforma**: las de Nummo, que comparten todos los
 * clientes.
 *
 * Importan porque el fallo se reparte: si Meta pausa una, se cae la cobranza de
 * **todos** a la vez, y la única señal eran los mensajes saltados repartidos por
 * el historial de cada organización. Nadie ata una cosa con la otra.
 *
 * Los estados se traducen con la misma tabla que usa la pantalla del inquilino
 * (`messaging/labels`): son las mismas plantillas mirando desde el otro lado, y
 * dos tablas del mismo enum se separan a la primera corrección.
 */
export function WhatsAppTemplatesTab() {
  const { templates, isPending, isError, error } = usePlatformTemplates()
  const sync = useSyncPlatformTemplates()
  const [result, setResult] = useState<PlatformTemplateSync | null>(null)

  const onSync = async () => {
    try {
      const response = await sync.mutateAsync()
      setResult(response.data as PlatformTemplateSync)
    } catch (err) {
      // `WHATSAPP_NOT_CONFIGURED` trae en `details.missing` el nombre de la
      // variable que falta, y quien lee esto es quien puede ponerla: el mensaje
      // del backend se enseña tal cual (§47.5).
      toastApiError(err, 'No se pudo hablar con Meta')
    }
  }

  return (
    <div className="space-y-4">
      {isError ? (
        <ErrorState error={error} fallback="No se pudieron cargar las plantillas." />
      ) : (
        <Panel
          title="Plantillas de Nummo"
          action={
            <Button variant="outline" size="sm" onClick={() => void onSync()} disabled={sync.isPending}>
              {sync.isPending ? <Loader className="size-4" /> : <RefreshCw className="size-4" />}
              Sincronizar con Meta
            </Button>
          }
        >
          <p className="text-muted-foreground mb-3 text-xs">
            Las usan todas las organizaciones que no tienen cuenta propia. Empujar el catálogo{' '}
            <strong>no recrea lo que ya existe</strong>: lo refleja. Es el mismo trabajo que{' '}
            <code className="nums">pnpm wa:templates:sync</code>.
          </p>

          {isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : templates.length === 0 ? (
            <EmptyState
              Icon={MessageSquareText}
              title="Este despliegue no tiene plantillas"
              description="Sincroniza con Meta para empujar el catálogo de Nummo."
            />
          ) : (
            <ul className="divide-y">
              {templates.map((template) => (
                <TemplateRow key={template.id} template={template} />
              ))}
            </ul>
          )}

          {result && <SyncResult result={result} />}
        </Panel>
      )}

      <Note tone="info" title="Una pausada aquí apaga la cobranza de todos">
        Estas plantillas son compartidas: si Meta pausa o rechaza una, las organizaciones sin cuenta
        propia dejan de poder enviar ese aviso, y lo único que ven es un mensaje saltado.
      </Note>
    </div>
  )
}

function TemplateRow({ template }: { template: WhatsAppTemplate }) {
  const status = templateStatus(template)

  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium">{template.name}</p>
        <p className="text-muted-foreground truncate text-xs">
          {template.templateKey} · {template.language} · {template.metaCategory}
        </p>
        {template.parameterNames.length > 0 && (
          <p className="text-muted-foreground text-xs">Usa: {template.parameterNames.join(', ')}</p>
        )}
        {template.rejectedReason && (
          <p className="text-destructive text-xs">{template.rejectedReason}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {/* `canSend` viene calculado; no se deduce del `status`. */}
        <StatusBadge {...status} />
        {!template.canSend && (
          <span className="text-warning-strong text-xs">No se puede enviar</span>
        )}
        {template.lastSyncedAt && (
          <span className="text-muted-foreground text-xs">
            Contrastada el {formatDateHuman(template.lastSyncedAt)}
          </span>
        )}
      </div>
    </li>
  )
}

/**
 * Qué hizo el sync.
 *
 * `created` **no significa «lista para usar»**: lo nuevo queda en revisión hasta
 * que Meta lo mire, de minutos a horas. Y `failed` se pinta aunque casi siempre
 * esté vacío — una plantilla que falla no detiene a las demás, así que sin
 * enseñarlo el fallo pasa desapercibido entre los éxitos.
 */
function SyncResult({ result }: { result: PlatformTemplateSync }) {
  const { created, alreadyThere, failed } = result

  return (
    <div className="mt-4 space-y-2 border-t pt-4 text-xs">
      <p className="text-sm font-medium">
        {created.length === 0 && failed.length === 0
          ? 'Sin cambios: el catálogo ya estaba puesto'
          : `${created.length} creadas · ${alreadyThere.length} ya estaban`}
      </p>

      {created.length > 0 && (
        <p className="text-muted-foreground">
          <span className="nums">{created.join(', ')}</span> — quedan en revisión hasta que Meta las
          mire; puede tardar de minutos a horas.
        </p>
      )}

      {alreadyThere.length > 0 && created.length === 0 && (
        <p className="text-muted-foreground nums">{alreadyThere.join(', ')}</p>
      )}

      {failed.length > 0 && (
        <div className="text-destructive space-y-1">
          <p className="font-medium">{failed.length} fallaron</p>
          {failed.map((item, i) => (
            <p key={i} className="nums">
              {JSON.stringify(item)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
