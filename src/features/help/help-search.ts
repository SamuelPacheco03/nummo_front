import { fold } from '@/lib/text'
import { GLOSSARY } from './help-data'
import { TOPICS } from './topics'

export interface GuideHit {
  to: string
  title: string
  context: string
}

/**
 * Busca **dentro de esta guía**: temas y términos del glosario.
 *
 * Convive con la búsqueda de la base de conocimiento (`KnowledgeSearch`), que es
 * la del asistente y devuelve fragmentos de texto sin destino. Esta devuelve
 * enlaces, que es lo que se espera al buscar en una documentación: encontrar y
 * llegar, no encontrar y seguir buscando.
 */
export function searchGuide(query: string): GuideHit[] {
  const q = fold(query.trim())
  if (q.length < 2) return []

  const hits: GuideHit[] = []

  for (const topic of TOPICS) {
    if (fold(`${topic.label} ${topic.title} ${topic.lead}`).includes(q)) {
      hits.push({ to: `/ayuda/${topic.slug}`, title: topic.title, context: topic.lead })
    }
  }

  for (const group of GLOSSARY) {
    for (const { term, def } of group.terms) {
      if (!fold(`${term} ${def}`).includes(q)) continue
      // Un término sin tema propio (los de Organización) vive solo en el glosario.
      const slug = group.slug ?? 'glosario'
      hits.push({ to: `/ayuda/${slug}`, title: term, context: def })
    }
  }

  return hits.slice(0, 6)
}
