import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import {
  getGetApiV1OrganizationsOrgIdPaymentsIdQueryKey,
  getGetApiV1OrganizationsOrgIdPaymentsQueryKey,
  useGetApiV1OrganizationsOrgIdPayments,
  useGetApiV1OrganizationsOrgIdPaymentsId,
  usePostApiV1OrganizationsOrgIdPayments,
  usePostApiV1OrganizationsOrgIdPaymentsIdAllocations,
  usePostApiV1OrganizationsOrgIdPaymentsIdReverse,
} from '@/api/generated/endpoints/payments/payments'
import { getGetApiV1OrganizationsOrgIdReceivablesQueryKey } from '@/api/generated/endpoints/receivables/receivables'
import type {
  GetApiV1OrganizationsOrgIdPaymentsParams,
  PaymentListItem,
  PaymentDetail,
} from '@/api/generated/model'
import type { ListResult } from '@/lib/list-result'

/** Un pago mueve saldos de cartera: invalidamos pagos + receivables. */
function invalidateAll(qc: QueryClient, orgId: string, paymentId?: string) {
  void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdPaymentsQueryKey(orgId) })
  void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdReceivablesQueryKey(orgId) })
  if (paymentId)
    void qc.invalidateQueries({
      queryKey: getGetApiV1OrganizationsOrgIdPaymentsIdQueryKey(orgId, paymentId),
    })
}

export function usePayments(
  orgId: string | undefined,
  params: GetApiV1OrganizationsOrgIdPaymentsParams,
): ListResult<PaymentListItem> {
  const query = useGetApiV1OrganizationsOrgIdPayments(orgId ?? '', params, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  const page = query.data?.data as
    | { data: PaymentListItem[]; total: number; totalPages: number }
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

export function usePayment(orgId: string | undefined, id: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdPaymentsId(orgId ?? '', id ?? '', {
    query: { enabled: !!orgId && !!id },
  })
  return { ...query, detail: query.data?.data as PaymentDetail | undefined }
}

/** Registrar pago. Envía `Idempotency-Key` (un UUID por intento del usuario). */
export function useRegisterPayment(orgId: string, idempotencyKey: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdPayments({
    mutation: { onSuccess: () => invalidateAll(qc, orgId) },
    request: { headers: { 'Idempotency-Key': idempotencyKey } },
  })
}

export function useApplyAllocations(orgId: string, idempotencyKey: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdPaymentsIdAllocations({
    mutation: { onSuccess: (_r, vars) => invalidateAll(qc, orgId, vars.id) },
    request: { headers: { 'Idempotency-Key': idempotencyKey } },
  })
}

export function useReversePayment(orgId: string, idempotencyKey: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdPaymentsIdReverse({
    mutation: { onSuccess: (_r, vars) => invalidateAll(qc, orgId, vars.id) },
    request: { headers: { 'Idempotency-Key': idempotencyKey } },
  })
}
