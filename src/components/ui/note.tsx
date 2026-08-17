import { type ReactNode } from 'react'
import { Info, Lightbulb, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'info' | 'warning' | 'tip'

const TONES: Record<Tone, { Icon: LucideIcon; box: string; icon: string }> = {
  info: { Icon: Info, box: 'border-brand/30 bg-brand/5', icon: 'text-brand' },
  warning: { Icon: TriangleAlert, box: 'border-warning/40 bg-warning/10', icon: 'text-warning' },
  tip: { Icon: Lightbulb, box: 'border-success/30 bg-success/10', icon: 'text-success' },
}

/**
 * **Aparte dentro de un texto**: el dato que hay que saber justo aquí y que se
 * pierde si va en un párrafo más.
 *
 * Tres tonos y ni uno más, porque cada tono nuevo hace que los otros signifiquen
 * menos: `info` para una precisión, `warning` para algo que puede salir mal y
 * `tip` para un atajo. La forma es la misma en los tres —borde tenue, fondo al
 * 5-10 % del color, icono— para que se lean como familia y no como cuatro
 * inventos distintos (§11.1: la jerarquía se hace con espacio, no con recuadros
 * cada vez más llamativos).
 *
 * Nació para la guía, pero no sabe nada de ella: sirve en cualquier pantalla.
 */
export function Note({
  tone = 'info',
  title,
  children,
}: {
  tone?: Tone
  title?: string
  children: ReactNode
}) {
  const { Icon, box, icon } = TONES[tone]
  return (
    <div className={cn('flex gap-3 rounded-lg border p-3.5 sm:p-4', box)}>
      <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', icon)} />
      <div className="min-w-0 space-y-1 text-sm leading-relaxed">
        {title && <p className="text-foreground font-medium">{title}</p>}
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}
