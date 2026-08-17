import { useGetApiV1OrganizationsOrgIdKnowledgeSearch } from '@/api/generated/endpoints/knowledge/knowledge'
import type { KnowledgeHit } from '@/api/generated/model'
import { asArray } from '@/lib/list-result'

/**
 * Búsqueda en la base de conocimiento (RAG). Solo consulta cuando `q` tiene al
 * menos 2 caracteres. Si el backend no tiene la base configurada, devuelve error
 * (lo maneja quien consume con `getErrorMessage`).
 */
export function useKnowledgeSearch(orgId: string | undefined, q: string, limit = 6) {
  const enabled = !!orgId && q.trim().length >= 2
  const query = useGetApiV1OrganizationsOrgIdKnowledgeSearch(
    orgId ?? '',
    { q: q.trim(), limit },
    { query: { enabled, staleTime: 60_000, retry: false } },
  )
  return { ...query, hits: asArray<KnowledgeHit>(query.data?.data), enabled }
}
