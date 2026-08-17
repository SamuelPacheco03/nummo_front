import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { MonthlyFlowChart } from '@/components/monthly-flow-chart'
import { KpiStrip, KpiTile } from '@/components/kpi-tile'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { NumiAppMark } from '@/features/assistant/numi-avatar'
import { useNumiStore } from '@/features/assistant/numi-store'
import { allowedQuickActions } from '@/features/actions/quick-actions'
import { QuickActionTile } from '@/features/actions/quick-action-tile'
import { useAuth } from '@/features/auth/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useAccountBalances, useMovements } from '@/features/finances/hooks'
import { MOVEMENT_TYPE_LABELS } from '@/features/finances/labels'
import { formatDateHuman, formatMoney, plural } from '@/lib/format'
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
      {/* Icono al tamaño del texto, sin cuadrado tintado detrás: el tono ya lo
          da el color, y repetir la pastilla en cada fila es lo que convierte una
          lista en un catálogo de widgets. */}
      <Icon
        aria-hidden
        className={cn(
          'mt-0.5 size-4 shrink-0',
          tone === 'destructive' ? 'text-destructive' : 'text-warning',
        )}
      />
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
        title={plural(overdueCount, 'cuenta vencida', 'cuentas vencidas')}
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
/** Saluda según la hora local. Es lo único de la pantalla que no es un dato. */
function greeting(name?: string): string {
  const hour = new Date().getHours()
  const part = hour < 6 ? 'Buenas noches' : hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
  return name ? `${part}, ${name.split(' ')[0]}` : part
}

export function DashboardPage() {
  const { orgId, organization, role } = useCurrentOrg()
  const { user } = useAuth()
  const userName = user?.fullName
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
      <PageHeader title={greeting(userName)} description="Así se mueven tus finanzas hoy." />

      {/* 1 · Resumen financiero — las cuatro preguntas de §16, nada más. */}
      <section aria-labelledby="resumen">
        <h2 id="resumen" className="sr-only">
          Resumen financiero
        </h2>
        {kpisLoading ? (
          <Skeleton className="h-[7.5rem]" />
        ) : (
          <KpiStrip
            featured={
              <KpiTile
                featured
                label="Saldo disponible"
                value={formatMoney(available, baseCurrency)}
                sub={
                  otherCurrencies.length > 0
                    ? `+ saldos en ${otherCurrencies.join(', ')}`
                    : plural(balances.length, 'cuenta', 'cuentas')
                }
              />
            }
          >
            {/* Subtítulos cortos: estas tres celdas miden un tercio de pantalla
                en móvil, y una frase larga ahí se corta y no dice nada. */}
            <KpiTile
              label="Por cobrar"
              value={formatMoney(cxc?.totalOutstanding ?? '0', currency)}
              sub={plural((cxc?.pendingCount ?? 0) + (cxc?.partialCount ?? 0), 'abierta', 'abiertas')}
            />
            <KpiTile
              label="Vencido"
              value={formatMoney(cxc?.overdueAmount ?? '0', currency)}
              sub={plural(cxc?.overdueCount ?? 0, 'en mora', 'en mora')}
            />
            <KpiTile
              label="Por pagar"
              value={formatMoney(cxp?.totalOutstanding ?? '0', currency)}
              sub={plural(cxp?.overdueCount ?? 0, 'vencida', 'vencidas')}
            />
          </KpiStrip>
        )}
      </section>

      {/* 2 · Acciones rápidas — lo que se viene a hacer, no a mirar. */}
      {actions.length > 0 && (
        <section aria-labelledby="acciones" className="-mt-2 space-y-2.5">
          <h2 id="acciones" className="sr-only">
            Acciones rápidas
          </h2>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <QuickActionTile key={action.to} action={action} />
            ))}
          </div>
        </section>
      )}

      {/* 3 y 4 · Flujo y atención, lado a lado: en una pantalla ancha, leer la
          tendencia y lo que urge de un mismo vistazo es el trabajo del Panel. */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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
      </div>

      {/* 5 · Insight de Numi — uno, y solo si dice algo. */}
      {insight && (
        <div className="bg-card border-l-brand flex items-start gap-3 rounded-lg border border-l-2 px-5 py-4">
          <NumiAppMark className="mt-0.5 size-5 shrink-0 rounded-[28%]" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm leading-relaxed">{insight.text}</p>
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
                  {isIn ? (
                    <ArrowDownRight aria-hidden className="text-success-strong size-4 shrink-0" />
                  ) : (
                    <ArrowUpRight aria-hidden className="text-destructive size-4 shrink-0" />
                  )}
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
