import { toast } from 'sonner'
import { AccountFormDrawer, type AccountFormCopy } from '@/components/account-form-drawer'
import { useBillingConcepts } from '@/features/masters/hooks'
import { toastApiError } from '@/features/platform/errors'
import { useCreateReceivable } from './hooks'

const COPY: AccountFormCopy = {
  title: 'Nueva cuenta por cobrar',
  description: 'Obligación manual (p. ej. matrícula), sin acuerdo recurrente.',
  contact: 'Pagador',
  contactMissing: 'Selecciona el pagador',
  catalog: 'Concepto',
  catalogMissing: 'Selecciona el concepto',
  amountInfo:
    'Valor total de la obligación. Escribe solo números: los miles se separan solos (p. ej. 1.465.775) y la coma es para decimales.',
}

/**
 * Espejo de `CreateExpenseDialog`: el formulario es el mismo
 * (`AccountFormDrawer`) y aquí solo van las palabras, el catálogo de conceptos
 * y la llamada al contrato.
 */
export function CreateReceivableDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateReceivable(orgId)
  const { items: concepts } = useBillingConcepts(orgId, {
    page: 1,
    pageSize: 100,
    isActive: 'true',
    sort: 'name',
    order: 'asc',
  })

  return (
    <AccountFormDrawer
      orgId={orgId}
      open={open}
      onOpenChange={onOpenChange}
      idPrefix="rc"
      copy={COPY}
      catalog={concepts}
      isSubmitting={create.isPending}
      onSubmit={async (v) => {
        try {
          await create.mutateAsync({
            orgId,
            data: {
              payerContactId: v.contactId,
              billingConceptId: v.catalogId,
              dueDate: v.dueDate,
              originalAmount: v.originalAmount,
              currency: v.currency ? v.currency.toUpperCase() : undefined,
            },
          })
          toast.success('Cuenta por cobrar creada')
          onOpenChange(false)
        } catch (err) {
          toastApiError(err, 'No se pudo crear')
        }
      }}
    />
  )
}
