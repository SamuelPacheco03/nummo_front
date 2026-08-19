import { useQueryClient } from '@tanstack/react-query'
import {
  getGetApiV1OrganizationsOrgIdBranchesQueryKey,
  getGetApiV1OrganizationsOrgIdMembersQueryKey,
  getGetApiV1OrganizationsOrgIdQueryKey,
  getGetApiV1OrganizationsOrgIdRolesQueryKey,
  getGetApiV1OrganizationsOrgIdSettingsQueryKey,
  getGetApiV1OrganizationsQueryKey,
  useDeleteApiV1OrganizationsOrgIdMembersMembershipId,
  useDeleteApiV1OrganizationsOrgIdRolesRoleId,
  useGetApiV1OrganizationsOrgId,
  useGetApiV1OrganizationsOrgIdBranches,
  useGetApiV1OrganizationsOrgIdMembers,
  useGetApiV1OrganizationsOrgIdRoles,
  useGetApiV1OrganizationsOrgIdRolesRoleId,
  useGetApiV1OrganizationsOrgIdSettings,
  usePatchApiV1OrganizationsOrgId,
  usePatchApiV1OrganizationsOrgIdBranchesBranchId,
  usePatchApiV1OrganizationsOrgIdMembersMembershipId,
  usePatchApiV1OrganizationsOrgIdRolesRoleId,
  usePostApiV1OrganizationsOrgIdApplyTemplate,
  usePostApiV1OrganizationsOrgIdBranches,
  usePostApiV1OrganizationsOrgIdMembers,
  usePostApiV1OrganizationsOrgIdRoles,
  usePutApiV1OrganizationsOrgIdMembersMembershipIdCustomRole,
  usePutApiV1OrganizationsOrgIdSettings,
} from '@/api/generated/endpoints/organizations/organizations'
import {
  getGetApiV1OrganizationsOrgIdAssistantSettingsQueryKey,
  useDeleteApiV1OrganizationsOrgIdAssistantProvidersProvider,
  useDeleteApiV1OrganizationsOrgIdAssistantVoiceProvidersProvider,
  useGetApiV1OrganizationsOrgIdAssistantSettings,
  usePostApiV1OrganizationsOrgIdAssistantProvidersProviderActivate,
  usePostApiV1OrganizationsOrgIdAssistantVoiceProvidersProviderActivate,
  usePutApiV1OrganizationsOrgIdAssistantProvidersProvider,
  usePutApiV1OrganizationsOrgIdAssistantVoiceProvidersProvider,
} from '@/api/generated/endpoints/assistant/assistant'
import { getGetApiV1OrganizationsOrgIdMeCapabilitiesQueryKey } from '@/api/generated/endpoints/platform/platform'
import type {
  AssistantSettings,
  Branch,
  CustomRole,
  Member,
  Organization,
  OrganizationSettings,
} from '@/api/generated/model'
import { asArray } from '@/lib/list-result'

/* ---------- Queries ---------- */

export function useOrgDetail(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgId(orgId ?? '', { query: { enabled: !!orgId } })
  return { ...query, organization: query.data?.data as Organization | undefined }
}

export function useBranches(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdBranches(orgId ?? '', { query: { enabled: !!orgId } })
  return { ...query, branches: asArray<Branch>(query.data?.data) }
}

export function useMembers(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdMembers(orgId ?? '', { query: { enabled: !!orgId } })
  return { ...query, members: asArray<Member>(query.data?.data) }
}

/**
 * Los roles propios de la organización.
 *
 * **Leerlos no se vende con el plan; escribirlos sí** (`custom_roles`). Es lo
 * que hace que quien baja de plan conserve los que definió y sus miembros sigan
 * trabajando: se bloquea crear, nunca se borra.
 */
export function useCustomRoles(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdRoles(orgId ?? '', { query: { enabled: !!orgId } })
  return { ...query, roles: asArray<CustomRole>(query.data?.data) }
}

export function useCustomRole(orgId: string | undefined, roleId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdRolesRoleId(orgId ?? '', roleId ?? '', {
    query: { enabled: !!orgId && !!roleId },
  })
  return { ...query, role: query.data?.data as CustomRole | undefined }
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

/**
 * Aprovisiona la organización con una plantilla según su tipo (crea conceptos,
 * categorías, métodos y cuentas de ejemplo). Invalida todo el cache porque
 * siembra datos en varios maestros a la vez.
 */
export function useApplyTemplate() {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdApplyTemplate({
    mutation: {
      onSuccess: () => void qc.invalidateQueries(),
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

/**
 * Invalida lo que un cambio de rol deja obsoleto.
 *
 * Las tres: la lista de roles, los miembros —que enseñan el rol de cada uno— y
 * **las capacidades**, porque un rol propio decide lo que quien lo lleva puede
 * hacer y `useCan` vive de ahí.
 */
function useInvalidateRoles(orgId: string) {
  const qc = useQueryClient()
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdRolesQueryKey(orgId) }),
      qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdMembersQueryKey(orgId) }),
      qc.invalidateQueries({
        queryKey: getGetApiV1OrganizationsOrgIdMeCapabilitiesQueryKey(orgId),
      }),
    ])
  }
}

export function useCreateCustomRole(orgId: string) {
  const invalidate = useInvalidateRoles(orgId)
  return usePostApiV1OrganizationsOrgIdRoles({ mutation: { onSuccess: invalidate } })
}

export function useUpdateCustomRole(orgId: string) {
  const invalidate = useInvalidateRoles(orgId)
  return usePatchApiV1OrganizationsOrgIdRolesRoleId({ mutation: { onSuccess: invalidate } })
}

/** Archivar un rol. El backend lo rechaza si todavía tiene miembros. */
export function useDeleteCustomRole(orgId: string) {
  const invalidate = useInvalidateRoles(orgId)
  return useDeleteApiV1OrganizationsOrgIdRolesRoleId({ mutation: { onSuccess: invalidate } })
}

/**
 * Pone —o quita, con `null`— el rol propio de un miembro.
 *
 * **Reemplaza los permisos del rol base, no se suma a ellos**: «qué puede hacer
 * esta persona» tiene una sola respuesta. El rol base se conserva como etiqueta.
 */
export function useAssignCustomRole(orgId: string) {
  const invalidate = useInvalidateRoles(orgId)
  return usePutApiV1OrganizationsOrgIdMembersMembershipIdCustomRole({
    mutation: { onSuccess: invalidate },
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

/* ---------- Asistente IA (BYOK) — solo OWNER/ADMIN ---------- */

/** Config del asistente: proveedores configurados (enmascarados), activo y catálogo. */
export function useAssistantSettings(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdAssistantSettings(orgId ?? '', {
    query: { enabled: !!orgId, retry: false },
  })
  return { ...query, settings: query.data?.data as AssistantSettings | undefined }
}

/** Crea/reemplaza la credencial (modelo + API key) de un proveedor. */
export function useUpsertAiProvider(orgId: string) {
  const qc = useQueryClient()
  return usePutApiV1OrganizationsOrgIdAssistantProvidersProvider({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdAssistantSettingsQueryKey(orgId) }),
    },
  })
}

/** Marca un proveedor configurado como el activo. */
export function useActivateAiProvider(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdAssistantProvidersProviderActivate({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdAssistantSettingsQueryKey(orgId) }),
    },
  })
}

/** Elimina la credencial de un proveedor. */
export function useRemoveAiProvider(orgId: string) {
  const qc = useQueryClient()
  return useDeleteApiV1OrganizationsOrgIdAssistantProvidersProvider({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdAssistantSettingsQueryKey(orgId) }),
    },
  })
}

/* --- Voz / transcripción (speech-to-text): mismo patrón, bloque `voice` de settings --- */

/** Crea/reemplaza la credencial (modelo + API key) de un proveedor de voz. */
export function useUpsertVoiceProvider(orgId: string) {
  const qc = useQueryClient()
  return usePutApiV1OrganizationsOrgIdAssistantVoiceProvidersProvider({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdAssistantSettingsQueryKey(orgId) }),
    },
  })
}

/** Marca un proveedor de voz configurado como el activo. */
export function useActivateVoiceProvider(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdAssistantVoiceProvidersProviderActivate({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdAssistantSettingsQueryKey(orgId) }),
    },
  })
}

/** Elimina la credencial de un proveedor de voz. */
export function useRemoveVoiceProvider(orgId: string) {
  const qc = useQueryClient()
  return useDeleteApiV1OrganizationsOrgIdAssistantVoiceProvidersProvider({
    mutation: {
      onSuccess: () =>
        void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdAssistantSettingsQueryKey(orgId) }),
    },
  })
}
