import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  getGetApiV1OrganizationsOrgIdContactsContactIdQueryKey,
  getGetApiV1OrganizationsOrgIdContactsContactIdRelationshipsQueryKey,
  getGetApiV1OrganizationsOrgIdContactsQueryKey,
  useDeleteApiV1OrganizationsOrgIdContactsContactId,
  useDeleteApiV1OrganizationsOrgIdContactsContactIdRelationshipsRelationshipId,
  useGetApiV1OrganizationsOrgIdContacts,
  useGetApiV1OrganizationsOrgIdContactsContactId,
  useGetApiV1OrganizationsOrgIdContactsContactIdRelationships,
  usePatchApiV1OrganizationsOrgIdContactsContactId,
  usePostApiV1OrganizationsOrgIdContacts,
  usePostApiV1OrganizationsOrgIdContactsContactIdRelationships,
} from '@/api/generated/endpoints/contacts/contacts'
import type {
  Contact,
  ContactRelationship,
  GetApiV1OrganizationsOrgIdContactsParams,
} from '@/api/generated/model'
import { asArray } from '@/lib/list-result'

/* ---------- Queries ---------- */

export function useContacts(
  orgId: string | undefined,
  params: GetApiV1OrganizationsOrgIdContactsParams,
) {
  const query = useGetApiV1OrganizationsOrgIdContacts(orgId ?? '', params, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  const page = query.data?.data
  return {
    ...query,
    contacts: asArray<Contact>(page?.data),
    total: page?.total ?? 0,
    totalPages: page?.totalPages ?? 1,
    pageNumber: page?.page ?? params.page ?? 1,
  }
}

export function useContact(orgId: string | undefined, contactId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdContactsContactId(orgId ?? '', contactId ?? '', {
    query: { enabled: !!orgId && !!contactId },
  })
  return { ...query, contact: query.data?.data as Contact | undefined }
}

export function useRelationships(orgId: string | undefined, contactId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdContactsContactIdRelationships(
    orgId ?? '',
    contactId ?? '',
    { query: { enabled: !!orgId && !!contactId } },
  )
  return { ...query, relationships: asArray<ContactRelationship>(query.data?.data) }
}

/* ---------- Mutations ---------- */

export function useCreateContact(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdContacts({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdContactsQueryKey(orgId) }),
    },
  })
}

export function useUpdateContact(orgId: string) {
  const qc = useQueryClient()
  return usePatchApiV1OrganizationsOrgIdContactsContactId({
    mutation: {
      onSuccess: (_res, vars) => {
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdContactsQueryKey(orgId) })
        void qc.invalidateQueries({
          queryKey: getGetApiV1OrganizationsOrgIdContactsContactIdQueryKey(orgId, vars.contactId),
        })
      },
    },
  })
}

export function useArchiveContact(orgId: string) {
  const qc = useQueryClient()
  return useDeleteApiV1OrganizationsOrgIdContactsContactId({
    mutation: {
      onSuccess: (_res, vars) => {
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdContactsQueryKey(orgId) })
        void qc.invalidateQueries({
          queryKey: getGetApiV1OrganizationsOrgIdContactsContactIdQueryKey(orgId, vars.contactId),
        })
      },
    },
  })
}

export function useAddRelationship(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdContactsContactIdRelationships({
    mutation: {
      onSuccess: (_res, vars) =>
        void qc.invalidateQueries({
          queryKey: getGetApiV1OrganizationsOrgIdContactsContactIdRelationshipsQueryKey(
            orgId,
            vars.contactId,
          ),
        }),
    },
  })
}

export function useRemoveRelationship(orgId: string) {
  const qc = useQueryClient()
  return useDeleteApiV1OrganizationsOrgIdContactsContactIdRelationshipsRelationshipId({
    mutation: {
      onSuccess: (_res, vars) =>
        void qc.invalidateQueries({
          queryKey: getGetApiV1OrganizationsOrgIdContactsContactIdRelationshipsQueryKey(
            orgId,
            vars.contactId,
          ),
        }),
    },
  })
}
