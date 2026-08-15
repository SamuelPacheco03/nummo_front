import { useQueryClient } from '@tanstack/react-query'
import {
  getGetApiV1OrganizationsOrgIdBranchesQueryKey,
  getGetApiV1OrganizationsOrgIdMembersQueryKey,
  getGetApiV1OrganizationsOrgIdQueryKey,
  getGetApiV1OrganizationsOrgIdSettingsQueryKey,
  getGetApiV1OrganizationsQueryKey,
  useDeleteApiV1OrganizationsOrgIdMembersMembershipId,
  useGetApiV1OrganizationsOrgId,
  useGetApiV1OrganizationsOrgIdBranches,
  useGetApiV1OrganizationsOrgIdMembers,
  useGetApiV1OrganizationsOrgIdSettings,
  usePatchApiV1OrganizationsOrgId,
  usePatchApiV1OrganizationsOrgIdBranchesBranchId,
  usePatchApiV1OrganizationsOrgIdMembersMembershipId,
  usePostApiV1OrganizationsOrgIdBranches,
  usePostApiV1OrganizationsOrgIdMembers,
  usePutApiV1OrganizationsOrgIdSettings,
} from '@/api/generated/endpoints/organizations/organizations'
import type { Branch, Member, Organization, OrganizationSettings } from '@/api/generated/model'

/* ---------- Queries ---------- */

export function useOrgDetail(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgId(orgId ?? '', { query: { enabled: !!orgId } })
  return { ...query, organization: query.data?.data as Organization | undefined }
}

export function useBranches(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdBranches(orgId ?? '', { query: { enabled: !!orgId } })
  return { ...query, branches: (query.data?.data ?? []) as Branch[] }
}

export function useMembers(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdMembers(orgId ?? '', { query: { enabled: !!orgId } })
  return { ...query, members: (query.data?.data ?? []) as Member[] }
}

export function useOrgSettings(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdSettings(orgId ?? '', { query: { enabled: !!orgId } })
  return { ...query, settings: query.data?.data as OrganizationSettings | undefined }
}

/* ---------- Mutations ---------- */

export function useUpdateOrg(orgId: string) {
  const qc = useQueryClient()
  return usePatchApiV1OrganizationsOrgId({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdQueryKey(orgId) })
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsQueryKey() })
      },
    },
  })
}

export function useCreateBranch(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdBranches({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdBranchesQueryKey(orgId) }),
    },
  })
}

export function useUpdateBranch(orgId: string) {
  const qc = useQueryClient()
  return usePatchApiV1OrganizationsOrgIdBranchesBranchId({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdBranchesQueryKey(orgId) }),
    },
  })
}

export function useAddMember(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdMembers({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdMembersQueryKey(orgId) }),
    },
  })
}

export function useUpdateMemberRole(orgId: string) {
  const qc = useQueryClient()
  return usePatchApiV1OrganizationsOrgIdMembersMembershipId({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdMembersQueryKey(orgId) }),
    },
  })
}

export function useRemoveMember(orgId: string) {
  const qc = useQueryClient()
  return useDeleteApiV1OrganizationsOrgIdMembersMembershipId({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdMembersQueryKey(orgId) }),
    },
  })
}

export function useUpdateSettings(orgId: string) {
  const qc = useQueryClient()
  return usePutApiV1OrganizationsOrgIdSettings({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdSettingsQueryKey(orgId) }),
    },
  })
}
