import { useState } from 'react'
import { BookOpen, Search } from 'lucide-react'
import { Panel } from '@/components/panel'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Note } from '@/components/ui/note'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { PlaygroundKnowledgeHit } from '@/api/generated/model'
import { useKnowledgeProbe } from './hooks'

/**
 * **La sonda del RAG**: qué trozos de la base de conocimiento devuelve una consulta y con
 * qué score.
 *
 * Es para ajustar la recuperación, que es la mitad silenciosa de una respuesta mala: si lo
 * que llega al modelo no habla del tema, ningún prompt lo arregla.
 */
export function PlaygroundKnowledgePage() {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<PlaygroundKnowledgeHit[] | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const probe = useKnowledgeProbe()

  const submit = () => {
    if (!query.trim()) return
    setFailure(null)
    probe.mutate(
      { data: { query: query.trim(), limit: 8 } },
      {
        onSuccess: (response) => setHits(response.data as PlaygroundKnowledgeHit[]),
        /*
          Sin `VOYAGE_API_KEY` el backend responde 422 con un mensaje claro. Se enseña tal
          cual: dice qué falta configurar, y traducirlo a «no se pudo buscar» borraría la
          única parte accionable.
        */
        onError: (e) => {
          setHits(null)
          setFailure(getErrorMessage(e, 'No se pudo consultar la base de conocimiento.'))
        },
      },
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Base de conocimiento"
        description="Qué trozos devuelve una consulta y con qué score, para ajustar lo que llega al modelo."
      />

      <Panel title="La consulta">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <div className="min-w-56 flex-1">
            <Field label="Lo que se busca" htmlFor="pg-knowledge">
              <Input
                id="pg-knowledge"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="¿Cómo se causa la mora?"
              />
            </Field>
          </div>
          <Button type="submit" disabled={probe.isPending || !query.trim()}>
            <Search aria-hidden />
            {probe.isPending ? 'Buscando…' : 'Buscar'}
          </Button>
        </form>
      </Panel>

      {failure && <Note tone="warning">{failure}</Note>}

      {hits === null ? (
        !failure && (
          <EmptyState
            Icon={BookOpen}
            title="Escribe una consulta"
            description="Se devuelve lo mismo que recibiría Numi al contestar sobre ese tema."
          />
        )
      ) : hits.length === 0 ? (
        <EmptyState
          Icon={BookOpen}
          title="La base no devolvió nada"
          description="Con esa consulta, el modelo contestaría sin material de apoyo."
        />
      ) : (
        <div className="space-y-3">
          {hits.map((hit, index) => (
            <Hit key={`${hit.title}-${index}`} hit={hit} />
          ))}
        </div>
      )}
    </div>
  )
}

function Hit({ hit }: { hit: PlaygroundKnowledgeHit }) {
  const pct = Math.max(0, Math.min(100, Math.round(hit.score * 100)))
  return (
    <article className="space-y-2 rounded-lg border p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">
          {hit.title}
          <span className="text-muted-foreground"> · {hit.heading}</span>
        </h3>
        <span className="nums text-muted-foreground text-xs">{hit.score.toFixed(3)}</span>
      </header>

      {/* La barra es comparación entre trozos, no una nota: por eso va tenue y sin color de estado. */}
      <div className="bg-secondary h-1 overflow-hidden rounded-full">
        <div className={cn('bg-brand h-full rounded-full')} style={{ width: `${pct}%` }} />
      </div>

      <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
        {hit.content}
      </p>
    </article>
  )
}
