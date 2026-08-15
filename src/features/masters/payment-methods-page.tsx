import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageOrg } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import type { PaymentMethod } from '@/api/generated/model'
import { MasterCrud, useMasterListState, type Column } from './master-crud'
import { METHOD_TYPES, METHOD_TYPE_LABELS } from './labels'
import { useCreatePaymentMethod, usePaymentMethods, useUpdatePaymentMethod } from './hooks'

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  methodType: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'DIGITAL_WALLET', 'OTHER']),
  isActive: z.boolean().optional(),
})
type Values = z.infer<typeof schema>

const COLUMNS: Column<PaymentMethod>[] = [
  { header: 'Nombre', cell: (r) => r.name, className: 'font-medium' },
  { header: 'Tipo', cell: (r) => METHOD_TYPE_LABELS[r.methodType] ?? r.methodType },
]

function MethodDialog({
  orgId,
  open,
  onOpenChange,
  editing,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: PaymentMethod | null
}) {
  const create = useCreatePaymentMethod(orgId)
  const update = useUpdatePaymentMethod(orgId)
  const isEdit = !!editing
  const busy = create.isPending || update.isPending
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open)
      reset({
        name: editing?.name ?? '',
        methodType: editing?.methodType ?? 'CASH',
        isActive: editing?.isActive ?? true,
      })
  }, [open, editing, reset])

  const onSubmit = handleSubmit(async (v) => {
    try {
      if (isEdit && editing) {
        await update.mutateAsync({
          orgId,
          id: editing.id,
          data: { name: v.name, methodType: v.methodType, isActive: v.isActive },
        })
        toast.success('Método actualizado')
      } else {
        await create.mutateAsync({ orgId, data: { name: v.name, methodType: v.methodType } })
        toast.success('Método creado')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar método' : 'Nuevo método de pago'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Nombre" htmlFor="pm-name" required error={errors.name?.message}>
            <Input id="pm-name" placeholder="Nequi, Bancolombia…" {...register('name')} />
          </Field>
          <Field label="Tipo" htmlFor="pm-type" error={errors.methodType?.message}>
            <NativeSelect id="pm-type" {...register('methodType')}>
              {METHOD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {METHOD_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" {...register('isActive')} />
              Activo
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

export function PaymentMethodsPage() {
  const { orgId, role } = useCurrentOrg()
  const canManage = canManageOrg(role)
  const state = useMasterListState()
  const list = usePaymentMethods(orgId, state.params)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentMethod | null>(null)

  return (
    <>
      <MasterCrud
        title="Métodos de pago"
        description="Formas en que la organización recibe o realiza pagos."
        canManage={canManage}
        newLabel="Nuevo método"
        searchPlaceholder="Buscar método…"
        state={state}
        list={list}
        columns={COLUMNS}
        onNew={() => {
          setEditing(null)
          setOpen(true)
        }}
        onEdit={(r) => {
          setEditing(r)
          setOpen(true)
        }}
      />
      {orgId && <MethodDialog orgId={orgId} open={open} onOpenChange={setOpen} editing={editing} />}
    </>
  )
}
