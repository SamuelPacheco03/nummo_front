import { useMemo } from 'react'
import { useAgreements } from '@/features/billing/hooks'
import { useExpenseSchedules } from '@/features/expenses/hooks'
import {
  useGetApiV1OrganizationsOrgIdReportsCashflow,
  useGetApiV1OrganizationsOrgIdReportsCashflowMonthly,
  useGetApiV1OrganizationsOrgIdReportsExpensesByCategory,
  useGetApiV1OrganizationsOrgIdReportsIncomeByConcept,
  useGetApiV1OrganizationsOrgIdReportsPayablesAging,
  useGetApiV1OrganizationsOrgIdReportsPayablesSummary,
  useGetApiV1OrganizationsOrgIdReportsReceivablesAging,
  useGetApiV1OrganizationsOrgIdReportsReceivablesSummary,
  useGetApiV1OrganizationsOrgIdReportsTopDebtors,
  useGetApiV1OrganizationsOrgIdReportsUpcomingReceivables,
} from '@/api/generated/endpoints/reports/reports'
import type {
  AgingBucket,
  CashflowReport,
  Debtor,
  GetApiV1OrganizationsOrgIdReportsCashflowParams,
  MonthlyCashflow,
  NamedAmount,
  PayablesSummary,
  ReceivablesSummary,
  UpcomingReceivable,
} from '@/api/generated/model'
import { todayISODate } from '@/lib/format'

/** Rango de fechas (YYYY-MM-DD) para los reportes por período. */
export interface Period {
  from: string
  to: string
}

/** Primer día del mes actual (mismo criterio que el Panel). */
export function monthStart(): string {
  return `${todayISODate().slice(0, 7)}-01`
}

/** Período por defecto: del inicio del mes a hoy. */
export function defaultPeriod(): Period {
  return { from: monthStart(), to: todayISODate() }
}

const enabled = (orgId: string | undefined) => ({ query: { enabled: !!orgId, staleTime: 30_000 } })

export function useCashflow(orgId: string | undefined, period: Period) {
  const params: GetApiV1OrganizationsOrgIdReportsCashflowParams = { from: period.from, to: period.to }
  const query = useGetApiV1OrganizationsOrgIdReportsCashflow(orgId ?? '', params, enabled(orgId))
  return { ...query, report: query.data?.data as CashflowReport | undefined }
}

/** Flujo mensual (ingresos/egresos/neto) de los últimos N meses, más antiguo primero. */
export function useCashflowMonthly(orgId: string | undefined, months = 6) {
  const query = useGetApiV1OrganizationsOrgIdReportsCashflowMonthly(orgId ?? '', { months }, enabled(orgId))
  return { ...query, items: (query.data?.data ?? []) as MonthlyCashflow[] }
}

export function useReceivablesSummary(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdReportsReceivablesSummary(orgId ?? '', enabled(orgId))
  return { ...query, summary: query.data?.data as ReceivablesSummary | undefined }
}

/** Aging de cartera por cobrar (por vencer / 1–30 / 31–60 / +60 días). */
export function useReceivablesAging(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdReportsReceivablesAging(orgId ?? '', enabled(orgId))
  return { ...query, buckets: (query.data?.data ?? []) as AgingBucket[] }
}

/** Aging de cuentas por pagar (por vencer / 1–30 / 31–60 / +60 días). */
export function usePayablesAging(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdReportsPayablesAging(orgId ?? '', enabled(orgId))
  return { ...query, buckets: (query.data?.data ?? []) as AgingBucket[] }
}

export function usePayablesSummary(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdReportsPayablesSummary(orgId ?? '', enabled(orgId))
  return { ...query, summary: query.data?.data as PayablesSummary | undefined }
}

export function useTopDebtors(orgId: string | undefined, limit = 5) {
  const query = useGetApiV1OrganizationsOrgIdReportsTopDebtors(orgId ?? '', { limit }, enabled(orgId))
  return { ...query, debtors: (query.data?.data ?? []) as Debtor[] }
}

export function useUpcomingReceivables(orgId: string | undefined, days = 30, limit = 5) {
  const query = useGetApiV1OrganizationsOrgIdReportsUpcomingReceivables(orgId ?? '', { days, limit }, enabled(orgId))
  return { ...query, upcoming: (query.data?.data ?? []) as UpcomingReceivable[] }
}

export function useIncomeByConcept(orgId: string | undefined, period: Period) {
  const query = useGetApiV1OrganizationsOrgIdReportsIncomeByConcept(orgId ?? '', { from: period.from, to: period.to }, enabled(orgId))
  return { ...query, items: (query.data?.data ?? []) as NamedAmount[] }
}

export function useExpensesByCategory(orgId: string | undefined, period: Period) {
  const query = useGetApiV1OrganizationsOrgIdReportsExpensesByCategory(orgId ?? '', { from: period.from, to: period.to }, enabled(orgId))
  return { ...query, items: (query.data?.data ?? []) as NamedAmount[] }
}

/**
 * Compromiso recurrente mensual configurado: suma de `agreedAmount` de los
 * acuerdos y gastos recurrentes ACTIVOS. Reutilizado por el Panel e Informes.
 */
export function useRecurringCommitment(orgId: string | undefined) {
  const { items: agreements } = useAgreements(orgId, { page: 1, pageSize: 100 })
  const { items: schedules } = useExpenseSchedules(orgId, { page: 1, pageSize: 100 })
  const activeAgreements = useMemo(() => agreements.filter((a) => a.status === 'ACTIVE'), [agreements])
  const activeSchedules = useMemo(() => schedules.filter((s) => s.status === 'ACTIVE'), [schedules])
  const monthlyIncome = activeAgreements.reduce((s, a) => s + (Number(a.agreedAmount) || 0), 0)
  const monthlyExpense = activeSchedules.reduce((s, a) => s + (Number(a.agreedAmount) || 0), 0)
  return {
    activeAgreements,
    activeSchedules,
    monthlyIncome,
    monthlyExpense,
    netMonthly: monthlyIncome - monthlyExpense,
  }
}
