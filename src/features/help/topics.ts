import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  BookOpen,
  CircleDot,
  Coins,
  ListChecks,
  ShieldCheck,
  Tags,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Caja,
  Cobrar,
  ComoFunciona,
  Estados,
  Glosario,
  Informes,
  Pagar,
  PrimerosPasos,
  Roles,
} from './help-content'

export interface Topic {
  slug: string
  /** Corto, para la navegación y las tarjetas. */
  label: string
  title: string
  /** Una línea: se usa de entradilla y de resumen en la portada. */
  lead: string
  Icon: LucideIcon
  group: string
  Content: () => ReactNode
}

/**
 * La guía, repartida en temas.
 *
 * Antes era **una sola página de 6.473 px**: nueve secciones y sesenta
 * definiciones con el mismo peso visual, donde «¿Qué es Nummo?» —tres líneas— se
 * anunciaba igual que el glosario entero. El índice llevaba a un ancla dentro del
 * muro y ahí ya no sabías ni dónde estabas ni cuánto quedaba.
 *
 * El orden es el de aprendizaje, no el del modelo de datos: primero qué es y por
 * dónde empezar, después las tareas —cobrar, pagar, caja, informes— y al final lo
 * que se consulta y no se lee, que son tablas. De ese orden salen la navegación
 * (`help-nav.ts`), las tarjetas de la portada y los enlaces «anterior /
 * siguiente», así que mover un tema aquí lo mueve en los cuatro sitios.
 */
export const TOPICS: Topic[] = [
  {
    slug: 'como-funciona',
    label: 'Cómo funciona',
    title: 'Cómo funciona Nummo',
    lead: 'Qué hace Nummo y cómo se mueve el dinero por dentro.',
    Icon: BookOpen,
    group: 'Empezar',
    Content: ComoFunciona,
  },
  {
    slug: 'primeros-pasos',
    label: 'Primeros pasos',
    title: 'Primeros pasos',
    lead: 'Los seis pasos para dejar Nummo listo, en orden.',
    Icon: ListChecks,
    group: 'Empezar',
    Content: PrimerosPasos,
  },
  {
    slug: 'cobrar',
    label: 'Cobrar',
    title: 'Cobrar: cartera y pagos',
    lead: 'Acuerdos, cuentas por cobrar, pagos y mora.',
    Icon: Coins,
    group: 'Usar Nummo',
    Content: Cobrar,
  },
  {
    slug: 'pagar',
    label: 'Pagar',
    title: 'Pagar: gastos y egresos',
    lead: 'Gastos recurrentes, cuentas por pagar y egresos.',
    Icon: Banknote,
    group: 'Usar Nummo',
    Content: Pagar,
  },
  {
    slug: 'caja',
    label: 'Caja',
    title: 'Caja y movimientos',
    lead: 'Dónde está tu dinero y cómo se mueve entre cuentas.',
    Icon: ArrowLeftRight,
    group: 'Usar Nummo',
    Content: Caja,
  },
  {
    slug: 'informes',
    label: 'Panel e informes',
    title: 'Panel e informes',
    lead: 'Qué significa cada cifra y cómo exportarla.',
    Icon: BarChart3,
    group: 'Usar Nummo',
    Content: Informes,
  },
  {
    slug: 'estados',
    label: 'Estados',
    title: 'Estados',
    lead: 'Qué quiere decir cada etiqueta de color.',
    Icon: CircleDot,
    group: 'Referencia',
    Content: Estados,
  },
  {
    slug: 'roles',
    label: 'Roles y permisos',
    title: 'Roles y permisos',
    lead: 'Quién puede hacer qué dentro de la organización.',
    Icon: ShieldCheck,
    group: 'Referencia',
    Content: Roles,
  },
  {
    slug: 'glosario',
    label: 'Glosario',
    title: 'Glosario',
    lead: 'Todas las palabras de Nummo, agrupadas por tema.',
    Icon: Tags,
    group: 'Referencia',
    Content: Glosario,
  },
]

export function topicBySlug(slug: string | undefined): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug)
}
