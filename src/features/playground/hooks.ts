import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  getGetApiV1AdminPlaygroundCasesQueryKey,
  getGetApiV1AdminPlaygroundCasesRunsQueryKey,
  getGetApiV1AdminPlaygroundCasesSuitesQueryKey,
  useDeleteApiV1AdminPlaygroundCasesId,
  useGetApiV1AdminPlaygroundCases,
  useGetApiV1AdminPlaygroundCasesRuns,
  useGetApiV1AdminPlaygroundCasesSuites,
  useGetApiV1AdminPlaygroundFeedback,
  useGetApiV1AdminPlaygroundOrganizations,
  useGetApiV1AdminPlaygroundOrganizationsOrgIdContext,
  useGetApiV1AdminPlaygroundOrganizationsOrgIdTools,
  useGetApiV1AdminPlaygroundRuns,
  useGetApiV1AdminPlaygroundRunsId,
  useGetApiV1AdminPlaygroundStats,
  useGetApiV1AdminPlaygroundWrites,
  usePostApiV1AdminPlaygroundCases,
  usePostApiV1AdminPlaygroundCasesRun,
  usePostApiV1AdminPlaygroundCompare,
  usePostApiV1AdminPlaygroundKnowledge,
  usePostApiV1AdminPlaygroundToolsName,
  usePutApiV1AdminPlaygroundCasesId,
} from '@/api/generated/endpoints/platform-playground/platform-playground'
import type {
  GetApiV1AdminPlaygroundFeedbackParams,
  GetApiV1AdminPlaygroundOrganizationsOrgIdContextParams,
  GetApiV1AdminPlaygroundOrganizationsOrgIdToolsParams,
  GetApiV1AdminPlaygroundOrganizationsParams,
  GetApiV1AdminPlaygroundRunsParams,
  GetApiV1AdminPlaygroundStatsParams,
  PlaygroundCase,
  PlaygroundCaseRun,
  PlaygroundContext,
  PlaygroundOrganizationPage,
  PlaygroundRatedMessage,
  PlaygroundStats,
  PlaygroundTool,
  PlaygroundTrace,
  PlaygroundTracePage,
  PlaygroundWrite,
  PlaygroundSuiteSummary,
} from '@/api/generated/model'
import { asArray } from '@/lib/list-result'

/**
 * **Los datos del playground.** Todo cuelga de `/admin/playground/*`, y el guard del
 * backend cubre también las lecturas: aquí lo que se lee son los datos de otro.
 *
 * El chat no está en este archivo. Es un flujo de eventos, no una consulta, y vive en
 * `stream-run.ts`.
 */

/* ---------- La organización contra la que se prueba ---------- */

/** Las organizaciones probables, con `writable` para saber cuáles admiten escribir. */
export function usePlaygroundOrganizations(params: GetApiV1AdminPlaygroundOrganizationsParams) {
  const query = useGetApiV1AdminPlaygroundOrganizations(params, {
    query: { placeholderData: keepPreviousData },
  })
  const page = query.data?.data as PlaygroundOrganizationPage | undefined
  return {
    ...query,
    organizations: page?.data ?? [],
    total: page?.total ?? 0,
    totalPages: page?.totalPages ?? 1,
  }
}

/**
 * Modelo activo, prompt vigente, bloque de contexto, roles propios y proveedores
 * probables.
 *
 * **No depende del rol ni del modo**: los acepta como parámetros, pero devuelve lo mismo.
 * Por eso el rol va fijo aquí dentro y no lo elige quien llama — si viajara el rol de la
 * pantalla, cambiarlo invalidaría esta consulta y volvería a pedir el prompt entero para
 * recibir byte a byte lo mismo. Lo que sí se refresca al cambiar de rol o de modo es el
 * catálogo de herramientas.
 */
export function usePlaygroundContext(orgId: string) {
  const params: GetApiV1AdminPlaygroundOrganizationsOrgIdContextParams = { role: 'OWNER' }
  const query = useGetApiV1AdminPlaygroundOrganizationsOrgIdContext(orgId, params, {
    query: { enabled: !!orgId },
  })
  return { ...query, context: query.data?.data as PlaygroundContext | undefined }
}

/** El catálogo para **ese** rol y **ese** modo: qué se ofrece y qué se retiene, y por qué. */
export function usePlaygroundTools(
  orgId: string,
  params: GetApiV1AdminPlaygroundOrganizationsOrgIdToolsParams,
) {
  const query = useGetApiV1AdminPlaygroundOrganizationsOrgIdTools(orgId, params, {
    query: { enabled: !!orgId, placeholderData: keepPreviousData },
  })
  return { ...query, tools: asArray<PlaygroundTool>(query.data?.data) }
}

/* ---------- Corridas ---------- */

/**
 * Las corridas archivadas, de la más nueva a la más vieja.
 *
 * Son turnos de verdad y turnos de prueba mezclados: el filtro `origin` es lo que separa
 * «qué le está pasando a los clientes» de «qué estuve probando yo».
 */
export function usePlaygroundRuns(params: GetApiV1AdminPlaygroundRunsParams) {
  const query = useGetApiV1AdminPlaygroundRuns(params, {
    query: { placeholderData: keepPreviousData },
  })
  const page = query.data?.data as PlaygroundTracePage | undefined
  return {
    ...query,
    runs: page?.data ?? [],
    total: page?.total ?? 0,
    totalPages: page?.totalPages ?? 1,
  }
}

/** La traza completa de un turno, por si se llegó por enlace y no por el evento. */
export function usePlaygroundRun(id: string | undefined) {
  const query = useGetApiV1AdminPlaygroundRunsId(id ?? '', { query: { enabled: !!id } })
  return { ...query, trace: query.data?.data as PlaygroundTrace | undefined }
}

/**
 * Correr una herramienta a mano, sin modelo de por medio.
 *
 * **Un fallo de la herramienta responde 200 con `ok: false`**, no un 500: el error viaja
 * dentro y la mutación se resuelve bien. Lo que distingue «la herramienta está rota» de
 * «el modelo la llamó mal» es justo eso, así que no se trata como excepción.
 */
export function useRunTool() {
  return usePostApiV1AdminPlaygroundToolsName()
}

/** El mismo mensaje contra 2–4 variantes. Siempre en solo lectura, lo decide el backend. */
export function useCompareVariants() {
  return usePostApiV1AdminPlaygroundCompare()
}

/* ---------- Conjunto de regresión ---------- */

export function usePlaygroundCases(organizationId?: string) {
  const query = useGetApiV1AdminPlaygroundCases(
    organizationId ? { organizationId } : undefined,
  )
  return { ...query, cases: asArray<PlaygroundCase>(query.data?.data) }
}

export function usePlaygroundSuites(limit = 10) {
  const query = useGetApiV1AdminPlaygroundCasesSuites({ limit })
  return { ...query, suites: asArray<PlaygroundSuiteSummary>(query.data?.data) }
}

export function usePlaygroundSuiteRuns(suiteId: string | undefined) {
  const query = useGetApiV1AdminPlaygroundCasesRuns(
    { suiteId },
    { query: { enabled: !!suiteId } },
  )
  return { ...query, runs: asArray<PlaygroundCaseRun>(query.data?.data) }
}

/** Lo que una corrida deja obsoleto: los casos y el historial de corridas. */
function useInvalidateCases() {
  const qc = useQueryClient()
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: getGetApiV1AdminPlaygroundCasesQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetApiV1AdminPlaygroundCasesSuitesQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetApiV1AdminPlaygroundCasesRunsQueryKey() }),
    ])
  }
}

export function useSaveCase() {
  const invalidate = useInvalidateCases()
  return usePostApiV1AdminPlaygroundCases({ mutation: { onSuccess: () => invalidate() } })
}

export function useUpdateCase() {
  const invalidate = useInvalidateCases()
  return usePutApiV1AdminPlaygroundCasesId({ mutation: { onSuccess: () => invalidate() } })
}

/** Archivar, no borrar: lo que se corrió alguna vez sigue explicando sus corridas. */
export function useArchiveCase() {
  const invalidate = useInvalidateCases()
  return useDeleteApiV1AdminPlaygroundCasesId({ mutation: { onSuccess: () => invalidate() } })
}

/** Correr el conjunto. Va **en serie** en el backend, así que con veinte casos tarda. */
export function useRunSuite() {
  const invalidate = useInvalidateCases()
  return usePostApiV1AdminPlaygroundCasesRun({ mutation: { onSuccess: () => invalidate() } })
}

/* ---------- Paneles ---------- */

/** Actividad por día. La ventana de fechas es obligatoria: sin ella, 422. */
export function usePlaygroundStats(params: GetApiV1AdminPlaygroundStatsParams) {
  const query = useGetApiV1AdminPlaygroundStats(params, {
    query: { enabled: !!params.from && !!params.to, placeholderData: keepPreviousData },
  })
  return { ...query, stats: query.data?.data as PlaygroundStats | undefined }
}

/** Respuestas puntuadas, con la pregunta que las provocó. */
export function usePlaygroundFeedback(params: GetApiV1AdminPlaygroundFeedbackParams) {
  const query = useGetApiV1AdminPlaygroundFeedback(params)
  return { ...query, messages: asArray<PlaygroundRatedMessage>(query.data?.data) }
}

/** Qué dejó escrito una corrida, sacado de sus trazas. */
export function usePlaygroundWrites(conversationId: string) {
  const query = useGetApiV1AdminPlaygroundWrites(
    { conversationId },
    { query: { enabled: !!conversationId } },
  )
  return { ...query, writes: asArray<PlaygroundWrite>(query.data?.data) }
}

/** La sonda del RAG: qué trozos devuelve una consulta y con qué score. */
export function useKnowledgeProbe() {
  return usePostApiV1AdminPlaygroundKnowledge()
}
