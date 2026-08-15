import { useMemo, useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/page-header'
import { KpiTile } from '@/components/kpi-tile'
import { BarList } from '@/components/bar-list'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useContacts } from '@/features/contacts/hooks'
import { useReceivables } from '@/features/receivables/hooks'
import { useExpenses, useExpenseSchedules } from '@/features/expenses/hooks'
import { useAgreements } from '@/features/billing/hooks'
import { RECEIVABLE_STATUS_LABELS, receivableStatusTone } from '@/features/receivables/labels'
import { EXPENSE_STATUS_LABELS, expenseStatusTone } from '@/features/expenses/labels'
import { formatAmount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PendingDuesPanel, type DueRow } from './pending-dues-panel'
import { usePayablesSummary, useReceivablesSummary } from './hooks'

const OPEN = new Set(['PENDING', 'PARTIAL', 'OVERDUE'])
const TOP_N = 6

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export function ReportsPortfolioPage() {
  const { orgId, organization } = useCurrentOrg()
  const currency = organization?.defaultCurrency
  const [tab, setTab] = useState<'cobros' | 'pagos'>('cobros')

  const { summary: cxc } = useReceivablesSummary(orgId)
  const { summary: cxp } = usePayablesSummary(orgId)

  const { contacts } = useContacts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const nameOf = useMemo(() => new Map(contacts.map((c) => [c.id, c.displayName])), [contacts])

  const { items: receivables } = useReceivables(orgId, { page: 1, pageSize: 100, order: 'asc' })
  const { items: expenses } = useExpenses(orgId, { page: 1, pageSize: 100, order: 'asc' })
  const { items: agreements } = useAgreements(orgId, { page: 1, pageSize: 100 })
  const { items: schedules } = useExpenseSchedules(orgId, { page: 1, pageSize: 100 })

  // ── Compromiso recurrente configurado (acuerdos y recurrentes ACTIVOS) ──
  const activeAgreements = useMemo(() => agreements.filter((a) => a.status === 'ACTIVE'), [agreements])
  const activeSchedules = useMemo(() => schedules.filter((s) => s.status === 'ACTIVE'), [schedules])
  const monthlyIncome = activeAgreements.reduce((s, a) => s + (Number(a.agreedAmount) || 0), 0)
  const monthlyExpense = activeSchedules.reduce((s, a) => s + (Number(a.agreedAmount) || 0), 0)
  const netMonthly = monthlyIncome - monthlyExpense

  const incomeBars = useMemo(
    () =>
      activeAgreements
        .map((a) => ({ id: a.id, name: nameOf.get(a.payerContactId) ?? a.name ?? '—', amount: a.agreedAmount }))
        .sort((x, y) => (Number(y.amount) || 0) - (Number(x.amount) || 0)),
    [activeAgreements, nameOf],
  )
  const expenseBars = useMemo(
    () =>
      activeSchedules
        .map((s) => ({ id: s.id, name: nameOf.get(s.supplierContactId) ?? s.name ?? '—', amount: s.agreedAmount }))
        .sort((x, y) => (Number(y.amount) || 0) - (Number(x.amount) || 0)),
    [activeSchedules, nameOf],
  )

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
          <Panel title="Ingresos recurrentes por acuerdo" hint="cada mes">
            <BarList items={incomeBars.slice(0, TOP_N)} tone="bg-chart-2" currency={currency} emptyLabel="Sin acuerdos activos." />
            {incomeBars.length > TOP_N && (
              <p className="pt-2 text-xs text-muted-foreground">y {incomeBars.length - TOP_N} más…</p>
            )}
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
          <Panel title="Egresos recurrentes" hint="cada mes">
            <BarList items={expenseBars.slice(0, TOP_N)} tone="bg-chart-4" currency={currency} emptyLabel="Sin recurrentes activos." />
            {expenseBars.length > TOP_N && (
              <p className="pt-2 text-xs text-muted-foreground">y {expenseBars.length - TOP_N} más…</p>
            )}
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
