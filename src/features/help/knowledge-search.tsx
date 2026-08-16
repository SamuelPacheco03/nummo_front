import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { getErrorMessage } from '@/lib/errors'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useKnowledgeSearch } from './hooks'

/**
 * Buscador de la base de conocimiento (RAG). Consulta al escribir (con debounce)
 * y muestra los fragmentos más relevantes. Es lo mismo que Numi usa en el chat,
 * aquí como búsqueda directa dentro de la Ayuda.
 */
export function KnowledgeSearch() {
  const { orgId } = useCurrentOrg()
  const [q, setQ] = useState('')
  const debounced = useDebouncedValue(q.trim(), 350)
  const { hits, isFetching, isError, error, enabled } = useKnowledgeSearch(orgId, debounced)

  return (
    <section className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busca en la ayuda: “¿cómo registro un pago?”…"
          className="pl-9"
          aria-label="Buscar en la ayuda"
        />
      </div>

      {enabled && (
        <div className="rounded-lg border bg-card">
          {isFetching ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Buscando…</p>
          ) : isError ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              {getErrorMessage(error, 'No se pudo buscar en la ayuda.')}
            </p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Sin resultados para “{debounced}”.</p>
          ) : (
            <ul className="divide-y">
              {hits.map((h, i) => (
                <li key={`${h.title}-${h.heading}-${i}`} className="px-4 py-3">
                  <p className="text-sm font-medium">{h.heading || h.title}</p>
                  {h.heading && h.title && h.title !== h.heading && (
                    <p className="text-xs text-muted-foreground">{h.title}</p>
                  )}
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{h.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
