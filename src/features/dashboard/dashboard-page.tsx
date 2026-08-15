import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { BarList } from '@/components/bar-list'
import { KpiTile } from '@/components/kpi-tile'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useAccountBalances, useMovements } from '@/features/finances/hooks'
import { MOVEMENT_TYPE_LABELS } from '@/features/finances/labels'
import { formatAmount, formatDateHuman, todayISODate } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  useCashflow,
  useExpensesByCategory,
  useIncomeByConcept,
  usePayablesSummary,
  useReceivablesSummary,
  useTopDebtors,
  useUpcomingReceivables,
  type Period,
} from './hooks'

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function pctChange(current: string | undefined, previous: string | undefined): number | null {
  const c = Number(current)
  const p = Number(previous)
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null
  return ((c - p) / Math.abs(p)) * 100
}

function monthStart(): string {
  const t = todayISODate()
  return `${t.slice(0, 7)}-01`
}

export function DashboardPage() {
  const { orgId, organization } = useCurrentOrg()
  const currency = organization?.defaultCurrency
  const [period, setPeriod] = useState<Period>(() => ({ from: monthStart(), to: todayISODate() }))

  const { report: cashflow, isPending: cashflowPending } = useCashflow(orgId, period)
  const { summary: cxc } = useReceivablesSummary(orgId)
  const { summary: cxp } = usePayablesSummary(orgId)
  const { items: income } = useIncomeByConcept(orgId, period)
  const { items: expenses } = useExpensesByCategory(orgId, period)
  const { balances } = useAccountBalances(orgId)
  const { debtors } = useTopDebtors(orgId, 5)
  const { upcoming } = useUpcomingReceivables(orgId, 30, 5)
  const { items: movements } = useMovements(orgId, { page: 1, pageSize: 8, order: 'desc' })

  const accountName = useMemo(() => new Map(balances.map((b) => [b.accountId, b.name])), [balances])

  return (
    <div className="space-y-6">
      <PageHeader title="Panel" description={organization?.name}>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={period.from}
            max={period.to}
            onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
            className="h-8 w-auto"
            aria-label="Desde"
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="date"
            value={period.to}
            max={todayISODate()}
            onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
            className="h-8 w-auto"
            aria-label="Hasta"
          />
        </div>
      </PageHeader>

      {/* KPIs */}
      {cashflowPending && !cashflow ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiTile
            label="Ingresos"
            value={formatAmount(cashflow?.current.income ?? '0', currency)}
            delta={{ pct: pctChange(cashflow?.current.income, cashflow?.previous.income), higherIsGood: true }}
          />
          <KpiTile
            label="Egresos"
            value={formatAmount(cashflow?.current.expense ?? '0', currency)}
            delta={{ pct: pctChange(cashflow?.current.expense, cashflow?.previous.expense), higherIsGood: false }}
          />
          <KpiTile
            label="Neto"
            value={formatAmount(cashflow?.current.net ?? '0', currency)}
            delta={{ pct: pctChange(cashflow?.current.net, cashflow?.previous.net), higherIsGood: true }}
          />
          <KpiTile
            label="Cartera vencida"
            value={formatAmount(cxc?.overdueAmount ?? '0', currency)}
            sub={cxc ? `${cxc.overdueCount} vencidas` : undefined}
          />
          <KpiTile
            label="Por pagar vencido"
            value={formatAmount(cxp?.overdueAmount ?? '0', currency)}
            sub={cxp ? `${cxp.overdueCount} vencidas` : undefined}
          />
        </div>
      )}

      {/* Gráficas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Ingresos por concepto">
          <BarList items={income} tone="bg-chart-2" currency={currency} />
        </Panel>
        <Panel title="Egresos por categoría">
          <BarList items={expenses} tone="bg-chart-4" currency={currency} />
        </Panel>
      </div>

      {/* Saldos / deudores / próximas */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Saldos por cuenta" action={<Link to="/caja/cuentas" className="text-xs text-brand hover:underline">Ver caja</Link>}>
          {balances.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Sin cuentas.</p>
          ) : (
            <ul className="divide-y">
              {balances.map((b) => (
                <li key={b.accountId} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="truncate">{b.name}</span>
                  <span className={cn('nums font-medium', Number(b.balance) < 0 && 'text-destructive')}>
                    {formatAmount(b.balance, b.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Top deudores">
          {debtors.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nadie en mora. 🎉</p>
          ) : (
            <ul className="divide-y">
              {debtors.map((d) => (
                <li key={d.payerContactId} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <Link to={`/contactos/${d.payerContactId}`} className="truncate hover:underline">
                    {d.displayName}
                  </Link>
                  <span className="nums font-medium text-destructive">{formatAmount(d.overdueBalance, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Próximas a vencer">
          {upcoming.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nada próximo.</p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((u) => (
                <li key={u.receivableId} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <Link to={`/cartera/cxc/${u.receivableId}`} className="min-w-0 flex-1 truncate hover:underline">
                    {u.displayName}
                  </Link>
                  <span className="nums shrink-0 text-xs text-muted-foreground">{formatDateHuman(u.dueDate)}</span>
                  <span className="nums shrink-0 font-medium">{formatAmount(u.balance, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Movimientos recientes */}
      <Panel title="Movimientos recientes" action={<Link to="/caja/movimientos" className="text-xs text-brand hover:underline">Ver todos</Link>}>
        {movements.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Sin movimientos.</p>
        ) : (
          <ul className="divide-y">
            {movements.map((m) => {
              const isIn = m.direction === 'IN'
              return (
                <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className={cn('grid size-6 shrink-0 place-items-center rounded-full', isIn ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                    {isIn ? <ArrowDownRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{MOVEMENT_TYPE_LABELS[m.movementType] ?? m.movementType}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {accountName.get(m.financialAccountId) ?? '—'} · {formatDateHuman(m.occurredAt)}
                    </div>
                  </div>
                  <span className={cn('nums shrink-0 font-medium', isIn ? 'text-success' : 'text-destructive')}>
                    {isIn ? '+' : '−'} {formatAmount(m.amount)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
