import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getGetApiV1OrganizationsQueryKey,
  useGetApiV1Organizations,
  usePostApiV1Organizations,
} from '@/api/generated/endpoints/organizations/organizations'
import type { OrganizationSummary } from '@/api/generated/model'
import { useOrgStore } from './org-store'
import { asArray } from '@/lib/list-result'

/** Lista de organizaciones del usuario (`{ organization, role }[]`). */
function useOrganizations() {
  const query = useGetApiV1Organizations({ query: { staleTime: 60_000 } })
  const organizations = asArray<OrganizationSummary>(query.data?.data)
  return { ...query, organizations }
}

/**
 * Organización activa: cruza el `selectedOrgId` (store) con la lista.
 * Si no hay selección válida, auto-selecciona la primera.
 */
export function useCurrentOrg() {
  const { organizations, isPending, isError } = useOrganizations()
  const selectedOrgId = useOrgStore((s) => s.selectedOrgId)
  const setSelectedOrgId = useOrgStore((s) => s.setSelectedOrgId)

  const current =
    organizations.find((o) => o.organization.id === selectedOrgId) ?? organizations.at(0)

  useEffect(() => {
    if (current && current.organization.id !== selectedOrgId) {
      setSelectedOrgId(current.organization.id)
    }
  }, [current, selectedOrgId, setSelectedOrgId])

  return {
    orgId: current?.organization.id,
    organization: current?.organization,
    role: current?.role,
    organizations,
    isLoading: isPending,
    isError,
    hasNoOrgs: !isPending && !isError && organizations.length === 0,
  }
}

/** Crea una organización (el usuario queda como OWNER) y la selecciona. */
export function useCreateOrganization() {
  const queryClient = useQueryClient()
  const setSelectedOrgId = useOrgStore((s) => s.setSelectedOrgId)
  return usePostApiV1Organizations({
    mutation: {
      onSuccess: async (res) => {
        const created = res.data as OrganizationSummary
        await queryClient.invalidateQueries({ queryKey: getGetApiV1OrganizationsQueryKey() })
        setSelectedOrgId(created.organization.id)
      },
    },
  })
}
