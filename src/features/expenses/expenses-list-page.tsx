import { toast } from 'sonner'
import { AccountsList } from '@/components/accounts-list'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { usePayablesSummary } from '@/features/reports/hooks'
import { useExpenseCategories } from '@/features/masters/hooks'
import { toastApiError } from '@/features/platform/errors'
import type { AccountsListCopy, AccountsQuery } from '@/lib/accounts-list'
import type {
  GenerateExpensesResult,
  GetApiV1OrganizationsOrgIdExpensesParams,
  GetApiV1OrganizationsOrgIdExpensesSort,
} from '@/api/generated/model'
import { EXPENSE_STATUS_LABELS, expenseStatus } from './labels'
import { CreateExpenseDialog } from './create-expense-dialog'
import { useExpenses, useGenerateExpenses } from './hooks'

const COPY: AccountsListCopy = {
  title: 'Cuentas por pagar',
  description: 'Lo que le debes a tus proveedores.',
  kpiLabel: 'Por pagar',
  searchPlaceholder: 'Buscar por proveedor…',
  contact: 'Proveedor',
  catalog: 'Categoría',
  catalogFilter: 'Categoría de gasto',
  catalogAll: 'Todas las categorías',
  catalogNone: 'Sin categoría',
  unit: ['cuenta', 'cuentas'],
  entity: 'cuentas por pagar',
  createLabel: 'Nuevo gasto',
  emptyTitle: 'Todavía no tienes cuentas por pagar',
  emptyDescription:
    'Aquí verás lo que debes a tus proveedores. Créalas una a una, o define un gasto recurrente para que Nummo las genere solas cada período.',
  generateHint: 'Crea las cuentas del período desde los gastos recurrentes activos',
  csvFile: 'cuentas-por-pagar',
  errorFallback: 'No se pudieron cargar las cuentas por pagar.',
}

/**
 * Lo que se paga. Es el espejo de cuentas por cobrar: misma pantalla
 * (`AccountsList`), aquí solo van las palabras, las categorías de gasto y su
 * endpoint.
 *
 * **No lleva «causar mora»** —a un proveedor no se le cobran intereses— ni
 * contadores en las fichas de estado, porque `PayablesSummary` solo firma el de
 * vencidas. Las dos ausencias son del dominio y del contrato, no un olvido.
 */
export function ExpensesListPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const { summary, isPending: summaryLoading } = usePayablesSummary(orgId)
  const { items: categories } = useExpenseCategories(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'name',
    order: 'asc',
  })

  const generate = useGenerateExpenses(orgId ?? '')
  const onGenerate = async () => {
    try {
      const res = await generate.mutateAsync({ orgId: orgId ?? '' })
      const r = res.data as GenerateExpensesResult
      toast.success(`${r.created} generadas · ${r.skipped} ya existían`)
    } catch (err) {
      toastApiError(err, 'No se pudieron generar')
    }
  }

  /** Traduce lo que pide la pantalla a los nombres del endpoint de gastos. */
  const useList = (p: AccountsQuery) => {
    const params: GetApiV1OrganizationsOrgIdExpensesParams = {
      page: p.page,
      pageSize: p.pageSize,
      q: p.q,
      sort: p.sort as GetApiV1OrganizationsOrgIdExpensesSort,
      order: p.order,
      displayStatus: p.status as GetApiV1OrganizationsOrgIdExpensesParams['displayStatus'],
      supplierContactId: p.contactId,
      expenseCategoryId: p.catalogId,
      dueAfter: p.dueAfter,
      dueBefore: p.dueBefore,
    }
    const { items, ...rest } = useExpenses(orgId, params)
    return {
      ...rest,
      items: items.map((e) => ({
        id: e.expenseId,
        contactName: e.supplierName,
        catalogId: e.expenseCategoryId,
        dueDate: e.dueDate,
        balance: e.balance,
        currency: e.currency,
        displayStatus: e.displayStatus,
      })),
    }
  }

  return (
    <AccountsList
      copy={COPY}
      storageKey="nummo:cxp:filtros"
      detailTo={(id) => `/gastos/cxp/${id}`}
      catalog={categories}
      statusLabels={EXPENSE_STATUS_LABELS}
      statusOf={expenseStatus}
      summary={summary}
      summaryLoading={summaryLoading}
      canCreate={can('expenses.create')}
      canGenerate={can('expenses.manage')}
      onGenerate={() => void onGenerate()}
      generating={generate.isPending}
      createDialog={(open, onOpenChange) =>
        orgId && <CreateExpenseDialog orgId={orgId} open={open} onOpenChange={onOpenChange} />
      }
      useList={useList}
    />
  )
}
