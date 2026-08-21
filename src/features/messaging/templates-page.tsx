import { Lock, MessageSquareText, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Loader } from '@/components/ui/loader'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { toastApiError } from '@/features/platform/errors'
import { useCan } from '@/features/platform/permissions'
import { formatDateHuman } from '@/lib/format'
import type { SyncWhatsAppTemplatesResult, WhatsAppTemplate } from '@/api/generated/model'
import { useSyncWhatsAppTemplates, useWhatsAppTemplates } from './hooks'
import { isPlatformTemplate, templateStatus } from './labels'

/**
 * **Las plantillas con las que se cobra.**
 *
 * De solo lectura, y a propósito. Crear una propia exige que la organización
 * tenga **cuenta propia de Meta** —con la de plataforma, una organización podría
 * agotar el cupo de 100 creaciones/hora de todas las demás—, y eso llega en la
 * fase 5. Hasta entonces el alta no tendría a quién servirle, así que aquí está
 * la lectura y el botón de crear no existe (§70: no se ofrece lo que va a
 * fallar).
 *
 * Lo que sí hace falta ya es **entender por qué un mensaje no salió**: la
 * política puede nombrar una plantilla que Meta pausó o todavía no aprobó, y
 * esta pantalla es donde eso se ve.
 */
export function WhatsAppTemplatesPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canRead = can('whatsapp.templates.read')
  const canManage = can('whatsapp.templates.manage')

  const { templates, isPending, isError, error, refetch } = useWhatsAppTemplates(
    canRead ? orgId : undefined,
  )
  const sync = useSyncWhatsAppTemplates(orgId ?? '')

  if (!canRead) {
    return (
      <div className="space-y-4">
        <PageHeader title="Plantillas de WhatsApp" />
        <EmptyState
          Icon={Lock}
          title="No puedes ver esto"
          description="Tu rol no incluye las plantillas de mensajes de esta organización."
        />
      </div>
    )
  }

  const onSync = async () => {
    if (!orgId) return
    try {
      const response = await sync.mutateAsync({ orgId })
      const { reviewed, updated } = response.data as SyncWhatsAppTemplatesResult
      toast.success(
        updated === 0
          ? `Sin cambios: ${reviewed === 1 ? '1 plantilla' : `${reviewed} plantillas`} ya estaban al día`
          : `${updated === 1 ? '1 plantilla' : `${updated} plantillas`} de ${reviewed} cambiaron de estado`,
      )
    } catch (err) {
      toastApiError(err, 'No se pudo contrastar con Meta')
    }
  }

  const platform = templates.filter(isPlatformTemplate)
  const own = templates.filter((t) => !isPlatformTemplate(t))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Plantillas de WhatsApp"
        description="Los mensajes con los que Nummo le escribe a quien te debe."
      >
        {canManage && (
          <Button variant="outline" onClick={() => void onSync()} disabled={sync.isPending}>
            {sync.isPending ? <Loader className="size-4" /> : <RefreshCw className="size-4" />}
            <span className="hidden sm:inline">Actualizar estado</span>
          </Button>
        )}
      </PageHeader>

      {isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState
          error={error}
          fallback="No se pudieron cargar las plantillas."
          onRetry={() => void refetch()}
        />
      ) : templates.length === 0 ? (
        <EmptyState
          Icon={MessageSquareText}
          title="Todavía no hay plantillas"
          description="Sin al menos una plantilla aprobada, la cobranza por WhatsApp no puede enviar nada."
        />
      ) : (
        <div className="space-y-4">
          {platform.length > 0 && (
            <Panel title="De Nummo">
              <p className="text-muted-foreground mb-2 text-xs">
                Vienen aprobadas y son las que nombra la política de cobranza.
              </p>
              <ul className="divide-y">
                {platform.map((template) => (
                  <TemplateRow key={template.id} template={template} />
                ))}
              </ul>
            </Panel>
          )}

          {own.length > 0 && (
            <Panel title="De tu organización">
              <ul className="divide-y">
                {own.map((template) => (
                  <TemplateRow key={template.id} template={template} />
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}

      {/* Se dice aquí y no cuando alguien busque el botón que no está. */}
      <Note tone="info" title="Crear plantillas propias todavía no está disponible">
        Hace falta que la organización conecte su propia cuenta de Meta. Mientras tanto se usan las
        de Nummo, que ya están aprobadas.
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
          {template.templateKey} · {template.language}
        </p>
        {template.parameterNames.length > 0 && (
          <p className="text-muted-foreground text-xs">
            Usa: {template.parameterNames.join(', ')}
          </p>
        )}
        {/* Meta dice por qué la rechazó; esconderlo deja la fila sin salida. */}
        {template.rejectedReason && (
          <p className="text-destructive text-xs">{template.rejectedReason}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge {...status} />
        {template.lastSyncedAt && (
          <span className="text-muted-foreground text-xs">
            Contrastado el {formatDateHuman(template.lastSyncedAt)}
          </span>
        )}
      </div>
    </li>
  )
}
