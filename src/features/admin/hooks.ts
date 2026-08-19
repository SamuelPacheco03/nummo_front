import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  getGetApiV1AdminOrganizationsOrgIdQueryKey,
  getGetApiV1AdminOrganizationsQueryKey,
  getGetApiV1AdminPlansQueryKey,
  useGetApiV1AdminOrganizations,
  useGetApiV1AdminOrganizationsOrgId,
  useGetApiV1AdminPlans,
  usePutApiV1AdminOrganizationsOrgIdOverrides,
  usePutApiV1AdminOrganizationsOrgIdPlan,
  usePutApiV1AdminOrganizationsOrgIdStatus,
  usePutApiV1AdminPlansCode,
} from '@/api/generated/endpoints/platform-admin/platform-admin'
import { getGetApiV1PlansQueryKey } from '@/api/generated/endpoints/platform/platform'
import type {
  AdminOrganizationDetailDto,
  AdminOrganizationPage,
  GetApiV1AdminOrganizationsParams,
  PlanDto,
} from '@/api/generated/model'
import { asArray } from '@/lib/list-result'

/* ---------- Queries ---------- */

/** Todas las organizaciones de la plataforma, con su plan y su consumo del período. */
export function useAdminOrganizations(params: GetApiV1AdminOrganizationsParams) {
  const query = useGetApiV1AdminOrganizations(params, {
    query: { placeholderData: keepPreviousData },
  })
  const page = query.data?.data as AdminOrganizationPage | undefined
  return {
    ...query,
    organizations: page?.data ?? [],
    total: page?.total ?? 0,
    totalPages: page?.totalPages ?? 1,
  }
}

/** Una organización con sus entitlements resueltos y los overrides negociados. */
export function useAdminOrganization(orgId: string | undefined) {
  const query = useGetApiV1AdminOrganizationsOrgId(orgId ?? '', { query: { enabled: !!orgId } })
  return { ...query, detail: query.data?.data as AdminOrganizationDetailDto | undefined }
}

/** Los planes tal como se editan: con precio, visibilidad y orden. */
export function useAdminPlans() {
  const query = useGetApiV1AdminPlans()
  return { ...query, plans: asArray<PlanDto>(query.data?.data) }
}

/* ---------- Mutations ---------- */

/**
 * Invalida lo que una acción de plataforma deja obsoleto.
 *
 * Siempre las dos: la ficha que se está mirando y la lista de detrás, que
 * enseña plan y estado en cada fila.
 */
function useInvalidateOrg() {
  const qc = useQueryClient()
  return async (orgId: string) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: getGetApiV1AdminOrganizationsOrgIdQueryKey(orgId) }),
      qc.invalidateQueries({ queryKey: getGetApiV1AdminOrganizationsQueryKey() }),
    ])
  }
}

/** Mueve una organización de plan: cierra la suscripción anterior y abre otra. */
export function useChangePlan() {
  const invalidate = useInvalidateOrg()
  return usePutApiV1AdminOrganizationsOrgIdPlan({
    mutation: { onSuccess: (_res, vars) => invalidate(vars.orgId) },
  })
}

/** Negocia features o topes para un cliente concreto, por encima de su plan. */
export function useSetOverrides() {
  const invalidate = useInvalidateOrg()
  return usePutApiV1AdminOrganizationsOrgIdOverrides({
    mutation: { onSuccess: (_res, vars) => invalidate(vars.orgId) },
  })
}

/** Suspende o reactiva. Suspendida es solo lectura, nunca pérdida de datos. */
export function useSetOrgStatus() {
  const invalidate = useInvalidateOrg()
  return usePutApiV1AdminOrganizationsOrgIdStatus({
    mutation: { onSuccess: (_res, vars) => invalidate(vars.orgId) },
  })
}

/**
 * Guarda un plan.
 *
 * Invalida también el catálogo público (`GET /plans`), que es el que ve el
 * cliente en «Plan y consumo»: editar el precio de Pro y que la tabla siga
 * enseñando el viejo sería el peor sitio para una caché rancia.
 */
export function useSavePlan() {
  const qc = useQueryClient()
  return usePutApiV1AdminPlansCode({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          qc.invalidateQueries({ queryKey: getGetApiV1AdminPlansQueryKey() }),
          qc.invalidateQueries({ queryKey: getGetApiV1PlansQueryKey() }),
          // Un recompute cambia lo que puede hacer quien esté dentro ahora mismo.
          qc.invalidateQueries({ queryKey: getGetApiV1AdminOrganizationsQueryKey() }),
        ])
      },
    },
  })
}
