import { RecurringList } from '@/components/recurring-list'
import { useBillingConcepts } from '@/features/masters/hooks'
import { RECURRING_SECTIONS } from '@/features/navigation/sections'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import type {
  RecurringListCopy,
  RecurringListResult,
  RecurringQuery,
} from '@/lib/recurring-list'
import type {
  GetApiV1OrganizationsOrgIdBillingAgreementsParams,
  GetApiV1OrganizationsOrgIdBillingAgreementsSort,
} from '@/api/generated/model'
import { RECURRENCE_LABELS, agreementStatus } from './labels'
import { useAgreements } from './hooks'

const COPY: RecurringListCopy = {
  title: 'Acuerdos',
  description: 'Cobros recurrentes por concepto y pagador.',
  action: 'Nuevo acuerdo',
  party: 'Pagador',
  searchPlaceholder: 'Buscar acuerdo…',
  entity: ['acuerdo', 'acuerdos'],
  emptyTitle: 'Todavía no tienes acuerdos',
  emptyDescription:
    'Un acuerdo es una plantilla de cobro recurrente: Nummo genera solo la cuenta por cobrar de cada período.',
  loadError: 'No se pudieron cargar los acuerdos.',
}

/**
 * Traduce lo que pide la lista al contrato de acuerdos y normaliza las filas.
 *
 * El API devuelve el id del concepto y nada más; quien lo cruza contra el
 * catálogo es la lista, que necesita de él el nombre **y** el icono (§95.19).
 */
function useAgreementRows(params: RecurringQuery): RecurringListResult {
  const { orgId } = useCurrentOrg()
  const query: GetApiV1OrganizationsOrgIdBillingAgreementsParams = {
    page: params.page,
    pageSize: params.pageSize,
    q: params.q,
    sort: params.sort as GetApiV1OrganizationsOrgIdBillingAgreementsSort,
    order: params.order,
    payerContactId: params.contactId,
    status: params.status as GetApiV1OrganizationsOrgIdBillingAgreementsParams['status'],
  }
  const list = useAgreements(orgId, query)

  return {
    ...list,
    items: list.items.map((a) => ({
      id: a.id,
      contactId: a.payerContactId,
      name: a.name,
      catalogId: a.billingConceptId,
      recurrenceType: a.recurrenceType,
      dueDay: a.dueDay,
      status: a.status,
      agreedAmount: a.agreedAmount,
      currency: a.currency,
    })),
  }
}

/**
 * Cobros que se repiten. Es el espejo de los gastos recurrentes, así que
 * comparte la pantalla (`RecurringList`) y solo aporta las palabras y su
 * endpoint.
 */
export function AgreementsListPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const { items: concepts } = useBillingConcepts(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'position',
    order: 'asc',
  })

  return (
    <RecurringList
      copy={COPY}
      catalog={concepts}
      storageKey="nummo:acuerdos:filtros"
      sections={RECURRING_SECTIONS}
      newTo="/cartera/acuerdos/nuevo"
      detailTo={(id) => `/cartera/acuerdos/${id}`}
      statusOf={agreementStatus}
      recurrenceLabels={RECURRENCE_LABELS}
      canManage={can('agreements.manage')}
      useList={useAgreementRows}
    />
  )
}
