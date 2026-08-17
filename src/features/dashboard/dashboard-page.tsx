import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { MonthlyFlowChart } from '@/components/monthly-flow-chart'
import { KpiTile } from '@/components/kpi-tile'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { NumiAppMark } from '@/features/assistant/numi-avatar'
import { useNumiStore } from '@/features/assistant/numi-store'
import { allowedQuickActions } from '@/features/actions/quick-actions'
import { QuickActionTile } from '@/features/actions/quick-action-tile'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useAccountBalances, useMovements } from '@/features/finances/hooks'
import { MOVEMENT_TYPE_LABELS } from '@/features/finances/labels'
import { formatDateHuman, formatMoney } from '@/lib/format'
import { balanceByCurrency, buildInsight } from './insights'
import { cn } from '@/lib/utils'
import {
  useCashflowMonthly,
  usePayablesSummary,
  useReceivablesSummary,
  useTopDebtors,
  useUpcomingPayables,
  useUpcomingReceivables,
} from './hooks'

/** Fila de "necesita tu atención": cifra + el porqué + a dónde ir. */
function AttentionRow({
  Icon,
  tone,
  title,
  context,
  amount,
  to,
}: {
  Icon: LucideIcon
  tone: 'destructive' | 'warning'
  title: string
  context: string
  amount: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="hover:bg-secondary focus-visible:ring-ring/50 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-lg',
          tone === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning',
        )}
      >
        <Icon aria-hidden className="size-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        {/* §2.2: la cifra sola no dice nada; el contexto es lo que permite decidir. */}
        <span className="text-muted-foreground block text-xs">{context}</span>
      </span>
      <span className="nums shrink-0 text-sm font-medium">{amount}</span>
    </Link>
  )
}

function AttentionList({
  currency,
  overdueAmount,
  overdueCount,
  topDebtor,
  nextReceivable,
  nextPayable,
}: {
  currency?: string
  overdueAmount?: string
  overdueCount: number
  topDebtor?: string
  nextReceivable?: { receivableId: string; displayName: string; dueDate: string; balance: string }
  nextPayable?: { expenseId: string; displayName: string; dueDate: string; balance: string }
}) {
  const rows: ReactNode[] = []

  if (overdueCount > 0) {
    rows.push(
      <AttentionRow
        key="overdue"
        Icon={AlertTriangle}
        tone="destructive"
        title={`${overdueCount} cuenta(s) vencida(s)`}
        context={topDebtor ? `El mayor saldo es de ${topDebtor}` : 'Requieren gestión de cobro'}
        amount={formatMoney(overdueAmount ?? '0', currency)}
        to="/cartera/cxc"
      />,
    )
  }

  if (nextReceivable) {
    rows.push(
      <AttentionRow
        key="next-in"
        Icon={CalendarClock}
        tone="warning"
        title="Próximo cobro"
        context={`${nextReceivable.displayName} · vence ${formatDateHuman(nextReceivable.dueDate)}`}
        amount={formatMoney(nextReceivable.balance, currency)}
        to={`/cartera/cxc/${nextReceivable.receivableId}`}
      />,
    )
  }

  if (nextPayable) {
    rows.push(
      <AttentionRow
        key="next-out"
        Icon={CalendarClock}
        tone="warning"
        title="Próximo pago"
        context={`${nextPayable.displayName} · vence ${formatDateHuman(nextPayable.dueDate)}`}
        amount={formatMoney(nextPayable.balance, currency)}
        to={`/gastos/cxp/${nextPayable.expenseId}`}
      />,
    )
  }

  // Nada que atender es una buena noticia, y se dice como tal (§27, §73).
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        Nada vencido y nada que venza esta semana. Todo al día.
      </p>
    )
  }

  return <div className="divide-y">{rows}</div>
}

/**
 * Panel de inicio.
 *
 * Responde las seis preguntas de §16 y en ese orden: cuánto tengo, qué puedo
 * hacer, cómo va el flujo, qué requiere atención, qué observa Numi y qué pasó.
 *
 * Deliberadamente **no** es un índice de informes: los desgloses por concepto,
 * el aging, los top deudores y los recurrentes viven en Informes, que es donde
 * se analiza. Duplicarlos aquí era lo que convertía el Panel en el vertedero de
 * widgets que §16 y §77 prohíben.
 */
export function DashboardPage() {
  const { orgId, organization, role } = useCurrentOrg()
  const currency = organization?.defaultCurrency

  const { summary: cxc, isPending: cxcLoading } = useReceivablesSummary(orgId)
  const { summary: cxp, isPending: cxpLoading } = usePayablesSummary(orgId)
  const { balances, isPending: balancesLoading } = useAccountBalances(orgId)
  const { items: monthly } = useCashflowMonthly(orgId, 6)
  const { debtors } = useTopDebtors(orgId, 1)
  const { upcoming } = useUpcomingReceivables(orgId, 7, 1)
  const { upcoming: upcomingPay } = useUpcomingPayables(orgId, 7, 1)
  const { items: movements, isPending: movementsLoading } = useMovements(orgId, {
    page: 1,
    pageSize: 6,
    order: 'desc',
  })

  const accountName = useMemo(() => new Map(balances.map((b) => [b.accountId, b.name])), [balances])
  const totals = useMemo(() => balanceByCurrency(balances), [balances])

  const actions = allowedQuickActions(role)
  const baseCurrency = currency ?? balances[0]?.currency
  const available = baseCurrency ? (totals.get(baseCurrency) ?? 0) : 0
  const otherCurrencies = [...totals.keys()].filter((c) => c !== baseCurrency)

  const openNumi = useNumiStore((s) => s.open)
  const insight = buildInsight({ cxc, cxp, currency })
  const kpisLoading = cxcLoading || cxpLoading || balancesLoading

  return (
    <div className="space-y-8">
      <PageHeader title="Panel" description={organization?.name} />

      {/* 1 · Resumen financiero — las cuatro preguntas de §16, nada más. */}
      <section aria-labelledby="resumen">
        <h2 id="resumen" className="sr-only">
          Resumen financiero
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpisLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <KpiTile
                label="Saldo disponible"
                value={formatMoney(available, baseCurrency)}
                sub={
                  otherCurrencies.length > 0
                    ? `+ saldos en ${otherCurrencies.join(', ')}`
                    : `${balances.length} cuenta(s)`
                }
              />
              <KpiTile
                label="Por cobrar"
                value={formatMoney(cxc?.totalOutstanding ?? '0', currency)}
                sub={`${(cxc?.pendingCount ?? 0) + (cxc?.partialCount ?? 0)} cuenta(s) abiertas`}
              />
              <KpiTile
                label="Vencido"
                value={formatMoney(cxc?.overdueAmount ?? '0', currency)}
                sub={`${cxc?.overdueCount ?? 0} cuenta(s) en mora`}
              />
              <KpiTile
                label="Por pagar"
                value={formatMoney(cxp?.totalOutstanding ?? '0', currency)}
                sub={`${cxp?.overdueCount ?? 0} vencida(s)`}
              />
            </>
          )}
        </div>
      </section>

      {/* 2 · Acciones rápidas — lo que se viene a hacer, no a mirar. */}
      {actions.length > 0 && (
        <section aria-labelledby="acciones" className="space-y-2">
          <h2
            id="acciones"
            className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
          >
            Acciones rápidas
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {actions.map((action) => (
              <QuickActionTile key={action.to} action={action} />
            ))}
          </div>
        </section>
      )}

      {/* 3 · Flujo de caja */}
      <Panel
        title="Flujo · últimos 6 meses"
        action={
          <Link to="/informes/resultados" className="text-brand text-xs hover:underline">
            Ver informe
          </Link>
        }
      >
        <MonthlyFlowChart items={monthly} currency={currency} />
      </Panel>

      {/* 4 · Necesita tu atención */}
      <Panel title="Necesita tu atención">
        <AttentionList
          currency={currency}
          overdueAmount={cxc?.overdueAmount}
          overdueCount={cxc?.overdueCount ?? 0}
          topDebtor={debtors[0]?.displayName}
          nextReceivable={upcoming[0]}
          nextPayable={upcomingPay[0]}
        />
      </Panel>

      {/* 5 · Insight de Numi — uno, y solo si dice algo. */}
      {insight && (
        <div className="bg-card flex items-start gap-3 rounded-lg border p-4">
          <NumiAppMark className="size-8 shrink-0 rounded-[28%]" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm">{insight.text}</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <Link to={insight.to} className="text-brand hover:underline">
                {insight.cta}
              </Link>
              <button
                type="button"
                onClick={openNumi}
                className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                Preguntarle a Numi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6 · Actividad reciente */}
      <Panel
        title="Actividad reciente"
        action={
          <Link to="/caja/movimientos" className="text-brand text-xs hover:underline">
            Ver todos
          </Link>
        }
      >
        {movementsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        ) : movements.length === 0 ? (
          <EmptyState
            Icon={Wallet}
            title="Todavía no hay movimientos"
            description="Cada pago, egreso o transferencia que registres aparecerá aquí."
            className="py-6"
          />
        ) : (
          <ul className="divide-y">
            {movements.map((m) => {
              const isIn = m.direction === 'IN'
              return (
                <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full',
                      isIn
                        ? 'bg-success/10 text-success-strong'
                        : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    {isIn ? (
                      <ArrowDownRight aria-hidden className="size-3.5" />
                    ) : (
                      <ArrowUpRight aria-hidden className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">
                      {MOVEMENT_TYPE_LABELS[m.movementType] ?? m.movementType}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {accountName.get(m.financialAccountId) ?? '—'} ·{' '}
                      {formatDateHuman(m.occurredAt)}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'nums shrink-0 font-medium',
                      isIn ? 'text-success-strong' : 'text-destructive',
                    )}
                  >
                    {isIn ? '+' : '−'} {formatMoney(m.amount)}
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
