import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  getGetApiV1OrganizationsOrgIdReceivablesIdAccrualsQueryKey,
  getGetApiV1OrganizationsOrgIdReceivablesIdQueryKey,
  getGetApiV1OrganizationsOrgIdReceivablesQueryKey,
  useDeleteApiV1OrganizationsOrgIdReceivablesIdAdjustmentsAdjustmentId,
  useGetApiV1OrganizationsOrgIdReceivables,
  useGetApiV1OrganizationsOrgIdReceivablesId,
  useGetApiV1OrganizationsOrgIdReceivablesIdAccruals,
  usePostApiV1OrganizationsOrgIdReceivables,
  usePostApiV1OrganizationsOrgIdReceivablesAccrueInterest,
  usePostApiV1OrganizationsOrgIdReceivablesGenerate,
  usePostApiV1OrganizationsOrgIdReceivablesIdAdjustments,
  usePostApiV1OrganizationsOrgIdReceivablesIdCancel,
  usePostApiV1OrganizationsOrgIdReceivablesIdWaivers,
  usePostApiV1OrganizationsOrgIdReceivablesIdWriteOff,
} from '@/api/generated/endpoints/receivables/receivables'
import type {
  GetApiV1OrganizationsOrgIdReceivablesParams,
  InterestAccrual,
  ReceivableBalance,
  ReceivableDetail,
} from '@/api/generated/model'
import { asArray } from '@/lib/list-result'
import type { ListResult } from '@/lib/list-result'

export function useReceivables(
  orgId: string | undefined,
  params: GetApiV1OrganizationsOrgIdReceivablesParams,
): ListResult<ReceivableBalance> {
  const query = useGetApiV1OrganizationsOrgIdReceivables(orgId ?? '', params, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  const page = query.data?.data as
    | { data: ReceivableBalance[]; total: number; totalPages: number }
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

export function useReceivable(orgId: string | undefined, id: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdReceivablesId(orgId ?? '', id ?? '', {
    query: { enabled: !!orgId && !!id },
  })
  return { ...query, detail: query.data?.data as ReceivableDetail | undefined }
}

function invalidate(qc: ReturnType<typeof useQueryClient>, orgId: string, id?: string) {
  void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdReceivablesQueryKey(orgId) })
  if (id)
    void qc.invalidateQueries({
      queryKey: getGetApiV1OrganizationsOrgIdReceivablesIdQueryKey(orgId, id),
    })
}

export function useCreateReceivable(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdReceivables({
    mutation: { onSuccess: () => invalidate(qc, orgId) },
  })
}

export function useGenerateReceivables(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdReceivablesGenerate({
    mutation: { onSuccess: () => invalidate(qc, orgId) },
  })
}

export function useAddAdjustment(orgId: string, idempotencyKey: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdReceivablesIdAdjustments({
    mutation: { onSuccess: (_r, vars) => invalidate(qc, orgId, vars.id) },
    request: { headers: { 'Idempotency-Key': idempotencyKey } },
  })
}

export function useReverseAdjustment(orgId: string) {
  const qc = useQueryClient()
  return useDeleteApiV1OrganizationsOrgIdReceivablesIdAdjustmentsAdjustmentId({
    mutation: { onSuccess: (_r, vars) => invalidate(qc, orgId, vars.id) },
  })
}

export function useCancelReceivable(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdReceivablesIdCancel({
    mutation: { onSuccess: (_r, vars) => invalidate(qc, orgId, vars.id) },
  })
}

export function useWriteOffReceivable(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdReceivablesIdWriteOff({
    mutation: { onSuccess: (_r, vars) => invalidate(qc, orgId, vars.id) },
  })
}

/* ---------- Mora (Fase 5) ---------- */

export function useAccruals(orgId: string | undefined, receivableId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdReceivablesIdAccruals(orgId ?? '', receivableId ?? '', {
    query: { enabled: !!orgId && !!receivableId },
  })
  return { ...query, accruals: asArray<InterestAccrual>(query.data?.data) }
}

/** Causa la mora de toda la org (idempotente); también corre el worker a diario. */
export function useAccrueInterest(orgId: string, idempotencyKey: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdReceivablesAccrueInterest({
    mutation: { onSuccess: () => invalidate(qc, orgId) },
    request: { headers: { 'Idempotency-Key': idempotencyKey } },
  })
}

export function useWaiveInterest(orgId: string, idempotencyKey: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdReceivablesIdWaivers({
    mutation: {
      onSuccess: (_r, vars) => {
        invalidate(qc, orgId, vars.id)
        void qc.invalidateQueries({
          queryKey: getGetApiV1OrganizationsOrgIdReceivablesIdAccrualsQueryKey(orgId, vars.id),
        })
      },
    },
    request: { headers: { 'Idempotency-Key': idempotencyKey } },
  })
}
