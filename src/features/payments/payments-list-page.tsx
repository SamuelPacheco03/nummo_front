import { SettlementList } from '@/components/settlement-list'
import { useBillingConcepts } from '@/features/masters/hooks'
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
  GetApiV1OrganizationsOrgIdPaymentsParams,
  GetApiV1OrganizationsOrgIdPaymentsSort,
} from '@/api/generated/model'
import { PAYMENT_STATUSES } from '@/lib/settlement-list'
import { PAYMENT_PURPOSE_ICONS, PAYMENT_PURPOSE_LABELS, paymentStatus } from './labels'
import { usePayments } from './hooks'

const COPY: SettlementListCopy = {
  title: 'Pagos',
  description: 'Ingresos recibidos y su aplicación a la cartera.',
  action: 'Registrar pago',
  party: 'Pagador',
  searchPlaceholder: 'Buscar por pagador o referencia…',
  entity: 'pagos',
  emptyTitle: 'Todavía no has registrado pagos',
  emptyDescription:
    'Cuando alguien te pague, regístralo aquí y aplícalo a sus cuentas por cobrar. La caja se actualiza sola.',
  loadError: 'No se pudieron cargar los pagos.',
}

const PURPOSES = ['RECEIVABLE', 'ADVANCE', 'DIRECT_INCOME'].map((value) => ({
  value,
  label: PAYMENT_PURPOSE_LABELS[value] ?? value,
}))

/** Cómo llama este contrato a la fecha del movimiento. Ordena la columna «Fecha». */
const DATE_FIELD = 'receivedAt'

/** Columnas ordenables que acepta el endpoint (contrato: ListPaymentsQuery). */
const SORT_CHOICES: SortChoice[] = [
  { field: DATE_FIELD, label: 'Fecha', asc: 'Más antiguos', desc: 'Más recientes' },
  { field: 'amount', label: 'Monto', asc: 'Menor primero', desc: 'Mayor primero' },
]

/**
 * Traduce lo que pide la lista a lo que entiende el contrato de pagos, y
 * normaliza las filas.
 *
 * Es un hook porque consulta; vive aquí porque los nombres del endpoint son de
 * esta feature y de ninguna otra.
 */
function usePaymentRows(params: SettlementQuery): SettlementListResult {
  const { orgId } = useCurrentOrg()
  const query: GetApiV1OrganizationsOrgIdPaymentsParams = {
    page: params.page,
    pageSize: params.pageSize,
    q: params.q,
    sort: params.sort as GetApiV1OrganizationsOrgIdPaymentsSort,
    order: params.order,
    payerContactId: params.contactId,
    status: params.status as GetApiV1OrganizationsOrgIdPaymentsParams['status'],
    purpose: params.purpose as GetApiV1OrganizationsOrgIdPaymentsParams['purpose'],
  }
  const list = usePayments(orgId, query)
  return {
    ...list,
    items: list.items.map((p) => ({
      id: p.id,
      contactId: p.payerContactId,
      contactName: p.payerName ?? "—",
      date: p.receivedAt,
      amount: p.amount,
      status: p.status,
      purpose: p.purpose,
      catalogId: p.directBillingConceptId,
    })),
  }
}

/**
 * Dinero que entró. Es el espejo de egresos, así que comparte la pantalla
 * (`SettlementList`) y solo aporta lo suyo: las palabras y su endpoint.
 */
export function PaymentsListPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const { items: concepts } = useBillingConcepts(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'position',
    order: 'asc',
  })

  return (
    <SettlementList
      copy={COPY}
      catalog={concepts}
      storageKey="nummo:pagos:filtros"
      sections={LEDGER_SECTIONS}
      newTo="/cartera/pagos/nuevo"
      detailTo={(id) => `/cartera/pagos/${id}`}
      purposes={PURPOSES}
      purposeLabels={PAYMENT_PURPOSE_LABELS}
      purposeIcons={PAYMENT_PURPOSE_ICONS}
      sortChoices={SORT_CHOICES}
      dateField={DATE_FIELD}
      statuses={PAYMENT_STATUSES}
      statusOf={paymentStatus}
      kpi={{ kind: 'income', label: 'Cobrado este mes', previousLabel: 'El mes pasado' }}
      canRegister={can('payments.create')}
      useList={usePaymentRows}
    />
  )
}
