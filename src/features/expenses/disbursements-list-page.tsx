import { SettlementList } from '@/components/settlement-list'
import type { SortChoice } from '@/components/ui/filter-sheet'
import { LEDGER_SECTIONS } from '@/features/navigation/sections'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import type {
  SettlementListCopy,
  SettlementListResult,
  SettlementQuery,
} from '@/lib/settlement-list'
import type {
  GetApiV1OrganizationsOrgIdDisbursementsParams,
  GetApiV1OrganizationsOrgIdDisbursementsSort,
} from '@/api/generated/model'
import { DISBURSEMENT_STATUSES } from '@/lib/settlement-list'
import { DISBURSEMENT_PURPOSE_LABELS, disbursementStatus } from './labels'
import { useDisbursements } from './hooks'

const COPY: SettlementListCopy = {
  title: 'Egresos',
  description: 'Pagos hechos y su aplicación a los gastos.',
  action: 'Registrar egreso',
  party: 'Proveedor',
  searchPlaceholder: 'Buscar por proveedor o referencia…',
  entity: 'egresos',
  emptyTitle: 'Todavía no has registrado egresos',
  emptyDescription:
    'Cuando pagues algo, regístralo aquí y aplícalo a tus cuentas por pagar. La caja se actualiza sola.',
  loadError: 'No se pudieron cargar los egresos.',
}

const PURPOSES = ['EXPENSE', 'ADVANCE', 'DIRECT_EXPENSE'].map((value) => ({
  value,
  label: DISBURSEMENT_PURPOSE_LABELS[value] ?? value,
}))

/** Cómo llama este contrato a la fecha del movimiento. Ordena la columna «Fecha». */
const DATE_FIELD = 'disbursedAt'

/** Columnas ordenables que acepta el endpoint (contrato: ListDisbursementsQuery). */
const SORT_CHOICES: SortChoice[] = [
  { field: DATE_FIELD, label: 'Fecha', asc: 'Más antiguos', desc: 'Más recientes' },
  { field: 'amount', label: 'Monto', asc: 'Menor primero', desc: 'Mayor primero' },
]

/**
 * Traduce lo que pide la lista a lo que entiende el contrato de egresos, y
 * normaliza las filas.
 *
 * Es un hook porque consulta; vive aquí porque los nombres del endpoint son de
 * esta feature y de ninguna otra.
 */
function useDisbursementRows(params: SettlementQuery): SettlementListResult {
  const { orgId } = useCurrentOrg()
  const query: GetApiV1OrganizationsOrgIdDisbursementsParams = {
    page: params.page,
    pageSize: params.pageSize,
    q: params.q,
    sort: params.sort as GetApiV1OrganizationsOrgIdDisbursementsSort,
    order: params.order,
    supplierContactId: params.contactId,
    status: params.status as GetApiV1OrganizationsOrgIdDisbursementsParams['status'],
    purpose: params.purpose as GetApiV1OrganizationsOrgIdDisbursementsParams['purpose'],
  }
  const list = useDisbursements(orgId, query)
  return {
    ...list,
    items: list.items.map((d) => ({
      id: d.id,
      contactId: d.supplierContactId,
      contactName: d.supplierName ?? "—",
      date: d.disbursedAt,
      amount: d.amount,
      status: d.status,
      purpose: d.purpose,
    })),
  }
}

/**
 * Dinero que salió. Es el espejo de pagos, así que comparte la pantalla
 * (`SettlementList`) y solo aporta lo suyo: las palabras y su endpoint.
 */
export function DisbursementsListPage() {
  const can = useCan()

  return (
    <SettlementList
      copy={COPY}
      storageKey="nummo:egresos:filtros"
      sections={LEDGER_SECTIONS}
      newTo="/gastos/egresos/nuevo"
      detailTo={(id) => `/gastos/egresos/${id}`}
      purposes={PURPOSES}
      purposeLabels={DISBURSEMENT_PURPOSE_LABELS}
      sortChoices={SORT_CHOICES}
      dateField={DATE_FIELD}
      statuses={DISBURSEMENT_STATUSES}
      statusOf={disbursementStatus}
      kpi={{ kind: 'expense', label: 'Pagado este mes', previousLabel: 'El mes pasado' }}
      canRegister={can('disbursements.create')}
      useList={useDisbursementRows}
    />
  )
}
