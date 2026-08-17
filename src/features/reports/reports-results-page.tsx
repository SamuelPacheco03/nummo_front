import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { KpiTile } from '@/components/kpi-tile'
import { Panel } from '@/components/panel'
import { MonthlyFlowChart } from '@/components/monthly-flow-chart'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { formatMoney, todayISODate } from '@/lib/format'
import { ReportBreakdown } from './report-breakdown'
import {
  defaultPeriod,
  useCashflow,
  useCashflowMonthly,
  useExpensesByCategory,
  useIncomeByConcept,
  type Period,
} from './hooks'

function pctChange(current: string | undefined, previous: string | undefined): number | null {
  const c = Number(current)
  const p = Number(previous)
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null
  return ((c - p) / Math.abs(p)) * 100
}

export function ReportsResultsPage() {
  const { orgId, organization } = useCurrentOrg()
  const currency = organization?.defaultCurrency
  const [period, setPeriod] = useState<Period>(() => defaultPeriod())

  const { report: cashflow, isPending } = useCashflow(orgId, period)
  const { items: monthly } = useCashflowMonthly(orgId, 6)
  const { items: income } = useIncomeByConcept(orgId, period)
  const { items: expenses } = useExpensesByCategory(orgId, period)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resultados"
        description="Cuánto entró y salió, y de dónde, en el período que elijas."
      >
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

      {isPending && !cashflow ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile
            label="Ingresos"
            value={formatMoney(cashflow?.current.income ?? '0', currency)}
            delta={{ pct: pctChange(cashflow?.current.income, cashflow?.previous.income), higherIsGood: true }}
          />
          <KpiTile
            label="Egresos"
            value={formatMoney(cashflow?.current.expense ?? '0', currency)}
            delta={{ pct: pctChange(cashflow?.current.expense, cashflow?.previous.expense), higherIsGood: false }}
          />
          <KpiTile
            label="Neto"
            value={formatMoney(cashflow?.current.net ?? '0', currency)}
            delta={{ pct: pctChange(cashflow?.current.net, cashflow?.previous.net), higherIsGood: true }}
          />
        </div>
      )}

      <Panel title="Flujo mensual · últimos 6 meses">
        <MonthlyFlowChart items={monthly} currency={currency} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportBreakdown
          title="Ingresos por concepto"
          nameHeader="Concepto"
          items={income}
          tone="bg-chart-2"
          currency={currency}
          csvFile={`ingresos-por-concepto_${period.from}_a_${period.to}.csv`}
          emptyLabel="Sin ingresos en el período."
        />
        <ReportBreakdown
          title="Egresos por categoría"
          nameHeader="Categoría"
          items={expenses}
          tone="bg-chart-4"
          currency={currency}
          csvFile={`egresos-por-categoria_${period.from}_a_${period.to}.csv`}
          emptyLabel="Sin egresos en el período."
        />
      </div>
    </div>
  )
}
