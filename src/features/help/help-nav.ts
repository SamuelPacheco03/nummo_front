import { Home } from 'lucide-react'
import type { SectionGroup } from '@/components/ui/sectioned-layout'
import { TOPICS } from './topics'

/**
 * La navegación de la guía, derivada de los temas.
 *
 * Se calcula y no se escribe a mano a propósito: un tema nuevo aparece en la
 * navegación por existir. La lista escrita aparte es la que se olvida de
 * actualizar.
 */
export const HELP_GROUPS: SectionGroup[] = [
  // `end` porque `/ayuda` es prefijo de todos los temas: sin él, la portada se
  // quedaría marcada como activa en cada uno.
  { title: 'Guía', items: [{ to: '/ayuda', label: 'Portada', Icon: Home, end: true }] },
  ...TOPICS.reduce<SectionGroup[]>((groups, topic) => {
    const group = groups.find((g) => g.title === topic.group)
    const item = { to: `/ayuda/${topic.slug}`, label: topic.label, Icon: topic.Icon }
    if (group) group.items.push(item)
    else groups.push({ title: topic.group, items: [item] })
    return groups
  }, []),
]
