import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, MapPin, Pencil, Plus } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageOrg } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import type { Branch } from '@/api/generated/model'
import { useBranches, useCreateBranch, useUpdateBranch } from './hooks'

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  code: z.string().trim().max(40).optional(),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  isActive: z.boolean().optional(),
})
type Values = z.infer<typeof schema>

function BranchDialog({
  orgId,
  open,
  onOpenChange,
  branch,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  branch: Branch | null
}) {
  const create = useCreateBranch(orgId)
  const update = useUpdateBranch(orgId)
  const isEdit = !!branch
  const busy = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) {
      reset({
        name: branch?.name ?? '',
        code: branch?.code ?? '',
        address: branch?.address ?? '',
        phone: branch?.phone ?? '',
        isActive: branch?.isActive ?? true,
      })
    }
  }, [open, branch, reset])

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      code: values.code ? values.code : null,
      address: values.address ? values.address : null,
      phone: values.phone ? values.phone : null,
    }
    try {
      if (isEdit && branch) {
        await update.mutateAsync({
          orgId,
          branchId: branch.id,
          data: { ...payload, isActive: values.isActive },
        })
        toast.success('Sede actualizada')
      } else {
        await create.mutateAsync({ orgId, data: payload })
        toast.success('Sede creada')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar la sede'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar sede' : 'Nueva sede'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Nombre" htmlFor="b-name" required error={errors.name?.message}>
            <Input id="b-name" placeholder="Sede principal" {...register('name')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código" htmlFor="b-code" error={errors.code?.message}>
              <Input id="b-code" {...register('code')} />
            </Field>
            <Field label="Teléfono" htmlFor="b-phone" error={errors.phone?.message}>
              <Input id="b-phone" {...register('phone')} />
            </Field>
          </div>
          <Field label="Dirección" htmlFor="b-address" error={errors.address?.message}>
            <Input id="b-address" {...register('address')} />
          </Field>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" {...register('isActive')} />
              Sede activa
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BranchesPage() {
  const { orgId, role } = useCurrentOrg()
  const { branches, isPending, isError, error } = useBranches(orgId)
  const canManage = canManageOrg(role)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (branch: Branch) => {
    setEditing(branch)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Sedes" description="Ubicaciones de la organización.">
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Agregar sede</span>
          </Button>
        )}
      </PageHeader>

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">{getErrorMessage(error, 'No se pudieron cargar las sedes.')}</p>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <MapPin className="size-6" />
            <p className="text-sm">Aún no hay sedes.</p>
            {canManage && (
              <Button size="sm" variant="outline" onClick={openCreate}>
                <Plus className="size-4" />
                Crear la primera
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {branches.map((branch) => (
            <Card key={branch.id}>
              <CardContent className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                  <MapPin className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{branch.name}</span>
                    {branch.code && (
                      <Badge variant="secondary" className="shrink-0">
                        {branch.code}
                      </Badge>
                    )}
                    {!branch.isActive && (
                      <Badge variant="outline" className="shrink-0">
                        Inactiva
                      </Badge>
                    )}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {[branch.address, branch.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                  </div>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(branch)}
                    aria-label={`Editar ${branch.name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {orgId && (
        <BranchDialog orgId={orgId} open={dialogOpen} onOpenChange={setDialogOpen} branch={editing} />
      )}
    </div>
  )
}
