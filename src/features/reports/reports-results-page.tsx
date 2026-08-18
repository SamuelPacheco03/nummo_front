import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { KpiStrip, KpiTile } from '@/components/kpi-tile'
import { Panel } from '@/components/panel'
import { MonthlyFlowChart } from '@/components/monthly-flow-chart'
import { Chart } from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { formatMoney, pctChange, plural, todayISODate } from '@/lib/format'
import { AgingBucketBucket, type AgingBucket } from '@/api/generated/model'
import { AccountsReport } from './accounts-report'
import { ReportBreakdown } from './report-breakdown'
import {
  defaultPeriod,
  useAccountsReport,
  useCashflow,
  useCashflowMonthly,
  useExpensesByCategory,
  useIncomeByConcept,
  usePayablesAging,
  usePayablesSummary,
  useReceivablesAging,
  useReceivablesSummary,
  useRecurringCommitment,
  type Period,
} from './hooks'

/** Los cuatro tramos, en el orden en que se leen: de lo sano a lo preocupante. */
const BUCKETS: { bucket: AgingBucketBucket; label: string }[] = [
  { bucket: AgingBucketBucket.not_due, label: 'Por vencer' },
  { bucket: AgingBucketBucket.d1_30, label: '1–30 días' },
  { bucket: AgingBucketBucket.d31_60, label: '31–60 días' },
  { bucket: AgingBucketBucket.d60_plus, label: '+60 días' },
]

const amountOf = (buckets: AgingBucket[], bucket: AgingBucketBucket) =>
  Number(buckets.find((b) => b.bucket === bucket)?.amount) || 0

export function ReportsResultsPage() {
  const { orgId, organization } = useCurrentOrg()
  const currency = organization?.defaultCurrency
  const [period, setPeriod] = useState<Period>(() => defaultPeriod())

  const { report: cashflow, isPending } = useCashflow(orgId, period)
  const { items: monthly, isPending: monthlyLoading } = useCashflowMonthly(orgId, 6)
  const { accounts, isPending: accountsLoading } = useAccountsReport(orgId, period)
  const { items: income, isPending: incomeLoading } = useIncomeByConcept(orgId, period)
  const { items: expenses, isPending: expensesLoading } = useExpensesByCategory(orgId, period)

  const { summary: cxc, isPending: cxcLoading } = useReceivablesSummary(orgId)
  const { summary: cxp, isPending: cxpLoading } = usePayablesSummary(orgId)
  const { buckets: cxcAging, isPending: cxcAgingLoading } = useReceivablesAging(orgId)
  const { buckets: cxpAging, isPending: cxpAgingLoading } = usePayablesAging(orgId)
  const { monthlyIncome, monthlyExpense, netMonthly, activeAgreements, activeSchedules, isPending: recurringLoading } =
    useRecurringCommitment(orgId)

  /* Antigüedad de las dos caras en la misma gráfica: el tramo se compara mejor
     contra su espejo que contra sí mismo. */
  const aging = BUCKETS.map(({ bucket, label }) => ({
    tramo: label,
    cobrar: amountOf(cxcAging, bucket),
    pagar: amountOf(cxpAging, bucket),
  }))

  /*
    Entero o nada (§45.1). `!cashflow` mantiene el informe anterior a la vista
    mientras se recalcula al cambiar de fechas: ahí ya hay algo cierto que
    enseñar, y parpadear a esqueleto en cada tecla sería peor.
  */
  const isLoading =
    (isPending ||
      monthlyLoading ||
      incomeLoading ||
      expensesLoading ||
      cxcLoading ||
      cxpLoading ||
      cxcAgingLoading ||
      cxpAgingLoading ||
      accountsLoading ||
      recurringLoading) &&
    !cashflow

  /*
    El período va en su propia fila y no en el `PageHeader`: dos selectores de
    fecha ocupan casi 300 px y ahí dejarían al título un palmo (§11.1: las
    acciones de la cabecera no bajan nunca, así que lo que no cabe no entra).
    Bajo el encabezado ya es la fila de controles de cualquier listado.
  */
  const header = (
    <>
      <PageHeader
        title="Resultados"
        description="Cuánto entró y salió, de dónde, y cómo está la cartera hoy."
        className="mb-3"
      />
      <div className="flex items-center gap-2 sm:justify-end">
        <Input
          type="date"
          value={period.from}
          max={period.to}
          onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
          className="h-8 w-full min-w-0 sm:w-auto"
          aria-label="Desde"
        />
        <span className="text-muted-foreground shrink-0">→</span>
        <Input
          type="date"
          value={period.to}
          max={todayISODate()}
          onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
          className="h-8 w-full min-w-0 sm:w-auto"
          aria-label="Hasta"
        />
      </div>
    </>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <Skeleton className="h-[7.5rem]" />
        <Skeleton className="h-80" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}

      {/*
        1 · El período. **El neto manda** y los otros dos van debajo, como en el
        Panel (§11.1): tres cifras del mismo tamaño obligan a leer las tres para
        saber cómo fue el mes, cuando la respuesta es una sola. Ingresos y
        egresos explican el neto; no compiten con él.
      */}
      <KpiStrip
        featured={
          <KpiTile
            featured
            label="Neto del período"
            value={formatMoney(cashflow?.current?.net ?? '0', currency)}
            delta={{
              pct: pctChange(cashflow?.current?.net, cashflow?.previous?.net),
              higherIsGood: true,
            }}
          />
        }
      >
        <KpiTile
          label="Ingresos"
          value={formatMoney(cashflow?.current?.income ?? '0', currency)}
          delta={{
            pct: pctChange(cashflow?.current?.income, cashflow?.previous?.income),
            higherIsGood: true,
          }}
        />
        <KpiTile
          label="Egresos"
          value={formatMoney(cashflow?.current?.expense ?? '0', currency)}
          delta={{
            pct: pctChange(cashflow?.current?.expense, cashflow?.previous?.expense),
            higherIsGood: false,
          }}
        />
      </KpiStrip>

      {/* 2 · La tendencia, que el período por sí solo no cuenta. */}
      <Panel title="Flujo mensual · últimos 6 meses">
        <MonthlyFlowChart items={monthly} currency={currency} height={280} />
      </Panel>

      {/* 3 · Dónde quedó: qué tiene cada cuenta y qué se movió por ella. */}
      <AccountsReport
        accounts={accounts}
        currency={currency}
        csvFile={`cuentas_${period.from}_${period.to}.csv`}
      />

      {/* 4 · De dónde sale y en qué se va. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ReportBreakdown
          title="Ingresos por concepto"
          nameHeader="Concepto"
          items={income}
          currency={currency}
          csvFile={`ingresos-por-concepto_${period.from}_a_${period.to}.csv`}
          emptyLabel="Sin ingresos en el período."
        />
        <ReportBreakdown
          title="Egresos por categoría"
          nameHeader="Categoría"
          items={expenses}
          currency={currency}
          csvFile={`egresos-por-categoria_${period.from}_a_${period.to}.csv`}
          emptyLabel="Sin egresos en el período."
        />
      </div>

      {/*
        4 · La cartera **hoy**, que no depende del período elegido y por eso lo
        dice el título. Es la pregunta que más se hace después de ver el
        resultado: «vale, ¿y cuánto de esto está en la calle?».
      */}
      <Panel
        title="Cartera hoy · por antigüedad"
        action={
          <Link to="/cartera/cxc" className="text-brand text-xs hover:underline">
            Ver cuentas por cobrar
          </Link>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiTile
              label="Por cobrar"
              value={formatMoney(cxc?.totalOutstanding ?? '0', currency)}
              sub={`${formatMoney(cxc?.overdueAmount ?? '0', currency)} vencido`}
            />
            <KpiTile
              label="Por pagar"
              value={formatMoney(cxp?.totalOutstanding ?? '0', currency)}
              sub={`${formatMoney(cxp?.overdueAmount ?? '0', currency)} vencido`}
            />
          </div>
          <Chart
            data={aging}
            x="tramo"
            currency={currency}
            height={240}
            series={[
              { key: 'cobrar', label: 'Por cobrar', tone: 'chart-2' },
              { key: 'pagar', label: 'Por pagar', tone: 'chart-4' },
            ]}
            empty="No hay cuentas abiertas."
          />
        </div>
      </Panel>

      {/* 5 · Lo que ya está firmado y se repite: la base del mes que viene. */}
      <Panel
        title="Cada mes, según lo configurado"
        action={
          <Link to="/cartera/acuerdos" className="text-brand inline-flex items-center gap-1 text-xs hover:underline">
            Ver acuerdos
            <ArrowRight aria-hidden className="size-3" />
          </Link>
        }
      >
        <KpiStrip
          featured={
            <KpiTile
              featured
              label="Neto esperado"
              value={formatMoney(String(netMonthly), currency)}
              sub="cada mes, si nada cambia"
            />
          }
        >
          <KpiTile
            label="Ingresos recurrentes"
            value={formatMoney(String(monthlyIncome), currency)}
            sub={plural(activeAgreements.length, 'acuerdo activo', 'acuerdos activos')}
          />
          <KpiTile
            label="Gastos recurrentes"
            value={formatMoney(String(monthlyExpense), currency)}
            sub={plural(activeSchedules.length, 'recurrente activo', 'recurrentes activos')}
          />
        </KpiStrip>
      </Panel>
    </div>
  )
}
