import { Navigate, useParams } from 'react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/page-header'
import { TOPICS, topicBySlug, type Topic } from './topics'

/**
 * Enlace al tema de al lado.
 *
 * Es lo que convierte una colección de páginas sueltas en una guía que se puede
 * leer de principio a fin: al terminar un tema siempre hay una salida hacia
 * adelante, sin volver al índice.
 */
function NextLink({ topic, direction }: { topic: Topic; direction: 'prev' | 'next' }) {
  const isNext = direction === 'next'
  return (
    <Link
      to={`/ayuda/${topic.slug}`}
      className="hover:border-brand/40 hover:bg-secondary/40 group flex min-w-0 flex-1 items-center gap-3 rounded-lg border p-3 transition-colors"
    >
      {!isNext && (
        <ArrowLeft aria-hidden className="text-muted-foreground size-4 shrink-0" />
      )}
      <span className={`min-w-0 flex-1 ${isNext ? 'text-right' : ''}`}>
        <span className="text-muted-foreground block text-xs">
          {isNext ? 'Siguiente' : 'Anterior'}
        </span>
        <span className="group-hover:text-brand block truncate text-sm font-medium transition-colors">
          {topic.label}
        </span>
      </span>
      {isNext && <ArrowRight aria-hidden className="text-muted-foreground size-4 shrink-0" />}
    </Link>
  )
}

/**
 * Un tema de la guía. Uno solo por pantalla: la versión anterior metía los nueve
 * en un scroll de 6.473 px.
 */
export function TopicPage() {
  const { tema } = useParams()
  const topic = topicBySlug(tema)

  // Una URL inventada no es una pantalla de error: es alguien que llegó de un
  // enlace viejo. Se le deja en la portada, que es de donde puede seguir.
  if (!topic) return <Navigate to="/ayuda" replace />

  const index = TOPICS.indexOf(topic)
  const prev = TOPICS[index - 1]
  const next = TOPICS[index + 1]
  const { Content } = topic

  return (
    <article className="space-y-6">
      <PageHeader title={topic.title} description={topic.lead} />
      <Content />

      {(prev || next) && (
        <nav aria-label="Más de la guía" className="flex flex-wrap gap-3 pt-4">
          {prev && <NextLink topic={prev} direction="prev" />}
          {next && <NextLink topic={next} direction="next" />}
        </nav>
      )}
    </article>
  )
}
