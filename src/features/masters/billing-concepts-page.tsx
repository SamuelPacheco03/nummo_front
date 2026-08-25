import { useEffect, useState } from 'react'
import { ArrowUpDown, ReceiptText } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { CatalogIcon } from './catalog-icon'
import {
  catalogRowIcon,
  CATALOG_DEFAULT_SORT,
  CATALOG_SORT_CHOICES,
  type CatalogIdentity,
} from './catalogs'
import { IdentityField } from './identity-field'
import { CatalogOrderDrawer } from './order-drawer'
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
  {
    header: 'Nombre',
    /*
      El icono va **pegado al nombre**, no en columna propia: aquí no es el
      adorno de una fila densa, es la identidad de lo que se está editando.

      Solo en la tabla (`lg:block`, §11.1.3b regla 2): en la tarjeta de móvil ese
      mismo icono ya es la pastilla de la izquierda, y salía dos veces en la
      misma línea.
    */
    cell: (r) => (
      <span className="flex items-center gap-2">
        <CatalogIcon
          icon={r.icon}
          color={r.color}
          fallback={ReceiptText}
          className="hidden lg:block"
        />
        {r.name}
      </span>
    ),
    card: 'title',
    sortField: 'name',
  },
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

  /*
    El icono y el color no son campos de texto, así que viven en su propio
    estado en vez de en el formulario: pasarlos por RHF obligaría a registrar dos
    controles ocultos para no ganar nada.
  */
  const [identity, setIdentity] = useState<CatalogIdentity>({ icon: null, color: null })

  useEffect(() => {
    if (open) {
      reset({
        code: editing?.code ?? '',
        name: editing?.name ?? '',
        description: editing?.description ?? '',
        defaultAmount: editing?.defaultAmount ?? '',
        isActive: editing?.isActive ?? true,
      })
      setIdentity({ icon: editing?.icon ?? null, color: editing?.color ?? null })
    }
  }, [open, editing, reset])

  const onSubmit = handleSubmit(async (v) => {
    const data = {
      code: nn(v.code),
      name: v.name,
      description: nn(v.description),
      defaultAmount: nn(v.defaultAmount),
      ...identity,
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
      <IdentityField value={identity} onChange={setIdentity} fallback={ReceiptText} />
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
  const [ordering, setOrdering] = useState(false)
  const [editing, setEditing] = useState<BillingConcept | null>(null)
  const update = useUpdateBillingConcept(orgId ?? '')

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
        sortChoices={CATALOG_SORT_CHOICES}
        defaultSort={CATALOG_DEFAULT_SORT}
        rowIcon={(row) => catalogRowIcon(row, ReceiptText)}
        actions={
          canManage && (
            <Button
              variant="outline"
              size="sm"
              aria-label="Ordenar"
              onClick={() => setOrdering(true)}
            >
              <ArrowUpDown aria-hidden className="size-4" />
              <span className="hidden sm:inline">Ordenar</span>
            </Button>
          )
        }
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
      {orgId && (
        <CatalogOrderDrawer
          open={ordering}
          onOpenChange={setOrdering}
          title="Ordenar conceptos"
          fallback={ReceiptText}
          useList={useBillingConceptRows}
          onSave={async (moves) => {
            for (const move of moves) {
              await update.mutateAsync({ orgId, id: move.id, data: { position: move.position } })
            }
          }}
        />
      )}
    </>
  )
}
