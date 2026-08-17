import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import {
  getGetApiV1OrganizationsOrgIdExpenseSchedulesIdQueryKey,
  getGetApiV1OrganizationsOrgIdExpenseSchedulesQueryKey,
  getGetApiV1OrganizationsOrgIdExpensesIdQueryKey,
  getGetApiV1OrganizationsOrgIdExpensesQueryKey,
  useGetApiV1OrganizationsOrgIdExpenseSchedules,
  useGetApiV1OrganizationsOrgIdExpenseSchedulesId,
  useGetApiV1OrganizationsOrgIdExpenses,
  useGetApiV1OrganizationsOrgIdExpensesId,
  usePatchApiV1OrganizationsOrgIdExpenseSchedulesId,
  usePostApiV1OrganizationsOrgIdExpenseSchedules,
  usePostApiV1OrganizationsOrgIdExpenseSchedulesIdEnd,
  usePostApiV1OrganizationsOrgIdExpenseSchedulesIdPause,
  usePostApiV1OrganizationsOrgIdExpenseSchedulesIdResume,
  usePostApiV1OrganizationsOrgIdExpenses,
  usePostApiV1OrganizationsOrgIdExpensesGenerate,
  usePostApiV1OrganizationsOrgIdExpensesIdCancel,
  usePostApiV1OrganizationsOrgIdExpensesIdWriteOff,
} from '@/api/generated/endpoints/expenses/expenses'
import {
  getGetApiV1OrganizationsOrgIdDisbursementsIdQueryKey,
  getGetApiV1OrganizationsOrgIdDisbursementsQueryKey,
  useGetApiV1OrganizationsOrgIdDisbursements,
  useGetApiV1OrganizationsOrgIdDisbursementsId,
  usePostApiV1OrganizationsOrgIdDisbursements,
  usePostApiV1OrganizationsOrgIdDisbursementsIdAllocations,
  usePostApiV1OrganizationsOrgIdDisbursementsIdReverse,
} from '@/api/generated/endpoints/disbursements/disbursements'
import type {
  Disbursement,
  DisbursementDetail,
  ExpenseBalance,
  ExpenseDetail,
  ExpenseSchedule,
  GetApiV1OrganizationsOrgIdDisbursementsParams,
  GetApiV1OrganizationsOrgIdExpenseSchedulesParams,
  GetApiV1OrganizationsOrgIdExpensesParams,
} from '@/api/generated/model'
import type { ListResult } from '@/lib/list-result'

function listOf<T>(query: {
  data?: { data?: unknown }
  isPending: boolean
  isError: boolean
  error: unknown
  isFetching: boolean
}): ListResult<T> {
  const page = query.data?.data as { data: T[]; total: number; totalPages: number } | undefined
  return {
    items: page?.data ?? [],
    total: page?.total ?? 0,
    totalPages: page?.totalPages ?? 1,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
  }
}

/* ---------- Expense schedules (gastos recurrentes) ---------- */

export function useExpenseSchedules(
  orgId: string | undefined,
  params: GetApiV1OrganizationsOrgIdExpenseSchedulesParams,
): ListResult<ExpenseSchedule> {
  return listOf<ExpenseSchedule>(
    useGetApiV1OrganizationsOrgIdExpenseSchedules(orgId ?? '', params, {
      query: { enabled: !!orgId, placeholderData: keepPreviousData },
    }),
  )
}

export function useExpenseSchedule(orgId: string | undefined, id: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdExpenseSchedulesId(orgId ?? '', id ?? '', {
    query: { enabled: !!orgId && !!id },
  })
  return { ...query, schedule: query.data?.data as ExpenseSchedule | undefined }
}

function invSchedules(qc: QueryClient, orgId: string, id?: string) {
  void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdExpenseSchedulesQueryKey(orgId) })
  if (id)
    void qc.invalidateQueries({
      queryKey: getGetApiV1OrganizationsOrgIdExpenseSchedulesIdQueryKey(orgId, id),
    })
}

export function useCreateSchedule(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdExpenseSchedules({
    mutation: { onSuccess: () => invSchedules(qc, orgId) },
  })
}
export function useUpdateSchedule(orgId: string) {
  const qc = useQueryClient()
  return usePatchApiV1OrganizationsOrgIdExpenseSchedulesId({
    mutation: { onSuccess: (_r, vars) => invSchedules(qc, orgId, vars.id) },
  })
}
export function usePauseSchedule(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdExpenseSchedulesIdPause({
    mutation: { onSuccess: (_r, vars) => invSchedules(qc, orgId, vars.id) },
  })
}
export function useResumeSchedule(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdExpenseSchedulesIdResume({
    mutation: { onSuccess: (_r, vars) => invSchedules(qc, orgId, vars.id) },
  })
}
export function useEndSchedule(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdExpenseSchedulesIdEnd({
    mutation: { onSuccess: (_r, vars) => invSchedules(qc, orgId, vars.id) },
  })
}

/* ---------- Expenses (gastos / payables) ---------- */

export function useExpenses(
  orgId: string | undefined,
  params: GetApiV1OrganizationsOrgIdExpensesParams,
): ListResult<ExpenseBalance> {
  return listOf<ExpenseBalance>(
    useGetApiV1OrganizationsOrgIdExpenses(orgId ?? '', params, {
      query: { enabled: !!orgId, placeholderData: keepPreviousData },
    }),
  )
}

export function useExpense(orgId: string | undefined, id: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdExpensesId(orgId ?? '', id ?? '', {
    query: { enabled: !!orgId && !!id },
  })
  return { ...query, detail: query.data?.data as ExpenseDetail | undefined }
}

function invExpenses(qc: QueryClient, orgId: string, id?: string) {
  void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdExpensesQueryKey(orgId) })
  if (id)
    void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdExpensesIdQueryKey(orgId, id) })
}

export function useCreateExpense(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdExpenses({
    mutation: { onSuccess: () => invExpenses(qc, orgId) },
  })
}
export function useGenerateExpenses(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdExpensesGenerate({
    mutation: { onSuccess: () => invExpenses(qc, orgId) },
  })
}
export function useCancelExpense(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdExpensesIdCancel({
    mutation: { onSuccess: (_r, vars) => invExpenses(qc, orgId, vars.id) },
  })
}
export function useWriteOffExpense(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdExpensesIdWriteOff({
    mutation: { onSuccess: (_r, vars) => invExpenses(qc, orgId, vars.id) },
  })
}

/* ---------- Disbursements (egresos) ---------- */

export function useDisbursements(
  orgId: string | undefined,
  params: GetApiV1OrganizationsOrgIdDisbursementsParams,
): ListResult<Disbursement> {
  return listOf<Disbursement>(
    useGetApiV1OrganizationsOrgIdDisbursements(orgId ?? '', params, {
      query: { enabled: !!orgId, placeholderData: keepPreviousData },
    }),
  )
}

export function useDisbursement(orgId: string | undefined, id: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdDisbursementsId(orgId ?? '', id ?? '', {
    query: { enabled: !!orgId && !!id },
  })
  return { ...query, detail: query.data?.data as DisbursementDetail | undefined }
}

function invDisb(qc: QueryClient, orgId: string, id?: string) {
  void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdDisbursementsQueryKey(orgId) })
  void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdExpensesQueryKey(orgId) })
  if (id)
    void qc.invalidateQueries({
      queryKey: getGetApiV1OrganizationsOrgIdDisbursementsIdQueryKey(orgId, id),
    })
}

export function useRegisterDisbursement(orgId: string, idempotencyKey: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdDisbursements({
    mutation: { onSuccess: () => invDisb(qc, orgId) },
    request: { headers: { 'Idempotency-Key': idempotencyKey } },
  })
}
export function useApplyDisbursementAllocations(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdDisbursementsIdAllocations({
    mutation: { onSuccess: (_r, vars) => invDisb(qc, orgId, vars.id) },
  })
}
export function useReverseDisbursement(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdDisbursementsIdReverse({
    mutation: { onSuccess: (_r, vars) => invDisb(qc, orgId, vars.id) },
  })
}
