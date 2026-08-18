import { useMemo } from 'react'
import { useAgreements } from '@/features/billing/hooks'
import { useContacts } from '@/features/contacts/hooks'
import { useExpenseSchedules } from '@/features/expenses/hooks'
import {
  useGetApiV1OrganizationsOrgIdReportsCashflow,
  useGetApiV1OrganizationsOrgIdReportsAccounts,
  useGetApiV1OrganizationsOrgIdReportsCashflowMonthly,
  useGetApiV1OrganizationsOrgIdReportsExpensesByCategory,
  useGetApiV1OrganizationsOrgIdReportsIncomeByConcept,
  useGetApiV1OrganizationsOrgIdReportsPayablesAging,
  useGetApiV1OrganizationsOrgIdReportsPayablesSummary,
  useGetApiV1OrganizationsOrgIdReportsReceivablesAging,
  useGetApiV1OrganizationsOrgIdReportsReceivablesSummary,
  useGetApiV1OrganizationsOrgIdReportsTopDebtors,
  useGetApiV1OrganizationsOrgIdReportsUpcomingPayables,
  useGetApiV1OrganizationsOrgIdReportsUpcomingReceivables,
} from '@/api/generated/endpoints/reports/reports'
import type {
  AccountReport,
  AgingBucket,
  CashflowReport,
  Debtor,
  GetApiV1OrganizationsOrgIdReportsAccountsParams,
  GetApiV1OrganizationsOrgIdReportsCashflowParams,
  MonthlyCashflow,
  NamedAmount,
  PayablesSummary,
  ReceivablesSummary,
  UpcomingPayable,
  UpcomingReceivable,
} from '@/api/generated/model'
import { todayISODate } from '@/lib/format'
import { asArray } from '@/lib/list-result'

/** Rango de fechas (YYYY-MM-DD) para los reportes por período. */
export interface Period {
  from: string
  to: string
}

/** Primer día del mes actual (mismo criterio que el Panel). */
function monthStart(): string {
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
  return { ...query, items: asArray<MonthlyCashflow>(query.data?.data) }
}

/**
 * Cómo está cada cuenta: lo que tiene hoy y lo que se movió en el período.
 *
 * El saldo es de siempre y el movimiento del período — dos preguntas distintas
 * que el backend responde juntas justo para esto. Antes había que sumar el libro
 * de movimientos desde la página visible, que es una cifra que nadie firma (§70).
 */
export function useAccountsReport(orgId: string | undefined, period: Period) {
  const params: GetApiV1OrganizationsOrgIdReportsAccountsParams = {
    from: period.from,
    to: period.to,
  }
  const query = useGetApiV1OrganizationsOrgIdReportsAccounts(orgId ?? '', params, enabled(orgId))
  return { ...query, accounts: asArray<AccountReport>(query.data?.data) }
}

export function useReceivablesSummary(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdReportsReceivablesSummary(orgId ?? '', enabled(orgId))
  return { ...query, summary: query.data?.data as ReceivablesSummary | undefined }
}

/** Aging de cartera por cobrar (por vencer / 1–30 / 31–60 / +60 días). */
export function useReceivablesAging(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdReportsReceivablesAging(orgId ?? '', enabled(orgId))
  return { ...query, buckets: asArray<AgingBucket>(query.data?.data) }
}

/** Aging de cuentas por pagar (por vencer / 1–30 / 31–60 / +60 días). */
export function usePayablesAging(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdReportsPayablesAging(orgId ?? '', enabled(orgId))
  return { ...query, buckets: asArray<AgingBucket>(query.data?.data) }
}

export function usePayablesSummary(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdReportsPayablesSummary(orgId ?? '', enabled(orgId))
  return { ...query, summary: query.data?.data as PayablesSummary | undefined }
}

export function useTopDebtors(orgId: string | undefined, limit = 5) {
  const query = useGetApiV1OrganizationsOrgIdReportsTopDebtors(orgId ?? '', { limit }, enabled(orgId))
  return { ...query, debtors: asArray<Debtor>(query.data?.data) }
}

/** A quién le debes más (proveedores por saldo vencido) — espejo de top-debtors. */
export function useUpcomingReceivables(orgId: string | undefined, days = 30, limit = 5) {
  const query = useGetApiV1OrganizationsOrgIdReportsUpcomingReceivables(orgId ?? '', { days, limit }, enabled(orgId))
  return { ...query, upcoming: asArray<UpcomingReceivable>(query.data?.data) }
}

/** Cuentas por pagar próximas a vencer — espejo de upcoming-receivables. */
export function useUpcomingPayables(orgId: string | undefined, days = 30, limit = 5) {
  const query = useGetApiV1OrganizationsOrgIdReportsUpcomingPayables(orgId ?? '', { days, limit }, enabled(orgId))
  return { ...query, upcoming: asArray<UpcomingPayable>(query.data?.data) }
}

export function useIncomeByConcept(orgId: string | undefined, period: Period) {
  const query = useGetApiV1OrganizationsOrgIdReportsIncomeByConcept(orgId ?? '', { from: period.from, to: period.to }, enabled(orgId))
  return { ...query, items: asArray<NamedAmount>(query.data?.data) }
}

export function useExpensesByCategory(orgId: string | undefined, period: Period) {
  const query = useGetApiV1OrganizationsOrgIdReportsExpensesByCategory(orgId ?? '', { from: period.from, to: period.to }, enabled(orgId))
  return { ...query, items: asArray<NamedAmount>(query.data?.data) }
}

/**
 * Compromiso recurrente mensual configurado: acuerdos y gastos recurrentes
 * ACTIVOS. Expone los totales/mes y las listas ya resueltas con nombre de
 * contacto (`incomeItems`/`expenseItems`, orden desc). Reutilizado por el Panel
 * y por el informe para no duplicar el armado.
 */
export function useRecurringCommitment(orgId: string | undefined) {
  const { items: agreements, isPending: agreementsLoading } = useAgreements(orgId, {
    page: 1,
    pageSize: 100,
  })
  const { items: schedules, isPending: schedulesLoading } = useExpenseSchedules(orgId, {
    page: 1,
    pageSize: 100,
  })
  const { contacts, isPending: contactsLoading } = useContacts(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'name',
    order: 'asc',
  })
  const nameOf = useMemo(() => new Map(contacts.map((c) => [c.id, c.displayName])), [contacts])

  const activeAgreements = useMemo(() => agreements.filter((a) => a.status === 'ACTIVE'), [agreements])
  const activeSchedules = useMemo(() => schedules.filter((s) => s.status === 'ACTIVE'), [schedules])

  const incomeItems = useMemo(
    () =>
      activeAgreements
        .map((a) => ({ id: a.id, name: nameOf.get(a.payerContactId) ?? a.name ?? '—', amount: a.agreedAmount }))
        .sort((x, y) => (Number(y.amount) || 0) - (Number(x.amount) || 0)),
    [activeAgreements, nameOf],
  )
  const expenseItems = useMemo(
    () =>
      activeSchedules
        .map((s) => ({ id: s.id, name: nameOf.get(s.supplierContactId) ?? s.name ?? '—', amount: s.agreedAmount }))
        .sort((x, y) => (Number(y.amount) || 0) - (Number(x.amount) || 0)),
    [activeSchedules, nameOf],
  )

  const monthlyIncome = activeAgreements.reduce((s, a) => s + (Number(a.agreedAmount) || 0), 0)
  const monthlyExpense = activeSchedules.reduce((s, a) => s + (Number(a.agreedAmount) || 0), 0)
  return {
    // Quien lo pinta necesita saber si ya llegó todo: un compromiso mensual de
    // cero mientras carga se lee como «no tienes nada configurado».
    isPending: agreementsLoading || schedulesLoading || contactsLoading,
    activeAgreements,
    activeSchedules,
    incomeItems,
    expenseItems,
    monthlyIncome,
    monthlyExpense,
    netMonthly: monthlyIncome - monthlyExpense,
  }
}
