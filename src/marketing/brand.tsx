import { cn } from '@/lib/utils'

/**
 * El logotipo de la portada: isotipo en su cuadrado oscuro y la palabra al lado.
 *
 * Vive aquí y no en `components/` porque de momento solo lo usan la navegación y el pie
 * de la portada. En cuanto un tercer sitio lo pida, sube (§64).
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className="grid size-8 place-items-center rounded-lg bg-sidebar text-sidebar-foreground"
        aria-hidden
      >
        <span className="text-base font-semibold leading-none">n</span>
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">Nummo</span>
    </span>
  )
}
