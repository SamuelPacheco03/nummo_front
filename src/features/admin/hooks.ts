import { keepPreviousData, useQueryClient, type QueryClient } from '@tanstack/react-query'
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
  getGetApiV1AdminWhatsappInboundEventsHealthQueryKey,
  getGetApiV1AdminWhatsappInboundEventsQueryKey,
  getGetApiV1AdminWhatsappTemplatesQueryKey,
  useGetApiV1AdminWhatsappInboundEvents,
  useGetApiV1AdminWhatsappInboundEventsHealth,
  useGetApiV1AdminWhatsappTemplates,
  usePostApiV1AdminWhatsappInboundEventsIdRetry,
  usePostApiV1AdminWhatsappInboundEventsRetry,
  usePostApiV1AdminWhatsappTemplatesSync,
  useGetApiV1AdminWhatsappStatus,
  usePostApiV1AdminWhatsappTestMessage,
  useGetApiV1AdminMarketingOverview,
  useGetApiV1AdminMarketingFunnel,
  useGetApiV1AdminMarketingSources,
} from '@/api/generated/endpoints/platform-admin/platform-admin'
import { getGetApiV1PlansQueryKey } from '@/api/generated/endpoints/platform/platform'
import type {
  AdminOrganizationDetailDto,
  AdminOrganizationPage,
  AdminInboundEvent,
  GetApiV1AdminOrganizationsParams,
  GetApiV1AdminWhatsappInboundEventsParams,
  InboundQueueHealth,
  MarketingFunnel,
  MarketingOverview,
  MarketingSources,
  PlanDto,
  WhatsAppStatusOutput,
  WhatsAppTemplate,
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

/* ---------- El canal de WhatsApp, visto por Nummo ---------- */

/**
 * **La cola de entrantes.** Es la única tabla del canal sin dueño —cuando Meta
 * entrega algo todavía no se sabe de qué organización es— y por eso no la mira
 * nadie desde una organización.
 *
 * Importa porque el fallo pasa en un sitio y el síntoma aparece en otro: si Meta
 * cambia de versión o el gateway se cae, esto se llena de fallos mientras lo que
 * el cliente ve es «mis mensajes se quedan en enviado».
 */
export function useInboundEvents(params: GetApiV1AdminWhatsappInboundEventsParams) {
  const query = useGetApiV1AdminWhatsappInboundEvents(params, {
    query: { placeholderData: keepPreviousData },
  })
  const page = query.data?.data as
    | { data: AdminInboundEvent[]; total: number; totalPages: number }
    | undefined
  return {
    ...query,
    events: asArray<AdminInboundEvent>(page?.data),
    total: page?.total ?? 0,
    totalPages: page?.totalPages ?? 1,
  }
}

/**
 * El conteo por estado. Devuelve **siempre los tres**, incluso en cero: es lo que
 * permite pintarlos los tres, y un «FAILED: —» hace dudar de si no hay o no se
 * pudo contar.
 */
export function useInboundHealth() {
  const query = useGetApiV1AdminWhatsappInboundEventsHealth()
  return { ...query, health: query.data?.data as InboundQueueHealth | undefined }
}

/**
 * Reencolar, una o todas las fallidas.
 *
 * **Reinicia los intentos a cero**, a propósito: quien pulsa es porque arregló lo
 * que lo rompía, y dejarlo con los intentos gastados lo haría fallar otra vez sin
 * llegar a procesarse.
 *
 * Devuelve a la cola; de vaciarla se encarga el worker en su siguiente vuelta, así
 * que el estado **no** salta a `PROCESSED` al instante.
 */
export function useRetryInboundEvent() {
  const qc = useQueryClient()
  return usePostApiV1AdminWhatsappInboundEventsIdRetry({
    mutation: { onSuccess: () => invalidateInbound(qc) },
  })
}

export function useRetryFailedInboundEvents() {
  const qc = useQueryClient()
  return usePostApiV1AdminWhatsappInboundEventsRetry({
    mutation: { onSuccess: () => invalidateInbound(qc) },
  })
}

function invalidateInbound(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: getGetApiV1AdminWhatsappInboundEventsQueryKey() })
  void qc.invalidateQueries({ queryKey: getGetApiV1AdminWhatsappInboundEventsHealthQueryKey() })
}

/**
 * **Las plantillas de la plataforma**: las de Nummo, que comparten todos los
 * clientes. Si Meta pausa una, se cae la cobranza de todos a la vez, y la única
 * señal eran los mensajes saltados repartidos por el historial de cada uno.
 */
export function usePlatformTemplates() {
  const query = useGetApiV1AdminWhatsappTemplates()
  const list = query.data?.data as { templates: WhatsAppTemplate[] } | undefined
  return { ...query, templates: asArray<WhatsAppTemplate>(list?.templates) }
}

/**
 * Empuja el catálogo a Meta y trae el estado.
 *
 * **Es idempotente**: lo que ya existe se refleja en vez de recrearse — recrear
 * gastaría cupo de creación (100 por hora y por WABA) para recibir un rechazo por
 * nombre duplicado. Es el mismo trabajo que `pnpm wa:templates:sync`.
 */
export function useSyncPlatformTemplates() {
  const qc = useQueryClient()
  return usePostApiV1AdminWhatsappTemplatesSync({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getGetApiV1AdminWhatsappTemplatesQueryKey() })
      },
    },
  })
}

/**
 * **Qué piezas del canal están configuradas en este despliegue.**
 *
 * Es la primera pregunta de quien abre esta pantalla y no se podía contestar: la cola de
 * entrantes vacía y el catálogo de plantillas vacío se ven exactamente igual con el canal
 * apagado que con el canal encendido y sin tráfico. Sin esto, «no llega nada» era un
 * diagnóstico imposible.
 */
export function usePlatformWhatsAppStatus() {
  const query = useGetApiV1AdminWhatsappStatus()
  return { ...query, status: query.data?.data as WhatsAppStatusOutput | undefined }
}

/**
 * Manda un mensaje de prueba con la cuenta de plataforma.
 *
 * **Responde 202, no 200**: Meta lo aceptó para entregarlo, que no es lo mismo que
 * entregado. Quien lo use tiene que contarlo así o promete algo que no puede cumplir.
 */
export function useSendPlatformTestMessage() {
  return usePostApiV1AdminWhatsappTestMessage()
}

/* ---------- La consola de marketing ---------- */

/**
 * Las tres lecturas del embudo público, que comparten ventana.
 *
 * Van con `keepPreviousData` porque las tres cuelgan del mismo par de fechas: al mover un
 * día, sin esto las cifras parpadean a vacío y la pantalla entera se siente rota por un
 * cambio que el usuario percibe como mínimo.
 *
 * **Miden la portada, que es la única superficie sin sesión.** Lo que alimentan estas
 * pantallas lo escribe `POST /public/signals` desde `src/marketing/` (§97.7): si el
 * catálogo de secciones del backend y las secciones reales se separan, aquí se ve como un
 * `reach` en cero de algo que sí se está mirando.
 */
const VENTANA = { query: { placeholderData: keepPreviousData } } as const

export function useMarketingOverview(params: { from: string; to: string }) {
  const query = useGetApiV1AdminMarketingOverview(params, VENTANA)
  return { ...query, overview: query.data?.data as MarketingOverview | undefined }
}

export function useMarketingFunnel(params: { from: string; to: string }) {
  const query = useGetApiV1AdminMarketingFunnel(params, VENTANA)
  return { ...query, funnel: query.data?.data as MarketingFunnel | undefined }
}

export function useMarketingSources(params: { from: string; to: string }) {
  const query = useGetApiV1AdminMarketingSources(params, VENTANA)
  return { ...query, sources: query.data?.data as MarketingSources | undefined }
}
