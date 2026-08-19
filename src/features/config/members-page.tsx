import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, Users } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormDialog } from '@/components/ui/form-dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { ASSIGNABLE_ROLES, roleLabel } from '@/features/organizations/roles'
import { useCan } from '@/features/platform/permissions'
import { getErrorMessage } from '@/lib/errors'
import { initials } from '@/lib/format'
import type { AnyRole } from '@/features/organizations/roles'
import type { Member } from '@/api/generated/model'
import { useAddMember, useMembers, useRemoveMember, useUpdateMemberRole } from './hooks'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const addSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Ingresa el email')
    .refine((v) => EMAIL_RE.test(v), 'Email inválido'),
  role: z.enum(['OWNER', 'ADMIN', 'ACCOUNTANT', 'OPERATOR', 'VIEWER']),
})
type AddValues = z.infer<typeof addSchema>

function AddMemberDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const add = useAddMember(orgId)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddValues>({
    resolver: zodResolver(addSchema),
    defaultValues: { email: '', role: 'VIEWER' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await add.mutateAsync({ orgId, data: { email: values.email, role: values.role } })
      toast.success('Miembro agregado')
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo agregar el miembro'))
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Agregar miembro"
      description={
        <>
          El usuario debe tener una cuenta en Nummo. Si aún no la tiene, pídele que se registre en{' '}
          <span className="text-foreground font-medium">/register</span> con su email.
        </>
      }
      submitLabel="Agregar"
      loading={add.isPending}
      onSubmit={onSubmit}
    >
      <Field label="Email" htmlFor="m-email" required error={errors.email?.message}>
        <Input id="m-email" type="email" placeholder="persona@empresa.com" {...register('email')} />
      </Field>
      <Field label="Rol" htmlFor="m-role" error={errors.role?.message}>
        <NativeSelect id="m-role" {...register('role')}>
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </FormDialog>
  )
}

export function MembersPage() {
  const { orgId } = useCurrentOrg()
  const { user } = useAuth()
  const { members, isPending, isError, error } = useMembers(orgId)
  const updateRole = useUpdateMemberRole(orgId ?? '')
  const removeMember = useRemoveMember(orgId ?? '')
  const can = useCan()
  const canManage = can('organization.members.manage')

  const [addOpen, setAddOpen] = useState(false)
  const [removing, setRemoving] = useState<Member | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const changeRole = async (member: Member, nextRole: AnyRole) => {
    if (nextRole === member.role) return
    setBusyId(member.id)
    try {
      await updateRole.mutateAsync({ orgId: orgId ?? '', membershipId: member.id, data: { role: nextRole } })
      toast.success('Rol actualizado')
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo cambiar el rol'))
    } finally {
      setBusyId(null)
    }
  }

  const confirmRemove = async () => {
    if (!removing) return
    try {
      await removeMember.mutateAsync({ orgId: orgId ?? '', membershipId: removing.id })
      toast.success('Miembro removido')
      setRemoving(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo remover el miembro'))
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Miembros" description="Personas con acceso a la organización.">
        {canManage && (
          <Button size="sm" onClick={() => setAddOpen(true)} aria-label="Agregar miembro">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Agregar</span>
          </Button>
        )}
      </PageHeader>

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">{getErrorMessage(error, 'No se pudieron cargar los miembros.')}</p>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Users className="size-6" />
            <p className="text-sm">No hay miembros.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
            const isSelf = user?.id === member.userId
            return (
              <Card key={member.id}>
                <CardContent className="flex flex-wrap items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                    {initials(member.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{member.fullName}</span>
                      {isSelf && <Badge variant="secondary">Tú</Badge>}
                      {!member.isActive && <Badge variant="outline">Inactivo</Badge>}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">{member.email}</div>
                  </div>

                  {canManage ? (
                    <div className="flex items-center gap-2">
                      <NativeSelect
                        className="h-8 w-36"
                        value={member.role}
                        disabled={busyId === member.id}
                        onChange={(e) => changeRole(member, e.target.value as AnyRole)}
                        aria-label={`Rol de ${member.fullName}`}
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </NativeSelect>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRemoving(member)}
                        aria-label={`Remover ${member.fullName}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="secondary">{roleLabel(member.role)}</Badge>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {orgId && <AddMemberDialog orgId={orgId} open={addOpen} onOpenChange={setAddOpen} />}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remover miembro"
        description={removing ? `${removing.fullName} perderá el acceso a la organización.` : undefined}
        confirmLabel="Remover"
        destructive
        loading={removeMember.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  )
}
