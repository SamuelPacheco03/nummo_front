import { cn } from '@/lib/utils'

/**
 * El titular de una sección de la portada: rótulo, primera línea en tinta y segunda en
 * `--heading-muted`.
 *
 * Es el gesto que la página repite en cinco secciones, así que existe **una vez** y no
 * cinco (§64). Lo que cambia entre secciones son las palabras; lo que no cambia es que la
 * segunda línea vive en el umbral de texto grande y por eso lleva su propio token y no
 * `--muted-foreground` (§97.6).
 *
 * El rótulo va en versalitas: §11.1 (3) las prohíbe en la consola y §97.1 las permite aquí
 * a razón de **una por sección**. Esta es la de cada sección que lo use.
 */
export function SectionHeading({
  rotulo,
  principal,
  secundaria,
  className,
  claro,
}: {
  rotulo: string
  principal: string
  secundaria: string
  className?: string
  /** Sobre una sección oscura, el rótulo necesita la tinta del shell. */
  claro?: boolean
}) {
  return (
    <div className={className}>
      <p
        className={cn(
          'text-[0.6875rem] font-semibold uppercase tracking-[0.16em]',
          claro ? 'text-sidebar-muted-foreground' : 'text-muted-foreground',
        )}
      >
        {rotulo}
      </p>
      <h2
        className={cn(
          'mt-5 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl',
          claro ? 'text-sidebar-foreground' : 'text-foreground',
        )}
      >
        <span className="block">{principal}</span>
        <span className={cn('block', claro ? 'text-sidebar-muted-foreground' : 'text-heading-muted')}>
          {secundaria}
        </span>
      </h2>
    </div>
  )
}
