import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Note } from '@/components/ui/note'
import { TOPICS, type Topic } from './topics'
import { KnowledgeSearch } from './knowledge-search'

function TopicCard({ topic }: { topic: Topic }) {
  return (
    <Card className="hover:border-brand/40 group gap-0 p-0 py-0 transition-colors">
      {/* El enlace ocupa la tarjeta entera: media tarjeta clicable es una trampa. */}
      <Link
        to={`/ayuda/${topic.slug}`}
        className="focus-visible:ring-ring/50 flex items-start gap-3 rounded-lg p-4 focus-visible:ring-[3px] focus-visible:outline-none"
      >
        <span className="bg-secondary text-brand grid size-9 shrink-0 place-items-center rounded-lg">
          <topic.Icon aria-hidden className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="group-hover:text-brand flex items-center gap-1 font-medium transition-colors">
            {topic.label}
            <ArrowRight
              aria-hidden
              className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
            />
          </span>
          <span className="text-muted-foreground block text-sm leading-relaxed">{topic.lead}</span>
        </span>
      </Link>
    </Card>
  )
}

/** Los temas por grupo, en el orden en que están declarados. */
const GROUPS = TOPICS.reduce<{ title: string; topics: Topic[] }[]>((acc, topic) => {
  const group = acc.find((g) => g.title === topic.group)
  if (group) group.topics.push(topic)
  else acc.push({ title: topic.group, topics: [topic] })
  return acc
}, [])

/**
 * Portada de la ayuda.
 *
 * No es el documento: es la entrada. Buscador arriba —que es como se entra a una
 * documentación cuando ya tienes una pregunta— y debajo los temas, para cuando
 * no la tienes todavía.
 */
export function HelpHome() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Guía y ayuda"
        description="Qué es cada cosa, en qué orden usar Nummo y qué significa cada estado. Sin tecnicismos."
      />

      <KnowledgeSearch />

      {GROUPS.map((group) => (
        <section key={group.title} className="space-y-3">
          <h2 className="text-muted-foreground text-[0.68rem] font-medium tracking-wider uppercase">
            {group.title}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.topics.map((topic) => (
              <TopicCard key={topic.slug} topic={topic} />
            ))}
          </div>
        </section>
      ))}

      <Note tone="tip" title="¿No encuentras algo?">
        Pregúntale a Numi desde la barra de arriba: conoce esta guía y además puede mirar tus datos
        para responder con tus propias cifras.
      </Note>
    </div>
  )
}
