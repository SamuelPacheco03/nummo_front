import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  getGetApiV1OrganizationsOrgIdBillingConceptsQueryKey,
  useGetApiV1OrganizationsOrgIdBillingConcepts,
  usePatchApiV1OrganizationsOrgIdBillingConceptsId,
  usePostApiV1OrganizationsOrgIdBillingConcepts,
} from '@/api/generated/endpoints/billing/billing'
import {
  getGetApiV1OrganizationsOrgIdExpenseCategoriesQueryKey,
  useGetApiV1OrganizationsOrgIdExpenseCategories,
  usePatchApiV1OrganizationsOrgIdExpenseCategoriesId,
  usePostApiV1OrganizationsOrgIdExpenseCategories,
} from '@/api/generated/endpoints/expenses/expenses'
import {
  getGetApiV1OrganizationsOrgIdFinancialAccountsQueryKey,
  getGetApiV1OrganizationsOrgIdPaymentMethodsQueryKey,
  useGetApiV1OrganizationsOrgIdFinancialAccounts,
  useGetApiV1OrganizationsOrgIdPaymentMethods,
  usePatchApiV1OrganizationsOrgIdFinancialAccountsId,
  usePatchApiV1OrganizationsOrgIdPaymentMethodsId,
  usePostApiV1OrganizationsOrgIdFinancialAccounts,
  usePostApiV1OrganizationsOrgIdPaymentMethods,
} from '@/api/generated/endpoints/finances/finances'
import type {
  BillingConcept,
  ExpenseCategory,
  FinancialAccount,
  PaymentMethod,
} from '@/api/generated/model'

/** Filtros/paginación comunes a los listados de maestros (server-side). */
export interface MasterParams {
  page: number
  pageSize: number
  q?: string
  isActive?: 'true' | 'false'
  sort?: 'name' | 'createdAt'
  order?: 'asc' | 'desc'
}

interface ListResult<T> {
  items: T[]
  total: number
  totalPages: number
  isPending: boolean
  isError: boolean
  error: unknown
  isFetching: boolean
}

function normalize<T>(query: {
  data?: { data?: unknown }
  isPending: boolean
  isError: boolean
  error: unknown
  isFetching: boolean
}): ListResult<T> {
  // En éxito, data.data es el envoltorio paginado; el caso de error va a query.error.
  const page = query.data?.data as
    | { data: T[]; total: number; totalPages: number }
    | undefined
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

/* ---------- Billing concepts ---------- */
export function useBillingConcepts(orgId: string | undefined, params: MasterParams): ListResult<BillingConcept> {
  const query = useGetApiV1OrganizationsOrgIdBillingConcepts(orgId ?? '', params, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  return normalize<BillingConcept>(query)
}
export function useCreateBillingConcept(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdBillingConcepts({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdBillingConceptsQueryKey(orgId) }),
    },
  })
}
export function useUpdateBillingConcept(orgId: string) {
  const qc = useQueryClient()
  return usePatchApiV1OrganizationsOrgIdBillingConceptsId({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdBillingConceptsQueryKey(orgId) }),
    },
  })
}

/* ---------- Expense categories ---------- */
export function useExpenseCategories(orgId: string | undefined, params: MasterParams): ListResult<ExpenseCategory> {
  const query = useGetApiV1OrganizationsOrgIdExpenseCategories(orgId ?? '', params, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  return normalize<ExpenseCategory>(query)
}
export function useCreateExpenseCategory(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdExpenseCategories({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdExpenseCategoriesQueryKey(orgId) }),
    },
  })
}
export function useUpdateExpenseCategory(orgId: string) {
  const qc = useQueryClient()
  return usePatchApiV1OrganizationsOrgIdExpenseCategoriesId({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdExpenseCategoriesQueryKey(orgId) }),
    },
  })
}

/* ---------- Payment methods ---------- */
export function usePaymentMethods(orgId: string | undefined, params: MasterParams): ListResult<PaymentMethod> {
  const query = useGetApiV1OrganizationsOrgIdPaymentMethods(orgId ?? '', params, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  return normalize<PaymentMethod>(query)
}
export function useCreatePaymentMethod(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdPaymentMethods({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdPaymentMethodsQueryKey(orgId) }),
    },
  })
}
export function useUpdatePaymentMethod(orgId: string) {
  const qc = useQueryClient()
  return usePatchApiV1OrganizationsOrgIdPaymentMethodsId({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdPaymentMethodsQueryKey(orgId) }),
    },
  })
}

/* ---------- Financial accounts ---------- */
export function useFinancialAccounts(orgId: string | undefined, params: MasterParams): ListResult<FinancialAccount> {
  const query = useGetApiV1OrganizationsOrgIdFinancialAccounts(orgId ?? '', params, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  return normalize<FinancialAccount>(query)
}
export function useCreateFinancialAccount(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdFinancialAccounts({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdFinancialAccountsQueryKey(orgId) }),
    },
  })
}
export function useUpdateFinancialAccount(orgId: string) {
  const qc = useQueryClient()
  return usePatchApiV1OrganizationsOrgIdFinancialAccountsId({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdFinancialAccountsQueryKey(orgId) }),
    },
  })
}
