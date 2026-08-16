import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { KpiTile } from '@/components/kpi-tile'
import { BarList } from '@/components/bar-list'
import { AgingChart } from '@/components/aging-chart'
import { ContactAmountList } from '@/components/contact-amount-list'
import { UpcomingList } from '@/components/upcoming-list'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useContacts } from '@/features/contacts/hooks'
import { useReceivables } from '@/features/receivables/hooks'
import { useExpenses } from '@/features/expenses/hooks'
import { RECEIVABLE_STATUS_LABELS, receivableStatusTone } from '@/features/receivables/labels'
import { EXPENSE_STATUS_LABELS, expenseStatusTone } from '@/features/expenses/labels'
import { formatAmount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PendingDuesPanel, type DueRow } from './pending-dues-panel'
import {
  usePayablesAging,
  usePayablesSummary,
  useReceivablesAging,
  useReceivablesSummary,
  useRecurringCommitment,
  useTopCreditors,
  useTopDebtors,
  useUpcomingPayables,
  useUpcomingReceivables,
} from './hooks'

const OPEN = new Set(['PENDING', 'PARTIAL', 'OVERDUE'])
const TOP_N = 6

/** Etiqueta compacta "cada mes" para la cabecera de los paneles de recurrentes. */
const monthlyHint = <span className="text-xs text-muted-foreground">cada mes</span>

/** BarList de recurrentes con "Ver N más / Ver menos" que expande la lista de verdad. */
function RecurringBars({
  items,
  tone,
  currency,
  emptyLabel,
}: {
  items: { id: string; name: string; amount: string }[]
  tone: string
  currency?: string
  emptyLabel: string
}) {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? items : items.slice(0, TOP_N)
  return (
    <div className="space-y-3">
      <BarList items={shown} tone={tone} currency={currency} emptyLabel={emptyLabel} />
      {items.length > TOP_N && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs font-medium text-brand hover:underline"
        >
          {showAll ? 'Ver menos' : `Ver ${items.length - TOP_N} más`}
        </button>
      )}
    </div>
  )
}

export function ReportsPortfolioPage() {
  const { orgId, organization } = useCurrentOrg()
  const currency = organization?.defaultCurrency
  const [tab, setTab] = useState<'cobros' | 'pagos'>('cobros')

  const { summary: cxc } = useReceivablesSummary(orgId)
  const { summary: cxp } = usePayablesSummary(orgId)
  const { buckets: cxcAging } = useReceivablesAging(orgId)
  const { buckets: cxpAging } = usePayablesAging(orgId)
  const { debtors } = useTopDebtors(orgId, 5)
  const { creditors } = useTopCreditors(orgId, 5)
  const { upcoming: upcomingCxc } = useUpcomingReceivables(orgId, 30, 5)
  const { upcoming: upcomingCxp } = useUpcomingPayables(orgId, 30, 5)

  const { contacts } = useContacts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const nameOf = useMemo(() => new Map(contacts.map((c) => [c.id, c.displayName])), [contacts])

  const { items: receivables } = useReceivables(orgId, { page: 1, pageSize: 100, order: 'asc' })
  const { items: expenses } = useExpenses(orgId, { page: 1, pageSize: 100, order: 'asc' })

  // ── Compromiso recurrente configurado (acuerdos y recurrentes ACTIVOS) ──
  const { activeAgreements, activeSchedules, incomeItems, expenseItems, monthlyIncome, monthlyExpense, netMonthly } =
    useRecurringCommitment(orgId)

  // ── Pendiente ahora (cuentas abiertas por cobrar / por pagar) ──
  const receivableRows: DueRow[] = useMemo(
    () =>
      receivables
        .filter((r) => OPEN.has(r.displayStatus) && Number(r.balance) > 0)
        .map((r) => ({
          id: r.receivableId,
          name: nameOf.get(r.payerContactId) ?? '—',
          dueDate: r.dueDate,
          balance: r.balance,
          currency: r.currency,
          isOverdue: r.displayStatus === 'OVERDUE',
          statusLabel: RECEIVABLE_STATUS_LABELS[r.displayStatus] ?? r.displayStatus,
          tone: receivableStatusTone(r.displayStatus),
          href: `/cartera/cxc/${r.receivableId}`,
        })),
    [receivables, nameOf],
  )
  const expenseRows: DueRow[] = useMemo(
    () =>
      expenses
        .filter((e) => OPEN.has(e.displayStatus) && Number(e.balance) > 0)
        .map((e) => ({
          id: e.expenseId,
          name: nameOf.get(e.supplierContactId) ?? '—',
          dueDate: e.dueDate,
          balance: e.balance,
          currency: e.currency,
          isOverdue: e.displayStatus === 'OVERDUE',
          statusLabel: EXPENSE_STATUS_LABELS[e.displayStatus] ?? e.displayStatus,
          tone: expenseStatusTone(e.displayStatus),
          href: `/gastos/cxp/${e.expenseId}`,
        })),
    [expenses, nameOf],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cobros y pagos"
        description="Lo que hay que cobrar y pagar, y lo que esperas cada mes según lo configurado."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          aria-label="Ver cobros o pagos"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'cobros', label: 'Cobros' },
            { value: 'pagos', label: 'Pagos' },
          ]}
        />
        <span className="text-sm text-muted-foreground">
          Neto recurrente:{' '}
          <span className={cn('nums font-medium', netMonthly < 0 ? 'text-destructive' : 'text-foreground')}>
            {formatAmount(netMonthly.toFixed(2), currency)}/mes
          </span>
        </span>
      </div>

      {tab === 'cobros' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiTile
              label="Por cobrar"
              value={formatAmount(cxc?.totalOutstanding ?? '0', currency)}
              sub={`${cxc?.pendingCount ?? 0} pend. · ${cxc?.partialCount ?? 0} parc.`}
            />
            <KpiTile
              label="Cartera vencida"
              value={formatAmount(cxc?.overdueAmount ?? '0', currency)}
              sub={`${cxc?.overdueCount ?? 0} vencidas`}
            />
            <KpiTile
              label="Ingresos/mes esperados"
              value={formatAmount(monthlyIncome.toFixed(2), currency)}
              sub={`${activeAgreements.length} acuerdo(s) activo(s)`}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel title="Top deudores">
              <ContactAmountList
                items={debtors.map((d) => ({ id: d.payerContactId, name: d.displayName, amount: d.overdueBalance }))}
                currency={currency}
                emptyLabel="Nadie en mora. 🎉"
              />
            </Panel>
            <Panel title="Próximas a vencer">
              <UpcomingList
                items={upcomingCxc.map((u) => ({
                  id: u.receivableId,
                  href: `/cartera/cxc/${u.receivableId}`,
                  name: u.displayName,
                  dueDate: u.dueDate,
                  amount: u.balance,
                }))}
                currency={currency}
                emptyLabel="Nada próximo."
              />
            </Panel>
          </div>
          <Panel title="Antigüedad de la cartera">
            <AgingChart buckets={cxcAging} currency={currency} emptyLabel="No hay cartera abierta. 🎉" />
          </Panel>
          <Panel title="Ingresos recurrentes por acuerdo" action={monthlyHint}>
            <RecurringBars items={incomeItems} tone="bg-chart-2" currency={currency} emptyLabel="Sin acuerdos activos." />
          </Panel>
          <PendingDuesPanel
            title="Cobros pendientes"
            nameHeader="Pagador"
            rows={receivableRows}
            csvFile="cobros-pendientes.csv"
            currency={currency}
            emptyLabel="No hay cuentas por cobrar abiertas. 🎉"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiTile label="Por pagar" value={formatAmount(cxp?.totalOutstanding ?? '0', currency)} />
            <KpiTile
              label="Por pagar vencido"
              value={formatAmount(cxp?.overdueAmount ?? '0', currency)}
              sub={`${cxp?.overdueCount ?? 0} vencidas`}
            />
            <KpiTile
              label="Egresos/mes esperados"
              value={formatAmount(monthlyExpense.toFixed(2), currency)}
              sub={`${activeSchedules.length} recurrente(s) activo(s)`}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel title="Top acreedores">
              <ContactAmountList
                items={creditors.map((c) => ({ id: c.supplierContactId, name: c.displayName, amount: c.overdueBalance }))}
                currency={currency}
                emptyLabel="Nada por pagar vencido. 🎉"
              />
            </Panel>
            <Panel title="Próximos pagos">
              <UpcomingList
                items={upcomingCxp.map((u) => ({
                  id: u.expenseId,
                  href: `/gastos/cxp/${u.expenseId}`,
                  name: u.displayName,
                  dueDate: u.dueDate,
                  amount: u.balance,
                }))}
                currency={currency}
                emptyLabel="Nada próximo."
              />
            </Panel>
          </div>
          <Panel title="Antigüedad de lo que debes">
            <AgingChart buckets={cxpAging} currency={currency} emptyLabel="No tienes cuentas por pagar. 🎉" />
          </Panel>
          <Panel title="Egresos recurrentes" action={monthlyHint}>
            <RecurringBars items={expenseItems} tone="bg-chart-4" currency={currency} emptyLabel="Sin recurrentes activos." />
          </Panel>
          <PendingDuesPanel
            title="Pagos pendientes"
            nameHeader="Proveedor"
            rows={expenseRows}
            csvFile="pagos-pendientes.csv"
            currency={currency}
            emptyLabel="No hay cuentas por pagar abiertas. 🎉"
          />
        </div>
      )}
    </div>
  )
}
