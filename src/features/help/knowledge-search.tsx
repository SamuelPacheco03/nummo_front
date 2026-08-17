import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { getErrorMessage } from '@/lib/errors'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { searchGuide } from './help-search'
import { useKnowledgeSearch } from './hooks'

/**
 * Buscador de la ayuda, en dos capas.
 *
 * **Primero la guía**, porque devuelve enlaces: encontrar y llegar. Antes solo
 * estaba la segunda capa —la base de conocimiento del asistente— y sus resultados
 * eran texto muerto: leías el fragmento que respondía tu pregunta y no había
 * forma de ir a la página que lo explica entero.
 *
 * **Después la base de conocimiento** (el mismo RAG que usa Numi en el chat), que
 * cubre lo que la guía no dice con estas palabras.
 */
export function KnowledgeSearch() {
  const { orgId } = useCurrentOrg()
  const [q, setQ] = useState('')
  const debounced = useDebouncedValue(q.trim(), 350)
  const { hits, isFetching, isError, error, enabled } = useKnowledgeSearch(orgId, debounced)

  const guideHits = searchGuide(debounced)
  const showPanel = enabled || guideHits.length > 0

  return (
    <section className="space-y-3">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busca en la ayuda: «¿cómo registro un pago?»…"
          className="h-11 pl-9"
          aria-label="Buscar en la ayuda"
        />
      </div>

      {showPanel && (
        <div className="bg-card divide-y rounded-lg border">
          {guideHits.length > 0 && (
            <ul className="divide-y">
              {guideHits.map((hit) => (
                <li key={`${hit.to}-${hit.title}`}>
                  <Link
                    to={hit.to}
                    className="hover:bg-secondary/50 group focus-visible:ring-ring/50 flex items-start gap-3 px-4 py-3 transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="group-hover:text-brand block text-sm font-medium transition-colors">
                        {hit.title}
                      </span>
                      <span className="text-muted-foreground line-clamp-2 block text-sm">
                        {hit.context}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="text-muted-foreground mt-0.5 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {enabled &&
            (isFetching ? (
              <p className="text-muted-foreground px-4 py-3 text-sm">Buscando…</p>
            ) : isError ? (
              <p className="text-muted-foreground px-4 py-3 text-sm">
                {getErrorMessage(error, 'No se pudo buscar en la ayuda.')}
              </p>
            ) : hits.length === 0 ? (
              guideHits.length === 0 && (
                <p className="text-muted-foreground px-4 py-3 text-sm">
                  Sin resultados para «{debounced}». Prueba con otras palabras o pregúntale a Numi.
                </p>
              )
            ) : (
              <div>
                <p className="text-muted-foreground px-4 pt-3 text-[0.68rem] font-medium tracking-wider uppercase">
                  De la base de conocimiento
                </p>
                <ul className="divide-y">
                  {hits.map((h, i) => (
                    <li key={`${h.title}-${h.heading}-${i}`} className="px-4 py-3">
                      <p className="text-sm font-medium">{h.heading || h.title}</p>
                      {h.heading && h.title && h.title !== h.heading && (
                        <p className="text-muted-foreground text-xs">{h.title}</p>
                      )}
                      <p className="text-muted-foreground mt-1 line-clamp-3 text-sm">{h.content}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
    </section>
  )
}
