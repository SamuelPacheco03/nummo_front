import {
  useGetApiV1OrganizationsOrgIdReportsCashflow,
  useGetApiV1OrganizationsOrgIdReportsExpensesByCategory,
  useGetApiV1OrganizationsOrgIdReportsIncomeByConcept,
  useGetApiV1OrganizationsOrgIdReportsPayablesSummary,
  useGetApiV1OrganizationsOrgIdReportsReceivablesSummary,
  useGetApiV1OrganizationsOrgIdReportsTopDebtors,
  useGetApiV1OrganizationsOrgIdReportsUpcomingReceivables,
} from '@/api/generated/endpoints/reports/reports'
import type {
  CashflowReport,
  Debtor,
  GetApiV1OrganizationsOrgIdReportsCashflowParams,
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

export function useReceivablesSummary(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdReportsReceivablesSummary(orgId ?? '', enabled(orgId))
  return { ...query, summary: query.data?.data as ReceivablesSummary | undefined }
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
