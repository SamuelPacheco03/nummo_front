import { useEffect, useState } from 'react'
import { ReceiptText } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { MoneyField } from '@/components/money-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { toastApiError } from '@/features/platform/errors'
import type { ListResult } from '@/lib/list-result'
import { formatAmount } from '@/lib/format'
import type { BillingConcept } from '@/api/generated/model'
import { MasterCrud, type Column } from './master-crud'
import { isValidAmount } from './labels'
import { useBillingConcepts, useCreateBillingConcept, useUpdateBillingConcept } from './hooks'
import type { MasterParams } from './hooks'

const schema = z.object({
  code: z.string().trim().max(40).optional(),
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  description: z.string().trim().max(500).optional(),
  defaultAmount: z
    .string()
    .trim()
    .optional()
    .refine(isValidAmount, 'Monto inválido (ej. 550000.00)'),
  isActive: z.boolean().optional(),
})
type Values = z.infer<typeof schema>

const nn = (v?: string) => (v ? v : null)

const COLUMNS: Column<BillingConcept>[] = [
  {
    header: 'Código',
    cell: (r) => <span className="nums text-muted-foreground">{r.code ?? '—'}</span>,
    hideOnCard: true,
  },
  { header: 'Nombre', cell: (r) => r.name, card: 'title', sortField: 'name' },
  {
    header: 'Monto por defecto',
    cell: (r) => formatAmount(r.defaultAmount),
    align: 'right',
    card: 'amount',
  },
]

function ConceptDialog({
  orgId,
  open,
  onOpenChange,
  editing,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: BillingConcept | null
}) {
  const create = useCreateBillingConcept(orgId)
  const update = useUpdateBillingConcept(orgId)
  const isEdit = !!editing
  const busy = create.isPending || update.isPending
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open)
      reset({
        code: editing?.code ?? '',
        name: editing?.name ?? '',
        description: editing?.description ?? '',
        defaultAmount: editing?.defaultAmount ?? '',
        isActive: editing?.isActive ?? true,
      })
  }, [open, editing, reset])

  const onSubmit = handleSubmit(async (v) => {
    const data = {
      code: nn(v.code),
      name: v.name,
      description: nn(v.description),
      defaultAmount: nn(v.defaultAmount),
    }
    try {
      if (isEdit && editing) {
        await update.mutateAsync({ orgId, id: editing.id, data: { ...data, isActive: v.isActive } })
        toast.success('Concepto actualizado')
      } else {
        await create.mutateAsync({ orgId, data })
        toast.success('Concepto creado')
      }
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'No se pudo guardar')
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar concepto' : 'Nuevo concepto'}
      submitLabel={isEdit ? 'Guardar' : 'Crear'}
      loading={busy}
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <Field label="Código" htmlFor="bc-code" error={errors.code?.message}>
          <Input id="bc-code" {...register('code')} />
        </Field>
        <Field label="Nombre" htmlFor="bc-name" required error={errors.name?.message}>
          <Input id="bc-name" placeholder="Mensualidad" {...register('name')} />
        </Field>
      </div>
      <MoneyField
        control={control}
        name="defaultAmount"
        label="Monto por defecto"
        id="bc-amount"
        hint="Opcional"
        error={errors.defaultAmount?.message}
        info="Si lo defines, se sugerirá como monto al crear una cuenta por cobrar con este concepto. Podrás cambiarlo."
      />
      <Field label="Descripción" htmlFor="bc-desc" error={errors.description?.message}>
        <Textarea id="bc-desc" rows={2} {...register('description')} />
      </Field>
      {isEdit && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" {...register('isActive')} />
          Activo
        </label>
      )}
    </FormDialog>
  )
}

/** Consulta este maestro; vive aquí porque el endpoint es de esta feature. */
function useBillingConceptRows(params: MasterParams): ListResult<BillingConcept> {
  const { orgId } = useCurrentOrg()
  return useBillingConcepts(orgId, params)
}

export function BillingConceptsPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canManage = can('billing_concepts.manage')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BillingConcept | null>(null)

  return (
    <>
      <MasterCrud
        Icon={ReceiptText}
        title="Conceptos de cobro"
        description="Ítems facturables: matrícula, mensualidad, etc."
        canManage={canManage}
        newLabel="Nuevo concepto"
        searchPlaceholder="Buscar concepto…"
        storageKey="nummo:conceptos:filtros"
        entity={['concepto', 'conceptos']}
        useList={useBillingConceptRows}
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
      {orgId && <ConceptDialog orgId={orgId} open={open} onOpenChange={setOpen} editing={editing} />}
    </>
  )
}
