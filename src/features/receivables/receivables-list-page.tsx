import { Percent } from 'lucide-react'
import { toast } from 'sonner'
import { AccountsList } from '@/components/accounts-list'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { useReceivablesSummary } from '@/features/reports/hooks'
import { useBillingConcepts } from '@/features/masters/hooks'
import { getErrorMessage } from '@/lib/errors'
import { useIdempotencyKey } from '@/lib/idempotency'
import { formatAmount, plural } from '@/lib/format'
import type { AccountsListCopy, AccountsQuery } from '@/lib/accounts-list'
import type {
  AccrueInterestResult,
  GenerateReceivablesResult,
  GetApiV1OrganizationsOrgIdReceivablesParams,
  GetApiV1OrganizationsOrgIdReceivablesSort,
} from '@/api/generated/model'
import { RECEIVABLE_STATUS_LABELS, receivableStatus } from './labels'
import { CreateReceivableDialog } from './create-receivable-dialog'
import { useAccrueInterest, useGenerateReceivables, useReceivables } from './hooks'

const COPY: AccountsListCopy = {
  title: 'Cuentas por cobrar',
  description: 'Obligaciones de los pagadores.',
  kpiLabel: 'Por cobrar',
  searchPlaceholder: 'Buscar por pagador…',
  contact: 'Pagador',
  catalog: 'Concepto',
  catalogFilter: 'Concepto de cobro',
  catalogAll: 'Todos los conceptos',
  catalogNone: 'Sin concepto',
  unit: ['cuenta', 'cuentas'],
  entity: 'cuentas por cobrar',
  createLabel: 'Nueva cuenta',
  emptyTitle: 'Todavía no tienes cuentas por cobrar',
  emptyDescription:
    'Aquí verás lo que te deben. Créalas una a una, o define un acuerdo para que Nummo las genere solas cada período.',
  generateHint: 'Crea las cuentas del período desde los acuerdos activos',
  csvFile: 'cuentas-por-cobrar',
  errorFallback: 'No se pudieron cargar las cuentas por cobrar.',
}

/**
 * Lo que se cobra. Es el espejo de cuentas por pagar, así que comparte la
 * pantalla (`AccountsList`) y solo aporta lo suyo: las palabras, los conceptos
 * de cobro, su endpoint y **causar mora**, que es lo único que esta cara puede
 * hacer y la otra no — a un proveedor no se le cobran intereses de mora.
 */
export function ReceivablesListPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const { summary, isPending: summaryLoading } = useReceivablesSummary(orgId)
  const { items: concepts } = useBillingConcepts(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'name',
    order: 'asc',
  })

  const generate = useGenerateReceivables(orgId ?? '')
  const onGenerate = async () => {
    try {
      const res = await generate.mutateAsync({ orgId: orgId ?? '' })
      const r = res.data as GenerateReceivablesResult
      toast.success(`${r.created} generadas · ${r.skipped} ya existían`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudieron generar'))
    }
  }

  const idem = useIdempotencyKey()
  const accrue = useAccrueInterest(orgId ?? '', idem.key)
  const onAccrue = async () => {
    try {
      const res = await accrue.mutateAsync({ orgId: orgId ?? '' })
      const r = res.data as AccrueInterestResult
      toast.success(
        `Mora causada: ${plural(r.charged, 'cargo', 'cargos')} · ${formatAmount(r.chargedAmount)}`,
      )
      // Causar mora dos veces a propósito son dos operaciones, no un reintento.
      idem.renew()
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo causar la mora'))
    }
  }

  /** Traduce lo que pide la pantalla a los nombres del endpoint de cartera. */
  const useList = (p: AccountsQuery) => {
    const params: GetApiV1OrganizationsOrgIdReceivablesParams = {
      page: p.page,
      pageSize: p.pageSize,
      q: p.q,
      sort: p.sort as GetApiV1OrganizationsOrgIdReceivablesSort,
      order: p.order,
      displayStatus: p.status as GetApiV1OrganizationsOrgIdReceivablesParams['displayStatus'],
      payerContactId: p.contactId,
      billingConceptId: p.catalogId,
      dueAfter: p.dueAfter,
      dueBefore: p.dueBefore,
    }
    const { items, ...rest } = useReceivables(orgId, params)
    return {
      ...rest,
      items: items.map((r) => ({
        id: r.receivableId,
        contactName: r.payerName,
        catalogId: r.billingConceptId,
        dueDate: r.dueDate,
        balance: r.balance,
        currency: r.currency,
        displayStatus: r.displayStatus,
      })),
    }
  }

  return (
    <AccountsList
      copy={COPY}
      storageKey="nummo:cxc:filtros"
      detailTo={(id) => `/cartera/cxc/${id}`}
      catalog={concepts}
      statusLabels={RECEIVABLE_STATUS_LABELS}
      statusOf={receivableStatus}
      summary={summary}
      summaryLoading={summaryLoading}
      canCreate={can('receivables.create')}
      canGenerate={can('receivables.manage')}
      onGenerate={() => void onGenerate()}
      generating={generate.isPending}
      actions={[
        {
          label: 'Causar mora',
          hint: 'Aplica los intereses a las cuentas vencidas',
          Icon: Percent,
          pending: accrue.isPending,
          onSelect: () => void onAccrue(),
        },
      ]}
      createDialog={(open, onOpenChange) =>
        orgId && <CreateReceivableDialog orgId={orgId} open={open} onOpenChange={onOpenChange} />
      }
      useList={useList}
    />
  )
}
