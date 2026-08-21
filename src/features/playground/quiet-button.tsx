import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * **La acción secundaria de un panel**: «ver la traza», «ver todas las organizaciones»,
 * «volver al vigente».
 *
 * No es `Button variant="link"` a propósito: aquel va en color de marca y pesa lo mismo
 * que el enlace de una frase. Estas son salidas laterales de una pantalla de diagnóstico
 * —siempre debajo de lo que de verdad importa— y por eso van en gris, pequeñas, y solo se
 * subrayan al pasar por encima.
 *
 * Existe porque el mismo `className` de nueve utilidades estaba copiado siete veces en
 * seis archivos: el día que el foco o el subrayado cambien, cambian aquí (CLAUDE.md:
 * «nada por duplicado»).
 */
export function QuietButton({
  onClick,
  children,
  className,
}: {
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-muted-foreground hover:text-foreground rounded text-xs underline-offset-4 transition-colors hover:underline',
        'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        className,
      )}
    >
      {children}
    </button>
  )
}
