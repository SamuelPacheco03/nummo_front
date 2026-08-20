import { RecurringList } from '@/components/recurring-list'
import { useExpenseCategories } from '@/features/masters/hooks'
import { RECURRING_SECTIONS } from '@/features/navigation/sections'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import type {
  RecurringListCopy,
  RecurringListResult,
  RecurringQuery,
} from '@/lib/recurring-list'
import type {
  GetApiV1OrganizationsOrgIdExpenseSchedulesParams,
  GetApiV1OrganizationsOrgIdExpenseSchedulesSort,
} from '@/api/generated/model'
import { RECURRENCE_LABELS, scheduleStatus } from './labels'
import { useExpenseSchedules } from './hooks'

const COPY: RecurringListCopy = {
  title: 'Gastos recurrentes',
  description: 'Pagos periódicos a proveedores por categoría.',
  action: 'Nuevo recurrente',
  party: 'Proveedor',
  searchPlaceholder: 'Buscar recurrente…',
  entity: ['recurrente', 'recurrentes'],
  emptyTitle: 'Todavía no tienes gastos recurrentes',
  emptyDescription:
    'Crea uno para que Nummo genere solo la cuenta por pagar de cada período: arriendo, servicios, nómina…',
  loadError: 'No se pudieron cargar los gastos recurrentes.',
}

/**
 * Traduce lo que pide la lista al contrato de recurrentes y normaliza las filas.
 *
 * El API devuelve el id de la categoría y nada más; quien lo cruza contra el
 * catálogo es la lista, que necesita de él el nombre **y** el icono (§95.19).
 */
function useScheduleRows(params: RecurringQuery): RecurringListResult {
  const { orgId } = useCurrentOrg()
  const query: GetApiV1OrganizationsOrgIdExpenseSchedulesParams = {
    page: params.page,
    pageSize: params.pageSize,
    q: params.q,
    sort: params.sort as GetApiV1OrganizationsOrgIdExpenseSchedulesSort,
    order: params.order,
    supplierContactId: params.contactId,
    status: params.status as GetApiV1OrganizationsOrgIdExpenseSchedulesParams['status'],
  }
  const list = useExpenseSchedules(orgId, query)

  return {
    ...list,
    items: list.items.map((s) => ({
      id: s.id,
      contactId: s.supplierContactId,
      name: s.name,
      catalogId: s.expenseCategoryId,
      recurrenceType: s.recurrenceType,
      dueDay: s.dueDay,
      status: s.status,
      agreedAmount: s.agreedAmount,
      currency: s.currency,
    })),
  }
}

/**
 * Gastos que se repiten. Es el espejo de los acuerdos de cobro, así que comparte
 * la pantalla (`RecurringList`) y solo aporta las palabras y su endpoint.
 */
export function SchedulesListPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const { items: categories } = useExpenseCategories(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'position',
    order: 'asc',
  })

  return (
    <RecurringList
      copy={COPY}
      catalog={categories}
      storageKey="nummo:recurrentes:filtros"
      sections={RECURRING_SECTIONS}
      newTo="/gastos/recurrentes/nuevo"
      detailTo={(id) => `/gastos/recurrentes/${id}`}
      statusOf={scheduleStatus}
      recurrenceLabels={RECURRENCE_LABELS}
      canManage={can('expense_schedules.manage')}
      useList={useScheduleRows}
    />
  )
}
