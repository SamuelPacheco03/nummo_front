import { type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Cajón de detalle: la ficha de un registro sin abandonar su lista.
 *
 * En ≥sm entra flotando desde la derecha (con margen y esquinas redondeadas);
 * por debajo, como hoja desde abajo, que es el gesto esperado en móvil. La
 * animación vive en `index.css` (`.animate-drawer`) porque cambia de eje con el
 * breakpoint y eso no se expresa bien con las utilidades de entrada/salida.
 *
 * Va montado sobre Radix Dialog, así que hereda foco atrapado, cierre con Esc,
 * bloqueo del scroll de fondo y los roles ARIA correctos.
 *
 * Se usa desde una ruta hija de la lista (ver `router.tsx`): la lista sigue
 * montada detrás y `closeTo` es la ruta a la que se vuelve al cerrar, de modo
 * que la URL del detalle se puede compartir y recargar.
 */
export function DetailDrawer({
  closeTo,
  title,
  meta,
  amount,
  actions,
  loading = false,
  error,
  children,
}: {
  /** Ruta de la lista: a donde se navega al cerrar. */
  closeTo: string
  title?: ReactNode
  /** Línea bajo el título: estado, categoría, propósito… */
  meta?: ReactNode
  /** Cifra protagonista de la cabecera (el dato por el que se abre la ficha). */
  amount?: ReactNode
  /** Botones de la cabecera. */
  actions?: ReactNode
  loading?: boolean
  error?: string | null
  children?: ReactNode
}) {
  const navigate = useNavigate()

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) navigate(closeTo)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] dark:bg-slate-950/65"
        />
        <DialogPrimitive.Content
          // Sin descripción: el contenido de la ficha ya cumple ese papel y
          // Radix avisa por consola si apuntamos a un id que no existe.
          aria-describedby={undefined}
          className={cn(
            'animate-drawer bg-card text-card-foreground fixed z-50 flex flex-col overflow-hidden border shadow-2xl',
            'inset-x-0 top-14 bottom-0 rounded-t-2xl',
            'sm:inset-y-4 sm:right-4 sm:left-auto sm:w-[30rem] sm:max-w-[calc(100%-2rem)] sm:rounded-xl',
          )}
        >
          {/* Tirador: solo en la hoja móvil, donde se arrastra con el pulgar. */}
          <div className="bg-border mx-auto mt-2 h-1 w-9 shrink-0 rounded-full sm:hidden" />

          <div className="flex-none border-b px-5 pt-4 pb-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {loading ? (
                  <>
                    <DialogPrimitive.Title className="sr-only">Cargando detalle</DialogPrimitive.Title>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="mt-2 h-4 w-32" />
                  </>
                ) : (
                  <>
                    <DialogPrimitive.Title className="font-display truncate text-lg font-semibold">
                      {title}
                    </DialogPrimitive.Title>
                    {meta && <div className="text-muted-foreground mt-1 text-sm">{meta}</div>}
                  </>
                )}
              </div>
              <DialogPrimitive.Close
                className="text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-ring/50 -mt-1 -mr-1 shrink-0 rounded-md p-1.5 transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>

            {loading ? (
              <Skeleton className="mt-3 h-8 w-40" />
            ) : (
              amount && <p className="nums mt-3 text-2xl font-semibold tracking-tight">{amount}</p>
            )}

            {!loading && actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
            {loading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
              </>
            ) : error ? (
              <p className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
                {error}
              </p>
            ) : (
              children
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Bloque con título en versalitas dentro del cajón. */
export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{title}</h3>
      {children}
    </section>
  )
}

/** Contenedor de filas etiqueta/valor. */
export function DetailRows({ children }: { children: ReactNode }) {
  return <div className="divide-y rounded-lg border">{children}</div>
}

/** Fila etiqueta/valor. Se omite sola si no hay valor, para no dejar huecos. */
export function DetailRow({
  label,
  children,
  strong,
}: {
  label: string
  children: ReactNode
  strong?: boolean
}) {
  if (children == null || children === '') return null
  return (
    <div className="flex items-baseline justify-between gap-4 px-3.5 py-2.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn('nums min-w-0 text-right break-words', strong && 'font-semibold')}>
        {children}
      </span>
    </div>
  )
}

/** Vacío de una sección de la ficha (sin asignaciones, sin movimientos…). */
export function DetailEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground rounded-lg border p-5 text-center text-sm">{children}</p>
  )
}
