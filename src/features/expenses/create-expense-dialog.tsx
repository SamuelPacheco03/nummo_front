import { toast } from 'sonner'
import { AccountFormDrawer, type AccountFormCopy } from '@/components/account-form-drawer'
import { useExpenseCategories } from '@/features/masters/hooks'
import { toastApiError } from '@/features/platform/errors'
import { useCreateExpense } from './hooks'

const COPY: AccountFormCopy = {
  title: 'Nuevo gasto',
  description: 'Obligación manual con un proveedor, sin gasto recurrente.',
  contact: 'Proveedor',
  contactMissing: 'Selecciona el proveedor',
  catalog: 'Categoría',
  catalogMissing: 'Selecciona la categoría',
  amountInfo:
    'Valor total del gasto. Escribe solo números: los miles se separan solos (p. ej. 1.200.000).',
}

/**
 * Espejo de `CreateReceivableDialog`: el formulario es el mismo
 * (`AccountFormDrawer`) y aquí solo van las palabras, el catálogo de categorías
 * y la llamada al contrato.
 */
export function CreateExpenseDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateExpense(orgId)
  const { items: categories } = useExpenseCategories(orgId, {
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
      idPrefix="ex"
      copy={COPY}
      catalog={categories}
      isSubmitting={create.isPending}
      onSubmit={async (v) => {
        try {
          await create.mutateAsync({
            orgId,
            data: {
              supplierContactId: v.contactId,
              expenseCategoryId: v.catalogId,
              dueDate: v.dueDate,
              originalAmount: v.originalAmount,
              currency: v.currency ? v.currency.toUpperCase() : undefined,
            },
          })
          toast.success('Gasto creado')
          onOpenChange(false)
        } catch (err) {
          toastApiError(err, 'No se pudo crear')
        }
      }}
    />
  )
}
