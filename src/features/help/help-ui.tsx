import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'

/**
 * Las piezas con las que está escrita la guía. Son de presentación pura: el
 * contenido vive en `topics.tsx` y las rutas en `help-nav.ts`.
 */

/** Párrafo de documentación. */
export function P({ children }: { children: ReactNode }) {
  /*
    `max-w-[68ch]` y no el ancho del contenedor: una línea de 1.100 px obliga al
    ojo a saltar de vuelta a ciegas y se relee la misma frase dos veces. Entre 60
    y 75 caracteres es lo que se lee sin esfuerzo, y es el único sitio de la app
    donde hay párrafos largos de verdad.
  */
  return <p className="text-muted-foreground max-w-[68ch] leading-relaxed">{children}</p>
}

/** Resalta un término dentro de un párrafo. */
export function T({ children }: { children: ReactNode }) {
  return <strong className="text-foreground font-medium">{children}</strong>
}

/**
 * Subtítulo dentro de un tema, con su ancla.
 *
 * El `#` aparece al pasar el ratón: en una documentación, poder enlazar un
 * apartado concreto es la diferencia entre mandar «mira la ayuda» y mandar la
 * respuesta.
 */
export function H2({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="font-display group scroll-mt-24 text-lg font-semibold">
      {children}
      <a
        href={`#${id}`}
        aria-label={`Enlace a «${children}»`}
        className="text-muted-foreground ml-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        #
      </a>
    </h2>
  )
}

/** Un apartado: subtítulo y su contenido, con el aire que los agrupa. */
export function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <H2 id={id}>{title}</H2>
      {children}
    </section>
  )
}

/**
 * El recorrido de una cosa, en fichas encadenadas.
 *
 * Sustituye a dos párrafos que decían «un acuerdo genera cuentas por cobrar →
 * registras un pago»: la flecha ya estaba en el texto, así que el texto ya era
 * un diagrama mal dibujado.
 */
export function Flow({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {steps.map((step, i) => (
        <Fragment key={step}>
          {i > 0 && <ArrowRight aria-hidden className="text-muted-foreground size-4 shrink-0" />}
          <span className="bg-secondary text-secondary-foreground rounded-md px-2.5 py-1.5 text-sm font-medium">
            {step}
          </span>
        </Fragment>
      ))}
    </div>
  )
}

/** Lista de definiciones: término a la izquierda, explicación a la derecha. */
export function DefList({ items }: { items: { term: string; def: string }[] }) {
  return (
    <dl className="divide-y rounded-lg border">
      {items.map((it) => (
        <div key={it.term} className="grid gap-1 p-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
          <dt className="font-medium">{it.term}</dt>
          <dd className="text-muted-foreground text-sm leading-relaxed">{it.def}</dd>
        </div>
      ))}
    </dl>
  )
}

export type State = { label: string; tone: StatusTone; def: string }

/** Lo mismo, pero el término es la insignia que se ve en las listas. */
export function StateList({ title, states }: { title?: string; states: State[] }) {
  return (
    <div className="space-y-2">
      {title && <h3 className="text-sm font-medium">{title}</h3>}
      <ul className="divide-y rounded-lg border">
        {states.map((s) => (
          <li
            key={s.label}
            className="grid gap-1 p-3 sm:grid-cols-[10rem_1fr] sm:items-baseline sm:gap-4"
          >
            <StatusBadge tone={s.tone} label={s.label} className="font-medium" />
            <span className="text-muted-foreground text-sm leading-relaxed">{s.def}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Enlace a la pantalla real de la que habla el tema. */
export function GoTo({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      className={cn('text-brand inline-flex items-center gap-1 text-sm font-medium hover:underline', className)}
    >
      {children}
      <ArrowRight aria-hidden className="size-3.5" />
    </Link>
  )
}
