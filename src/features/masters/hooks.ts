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
  /**
   * `position` es el orden propio de la organización y solo lo aceptan los dos
   * catálogos que lo tienen —conceptos de cobro y categorías de gasto—, donde
   * además es el valor por defecto del contrato. Los otros tres maestros ordenan
   * por `name` y `createdAt`.
   */
  sort?: 'position' | 'name' | 'createdAt'
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

/**
 * Los tres maestros sin orden propio no conocen `position`.
 *
 * No puede llegarles —sus `sortChoices` no lo ofrecen— pero el tipo compartido
 * lo admite, así que se estrecha aquí. Un `as` lo taparía y dejaría pasar el día
 * que alguien sí se lo pase por error; esto manda el orden por defecto del
 * endpoint, que es la respuesta correcta a «ordena por algo que no tengo».
 */
export function namedSort(sort: MasterParams['sort']): 'name' | 'createdAt' | undefined {
  return sort === 'position' ? undefined : sort
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
  const query = useGetApiV1OrganizationsOrgIdPaymentMethods(orgId ?? '', { ...params, sort: namedSort(params.sort) }, {
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
  const query = useGetApiV1OrganizationsOrgIdFinancialAccounts(orgId ?? '', { ...params, sort: namedSort(params.sort) }, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  return normalize<FinancialAccount>(query)
}
/**
 * **¿Hay alguna cuenta que el deudor vaya a ver?**
 *
 * Una consulta aparte de la lista, y con los filtros del endpoint en vez de un
 * recorrido en el cliente. Tres razones, y ninguna es de estilo:
 *
 * 1. **La lista viene paginada.** Mirar `publishInReminders` sobre una página de
 *    cien cuentas da la respuesta equivocada en cuanto la única publicada quede
 *    en la ciento uno.
 * 2. **Una cuenta desactivada no cuenta**, y sin el filtro `isActive` una
 *    publicada pero apagada callaba el aviso mientras los recordatorios ya decían
 *    «comunícate con nosotros».
 * 3. Pide **una fila** y se queda con `total`. La pantalla que la usa necesita un
 *    booleano, no cien cuentas enteras con sus datos de pago dentro.
 *
 * Devuelve `undefined` mientras no se sabe —cargando, o sin permiso para
 * mirar—, que **no es lo mismo que cero**: quien lo use tiene que poder callarse
 * en vez de avisar de un problema que quizá no existe.
 *
 * `previews` son los renglones **tal y como los compone el servidor**, para
 * poder enseñar el «Para pagar:» de verdad. Pide tres —las que caben en un
 * mensaje— y el conteo sigue saliendo de `total`, así que no miente aunque haya
 * veinte.
 */
export function usePublishedAccounts(orgId: string | undefined): {
  count: number | undefined
  previews: string[]
} {
  const query = useGetApiV1OrganizationsOrgIdFinancialAccounts(
    orgId ?? '',
    { page: 1, pageSize: 3, publishInReminders: 'true', isActive: 'true' },
    { query: { enabled: !!orgId } },
  )
  const page = query.data?.data as { total?: number; data?: FinancialAccount[] } | undefined
  return {
    count: query.isSuccess ? (page?.total ?? 0) : undefined,
    previews: (page?.data ?? []).map((a) => a.paymentPreview).filter((x): x is string => !!x),
  }
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
