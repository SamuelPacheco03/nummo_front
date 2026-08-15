import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  getGetApiV1OrganizationsOrgIdFinancialAccountsBalancesQueryKey,
  getGetApiV1OrganizationsOrgIdFinancialMovementsQueryKey,
  useGetApiV1OrganizationsOrgIdFinancialAccountsBalances,
  useGetApiV1OrganizationsOrgIdFinancialMovements,
  usePostApiV1OrganizationsOrgIdFinancialAccountsTransfers,
} from '@/api/generated/endpoints/finances/finances'
import type {
  AccountBalance,
  GetApiV1OrganizationsOrgIdFinancialMovementsParams,
  LedgerMovement,
} from '@/api/generated/model'
import type { ListResult } from '@/features/masters/master-crud'

export function useAccountBalances(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdFinancialAccountsBalances(orgId ?? '', {
    query: { enabled: !!orgId, staleTime: 30_000 },
  })
  return { ...query, balances: (query.data?.data ?? []) as AccountBalance[] }
}

export function useMovements(
  orgId: string | undefined,
  params: GetApiV1OrganizationsOrgIdFinancialMovementsParams,
): ListResult<LedgerMovement> {
  const query = useGetApiV1OrganizationsOrgIdFinancialMovements(orgId ?? '', params, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  const page = query.data?.data as
    | { data: LedgerMovement[]; total: number; totalPages: number }
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

export function useCreateTransfer(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdFinancialAccountsTransfers({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({
          queryKey: getGetApiV1OrganizationsOrgIdFinancialAccountsBalancesQueryKey(orgId),
        })
        void qc.invalidateQueries({
          queryKey: getGetApiV1OrganizationsOrgIdFinancialMovementsQueryKey(orgId),
        })
      },
    },
  })
}
