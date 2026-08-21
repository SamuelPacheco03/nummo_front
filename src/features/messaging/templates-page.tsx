import { Link } from 'react-router'
import { useState } from 'react'
import { Lock, MessageSquareText, Plus, RefreshCw, Trash2 } from 'lucide-react'
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
import { useCan, useFeature } from '@/features/platform/permissions'
import { formatDateHuman } from '@/lib/format'
import type { SyncWhatsAppTemplatesResult, WhatsAppTemplate } from '@/api/generated/model'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  useCreateWhatsAppTemplate,
  useDeleteWhatsAppTemplate,
  useSyncWhatsAppTemplates,
  useWhatsAppAccount,
  useWhatsAppTemplates,
} from './hooks'
import { isPlatformTemplate, templateStatus } from './labels'
import { TemplateFormDialog } from './template-form-dialog'

/**
 * **Las plantillas con las que se cobra.**
 *
 * **Crear y borrar exigen cuenta propia de Meta**, y no es una regla nuestra: en
 * la cuenta compartida de Nummo una organización podría agotarle a las demás el
 * cupo de creación, o dejar un nombre bloqueado treinta días. Así que los dos
 * botones aparecen **solo con la cuenta conectada** — ofrecerlos sin ella sería
 * ofrecer algo que va a responder 403 (§70).
 *
 * Las de la plataforma no se borran desde aquí ni con cuenta propia: no son de
 * esta organización.
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
  const create = useCreateWhatsAppTemplate(orgId ?? '')
  const remove = useDeleteWhatsAppTemplate(orgId ?? '')
  // Crear y borrar cuelgan de tener número propio, así que hay que saberlo aquí.
  const hasByo = useFeature('whatsapp_byo')
  const { connected } = useWhatsAppAccount(
    canRead && can('whatsapp.settings.read') ? orgId : undefined,
    hasByo,
  )
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<WhatsAppTemplate | null>(null)

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
        {canManage && connected && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus aria-hidden className="size-4" />
            <span className="hidden sm:inline">Nueva plantilla</span>
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
                  <TemplateRow
                    key={template.id}
                    template={template}
                    onDelete={
                      canManage && connected ? () => setDeleting(template) : undefined
                    }
                  />
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}

      {/* Se dice aquí y no cuando alguien busque el botón que no está. La regla
          es del backend: en la cuenta compartida, una organización podría
          agotarle a las demás el cupo de creación. */}
      {!connected && (
        <Note tone="info" title="Para crear plantillas propias hace falta tu número">
          Con el número de Nummo se usan estas, que ya están aprobadas. Conectando el tuyo puedes
          escribir las tuyas.{' '}
          <Link to="/config/whatsapp" className="text-brand underline">
            Número de WhatsApp
          </Link>
        </Note>
      )}

      <TemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        loading={create.isPending}
        onSubmit={async (data) => {
          if (!orgId) return
          try {
            await create.mutateAsync({ orgId, data })
            toast.success('Plantilla enviada a revisión', {
              description: 'Meta tiene que aprobarla antes de que se pueda usar.',
            })
            setFormOpen(false)
          } catch (err) {
            toastApiError(err, 'No se pudo crear la plantilla')
          }
        }}
      />

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Borrar la plantilla"
        description={
          deleting
            ? `«${deleting.name}» se borra también en Meta. Si la política de cobranza la estaba usando, ese aviso se queda sin plantilla y deja de salir.`
            : undefined
        }
        confirmLabel="Borrar"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          if (!orgId || !deleting) return
          try {
            await remove.mutateAsync({ orgId, templateKey: deleting.templateKey })
            toast.success('Plantilla borrada')
            setDeleting(null)
          } catch (err) {
            toastApiError(err, 'No se pudo borrar la plantilla')
          }
        }}
      />
    </div>
  )
}

function TemplateRow({
  template,
  onDelete,
}: {
  template: WhatsAppTemplate
  /** Solo las propias y solo con cuenta conectada; si no, no llega. */
  onDelete?: () => void
}) {
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

      <div className="flex shrink-0 items-start gap-3">
        <div className="flex flex-col items-end gap-1">
          <StatusBadge {...status} />
          {template.lastSyncedAt && (
            <span className="text-muted-foreground text-xs">
              Contrastado el {formatDateHuman(template.lastSyncedAt)}
            </span>
          )}
        </div>
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label={`Borrar ${template.name}`}>
            <Trash2 aria-hidden className="size-4" />
          </Button>
        )}
      </div>
    </li>
  )
}
