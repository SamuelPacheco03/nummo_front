import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

/**
 * La sección no se pudo cargar (§45: el error es un estado de pantalla, no una
 * excepción que se traga).
 *
 * El mensaje sale de `getErrorMessage`, que traduce el error técnico a algo
 * comprensible y deja el detalle para la consola (§71). `onRetry` se pasa
 * cuando reintentar es realmente posible —normalmente `refetch` de la query—.
 */
export function ErrorState({
  error,
  title = 'No se pudo cargar',
  fallback,
  onRetry,
  className,
}: {
  error: unknown
  title?: string
  /** Mensaje cuando el error no trae uno propio. */
  fallback?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'border-destructive/40 bg-destructive/5 flex flex-col items-start gap-3 rounded-lg border p-4 text-sm sm:flex-row sm:items-center',
        className,
      )}
    >
      <AlertTriangle aria-hidden className="text-destructive size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-destructive font-medium">{title}</p>
        <p className="text-muted-foreground mt-0.5">{getErrorMessage(error, fallback)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
          <RefreshCw className="size-4" />
          Reintentar
        </Button>
      )}
    </div>
  )
}

/**
 * Error breve junto a un formulario o dentro de un cajón: mismo lenguaje visual
 * que `ErrorState`, pero sin icono ni reintento porque el siguiente paso lo da
 * el propio formulario (§72). Recibe el texto ya resuelto.
 */
export function InlineError({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      role="alert"
      className={cn(
        'border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm',
        className,
      )}
    >
      {children}
    </p>
  )
}
