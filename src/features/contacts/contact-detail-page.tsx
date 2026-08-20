import { useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Archive,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DetailDrawer,
  DetailEmpty,
  DetailRow,
  DetailRows,
  DetailSection,
} from '@/components/ui/detail-drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusDot } from '@/components/ui/status-badge'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { getErrorMessage } from '@/lib/errors'
import { toastApiError } from '@/features/platform/errors'
import { useKeepFilters } from '@/lib/use-list-filters'
import { cn } from '@/lib/utils'
import type { ContactRelationship } from '@/api/generated/model'
import { AddRelationshipDialog } from './add-relationship-dialog'
import { contactTypeLabel } from './utils'
import { useArchiveContact, useContact, useRelationships, useRemoveRelationship } from './hooks'

const LIST = '/contactos'

/**
 * Ficha de un contacto. Abre como cajón sobre la lista, igual que las de dinero
 * (§11.1.3): la lista sigue montada detrás con sus filtros y su scroll.
 */
export function ContactDetailPage() {
  const { contactId } = useParams()
  const keepFilters = useKeepFilters()
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canEdit = can('contacts.write')
  const canArchive = can('contacts.archive')

  const { contact, isPending, isError, error } = useContact(orgId, contactId)
  const { relationships, isPending: relPending } = useRelationships(orgId, contactId)
  const archive = useArchiveContact(orgId ?? '')
  const removeRel = useRemoveRelationship(orgId ?? '')

  const [addOpen, setAddOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [removingRel, setRemovingRel] = useState<ContactRelationship | null>(null)

  if (isPending) return <DetailDrawer closeTo={LIST} loading />
  if (isError || !contact) {
    return (
      <DetailDrawer
        closeTo={LIST}
        title="Contacto"
        error={getErrorMessage(error, 'No se encontró el contacto.')}
      />
    )
  }

  const onArchive = async () => {
    try {
      await archive.mutateAsync({ orgId: orgId ?? '', contactId: contact.id })
      toast.success('Contacto archivado')
      setArchiveOpen(false)
    } catch (err) {
      toastApiError(err, 'No se pudo archivar')
    }
  }

  const onRemoveRel = async () => {
    if (!removingRel) return
    try {
      await removeRel.mutateAsync({
        orgId: orgId ?? '',
        contactId: contact.id,
        relationshipId: removingRel.id,
      })
      toast.success('Relación eliminada')
      setRemovingRel(null)
    } catch (err) {
      toastApiError(err, 'No se pudo eliminar la relación')
    }
  }

  const document = contact.documentNumber
    ? [contact.documentType, contact.documentNumber].filter(Boolean).join(' ')
    : null

  return (
    <>
      <DetailDrawer
        closeTo={LIST}
        title={contact.displayName}
        meta={
          <span className="flex items-center gap-2">
            {contactTypeLabel(contact.contactType)}
            <span className="text-border">·</span>
            <StatusDot active={contact.isActive} inactiveLabel="Archivado" />
          </span>
        }
        actions={
          canEdit && (
            <>
              <Button asChild size="sm">
                <Link to={keepFilters(`/contactos/${contact.id}/editar`)}>
                  <Pencil aria-hidden className="size-4" />
                  Editar
                </Link>
              </Button>
              {/* Archivar es la excepción, no lo que se viene a hacer. */}
              {canArchive && contact.isActive && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal aria-hidden className="size-4" />
                      Más
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
                      <Archive className="size-4" />
                      Archivar contacto
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )
        }
      >
        <DetailSection title="Información">
          <DetailRows>
            <DetailRow label="Tipo">{contactTypeLabel(contact.contactType)}</DetailRow>
            <DetailRow label="Documento">{document}</DetailRow>
            <DetailRow label="Email">{contact.email}</DetailRow>
            <DetailRow label="Teléfono">{contact.phone}</DetailRow>
            <DetailRow label="Dirección">{contact.address}</DetailRow>
            <DetailRow label="Notas">{contact.notes}</DetailRow>
          </DetailRows>
        </DetailSection>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Relaciones</h3>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                <Plus aria-hidden className="size-4" />
                Agregar
              </Button>
            )}
          </div>

          {relPending ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </div>
          ) : relationships.length === 0 ? (
            <DetailEmpty>Sin relaciones.</DetailEmpty>
          ) : (
            <ul className="divide-y rounded-lg border">
              {relationships.map((rel) => {
                const outgoing = rel.direction === 'OUTGOING'
                const DirIcon = outgoing ? ArrowUpRight : ArrowDownLeft
                return (
                  <li key={rel.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                    <DirIcon
                      className={cn('size-4 shrink-0', outgoing ? 'text-chart-1' : 'text-chart-3')}
                      aria-label={outgoing ? 'Saliente' : 'Entrante'}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/contactos/${rel.counterpart.id}`}
                        className="font-medium hover:underline"
                      >
                        {rel.counterpart.displayName}
                      </Link>
                      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        {rel.relationshipType}
                        {rel.isPrimary && (
                          <span className="text-brand inline-flex items-center gap-0.5">
                            <Star className="size-3 fill-current" />
                            principal
                          </span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setRemovingRel(rel)}
                        aria-label="Eliminar relación"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </DetailDrawer>

      {orgId && (
        <AddRelationshipDialog
          orgId={orgId}
          contactId={contact.id}
          open={addOpen}
          onOpenChange={setAddOpen}
        />
      )}

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archivar contacto"
        description={`${contact.displayName} dejará de aparecer en la lista activa.`}
        confirmLabel="Archivar"
        destructive
        loading={archive.isPending}
        onConfirm={onArchive}
      />

      <ConfirmDialog
        open={!!removingRel}
        onOpenChange={(o) => !o && setRemovingRel(null)}
        title="Eliminar relación"
        confirmLabel="Eliminar"
        destructive
        loading={removeRel.isPending}
        onConfirm={onRemoveRel}
      />
    </>
  )
}
