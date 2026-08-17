import { useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Archive,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusDot } from '@/components/ui/status-badge'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import type { ContactRelationship } from '@/api/generated/model'
import { AddRelationshipDialog } from './add-relationship-dialog'
import { contactTypeLabel } from './utils'
import { useArchiveContact, useContact, useRelationships, useRemoveRelationship } from './hooks'

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{value}</dd>
    </div>
  )
}

export function ContactDetailPage() {
  const { contactId } = useParams()
  const { orgId, role } = useCurrentOrg()
  const canEdit = canEditContacts(role)

  const { contact, isPending, isError, error } = useContact(orgId, contactId)
  const { relationships, isPending: relPending } = useRelationships(orgId, contactId)
  const archive = useArchiveContact(orgId ?? '')
  const removeRel = useRemoveRelationship(orgId ?? '')

  const [addOpen, setAddOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [removingRel, setRemovingRel] = useState<ContactRelationship | null>(null)

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }
  if (isError || !contact) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/contactos">
            <ArrowLeft className="size-4" />
            Contactos
          </Link>
        </Button>
        <p className="text-sm text-destructive">
          {getErrorMessage(error, 'No se encontró el contacto.')}
        </p>
      </div>
    )
  }

  const onArchive = async () => {
    try {
      await archive.mutateAsync({ orgId: orgId ?? '', contactId: contact.id })
      toast.success('Contacto archivado')
      setArchiveOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo archivar'))
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
      toast.error(getErrorMessage(err, 'No se pudo eliminar la relación'))
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/contactos">
            <ArrowLeft className="size-4" />
            Contactos
          </Link>
        </Button>
        <PageHeader
          title={contact.displayName}
          description={
            <span className="flex items-center gap-2">
              {contactTypeLabel(contact.contactType)}
              <span className="text-border">·</span>
              <StatusDot active={contact.isActive} inactiveLabel="Archivado" />
            </span>
          }
        >
          {canEdit && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link to={`/contactos/${contact.id}/editar`}>
                  <Pencil className="size-4" />
                  Editar
                </Link>
              </Button>
              {contact.isActive && (
                <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
                  <Archive className="size-4" />
                  Archivar
                </Button>
              )}
            </>
          )}
        </PageHeader>
      </div>

      {/* Información */}
      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Información
        </h2>
        <Card className="gap-0 py-0">
          <dl className="divide-y">
            <InfoRow label="Tipo" value={contactTypeLabel(contact.contactType)} />
            <InfoRow
              label="Documento"
              value={
                contact.documentNumber
                  ? [contact.documentType, contact.documentNumber].filter(Boolean).join(' ')
                  : null
              }
            />
            <InfoRow label="Email" value={contact.email} />
            <InfoRow label="Teléfono" value={contact.phone} />
            <InfoRow label="Dirección" value={contact.address} />
            <InfoRow label="Notas" value={contact.notes} />
          </dl>
        </Card>
      </section>

      {/* Relaciones */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Relaciones
          </h2>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Agregar
            </Button>
          )}
        </div>

        <Card className="gap-0 py-0">
          {relPending ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : relationships.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin relaciones.</p>
          ) : (
            <ul className="divide-y">
              {relationships.map((rel) => {
                const outgoing = rel.direction === 'OUTGOING'
                const DirIcon = outgoing ? ArrowUpRight : ArrowDownLeft
                return (
                  <li key={rel.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <DirIcon
                      className={cnDir(outgoing)}
                      aria-label={outgoing ? 'Saliente' : 'Entrante'}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/contactos/${rel.counterpart.id}`}
                        className="font-medium hover:underline"
                      >
                        {rel.counterpart.displayName}
                      </Link>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {rel.relationshipType}
                        {rel.isPrimary && (
                          <span className="inline-flex items-center gap-0.5 text-brand">
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
        </Card>
      </section>

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
    </div>
  )
}

function cnDir(outgoing: boolean): string {
  return `size-4 shrink-0 ${outgoing ? 'text-chart-1' : 'text-chart-3'}`
}
