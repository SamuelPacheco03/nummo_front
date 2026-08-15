import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  getGetApiV1OrganizationsOrgIdBillingAgreementsIdQueryKey,
  getGetApiV1OrganizationsOrgIdBillingAgreementsQueryKey,
  getGetApiV1OrganizationsOrgIdInterestPoliciesQueryKey,
  useGetApiV1OrganizationsOrgIdBillingAgreements,
  useGetApiV1OrganizationsOrgIdBillingAgreementsId,
  useGetApiV1OrganizationsOrgIdInterestPolicies,
  usePatchApiV1OrganizationsOrgIdBillingAgreementsId,
  usePatchApiV1OrganizationsOrgIdInterestPoliciesId,
  usePostApiV1OrganizationsOrgIdBillingAgreements,
  usePostApiV1OrganizationsOrgIdBillingAgreementsIdEnd,
  usePostApiV1OrganizationsOrgIdBillingAgreementsIdPause,
  usePostApiV1OrganizationsOrgIdBillingAgreementsIdResume,
  usePostApiV1OrganizationsOrgIdInterestPolicies,
} from '@/api/generated/endpoints/billing/billing'
import type {
  BillingAgreement,
  GetApiV1OrganizationsOrgIdBillingAgreementsParams,
  InterestPolicy,
} from '@/api/generated/model'
import type { MasterParams } from '@/features/masters/hooks'
import type { ListResult } from '@/features/masters/master-crud'

function pageOf<T>(data: unknown): { data: T[]; total: number; totalPages: number } | undefined {
  return (data as { data?: { data: T[]; total: number; totalPages: number } })?.data
}

/* ---------- Interest policies (config, OWNER/ADMIN) ---------- */

export function useInterestPolicies(
  orgId: string | undefined,
  params: MasterParams,
): ListResult<InterestPolicy> {
  const query = useGetApiV1OrganizationsOrgIdInterestPolicies(orgId ?? '', params, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  const page = pageOf<InterestPolicy>(query.data)
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

export function useCreateInterestPolicy(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdInterestPolicies({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdInterestPoliciesQueryKey(orgId) }),
    },
  })
}

export function useUpdateInterestPolicy(orgId: string) {
  const qc = useQueryClient()
  return usePatchApiV1OrganizationsOrgIdInterestPoliciesId({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdInterestPoliciesQueryKey(orgId) }),
    },
  })
}

/* ---------- Billing agreements (cartera, OWNER/ADMIN/ACCOUNTANT) ---------- */

export function useAgreements(
  orgId: string | undefined,
  params: GetApiV1OrganizationsOrgIdBillingAgreementsParams,
): ListResult<BillingAgreement> {
  const query = useGetApiV1OrganizationsOrgIdBillingAgreements(orgId ?? '', params, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  const page = pageOf<BillingAgreement>(query.data)
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

export function useAgreement(orgId: string | undefined, id: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdBillingAgreementsId(orgId ?? '', id ?? '', {
    query: { enabled: !!orgId && !!id },
  })
  return { ...query, agreement: query.data?.data as BillingAgreement | undefined }
}

function invalidateAgreements(
  qc: ReturnType<typeof useQueryClient>,
  orgId: string,
  id?: string,
) {
  void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdBillingAgreementsQueryKey(orgId) })
  if (id)
    void qc.invalidateQueries({
      queryKey: getGetApiV1OrganizationsOrgIdBillingAgreementsIdQueryKey(orgId, id),
    })
}

export function useCreateAgreement(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdBillingAgreements({
    mutation: { onSuccess: () => invalidateAgreements(qc, orgId) },
  })
}

export function useUpdateAgreement(orgId: string) {
  const qc = useQueryClient()
  return usePatchApiV1OrganizationsOrgIdBillingAgreementsId({
    mutation: { onSuccess: (_res, vars) => invalidateAgreements(qc, orgId, vars.id) },
  })
}

export function usePauseAgreement(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdBillingAgreementsIdPause({
    mutation: { onSuccess: (_res, vars) => invalidateAgreements(qc, orgId, vars.id) },
  })
}

export function useResumeAgreement(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdBillingAgreementsIdResume({
    mutation: { onSuccess: (_res, vars) => invalidateAgreements(qc, orgId, vars.id) },
  })
}

export function useEndAgreement(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdBillingAgreementsIdEnd({
    mutation: { onSuccess: (_res, vars) => invalidateAgreements(qc, orgId, vars.id) },
  })
}
