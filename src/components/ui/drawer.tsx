import { type ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useFocusReturn } from '@/lib/use-focus-return'
import { Skeleton } from '@/components/ui/skeleton'
import { InlineError } from '@/components/ui/error-state'
import { cn } from '@/lib/utils'

/**
 * **El panel lateral de la app.** Hoja desde abajo en móvil, cajón flotante por
 * la derecha desde `sm`.
 *
 * Es una sola pieza a propósito. Antes había dos: el cajón de detalle traía su
 * propio Radix Dialog y la hoja de filtros montaba otro sobre `Sheet`, con
 * anchos, esquinas y cabeceras distintas — dos cosas que el usuario lee como la
 * misma y que se iban separando cada vez que alguien tocaba una. Todo lo que se
 * abra «de lado» pasa por aquí (§94: reutiliza antes de crear).
 *
 * Quién decide **cuándo** está abierto no es asunto suyo: recibe `open` y
 * `onOpenChange`. Sobre eso se montan las dos formas de abrirlo que usa la app:
 *
 * - `DetailDrawer` — atado a una ruta hija, para lo que se comparte y se recarga.
 * - `FilterSheet` y compañía — atado a un `useState`, para lo efímero.
 *
 * La animación vive en `index.css` (`.animate-drawer`) porque cambia de eje con
 * el breakpoint, y eso no se expresa con las utilidades de entrada/salida:
 * mezclar `slide-in-from-bottom` con `sm:slide-in-from-right` deja las dos
 * traslaciones activas y el panel entra en diagonal.
 *
 * Va sobre Radix Dialog, así que hereda foco atrapado, cierre con Esc, bloqueo
 * del scroll de fondo y los roles ARIA correctos.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  meta,
  amount,
  actions,
  loading = false,
  error,
  footer,
  fit = false,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: ReactNode
  /** Línea bajo el título: estado, categoría, propósito… */
  meta?: ReactNode
  /** Cifra protagonista de la cabecera (el dato por el que se abre el panel). */
  amount?: ReactNode
  /** Botones de la cabecera. */
  actions?: ReactNode
  loading?: boolean
  error?: string | null
  /** Pie fijo. Los formularios ponen aquí Guardar/Cancelar; las fichas no lo usan. */
  footer?: ReactNode
  /**
   * En móvil, alto según el contenido en vez de hasta arriba (tope: 88vh).
   *
   * Para paneles cortos —cuatro filtros y un botón—: llegar hasta el borde
   * superior deja media pantalla en blanco y parece que falta algo por cargar.
   * En escritorio no cambia nada: el cajón lateral va a alto completo siempre.
   */
  fit?: boolean
  children?: ReactNode
}) {
  const foco = useFocusReturn()
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-scrim backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          // Sin descripción: el contenido ya cumple ese papel y Radix avisa por
          // consola si apuntamos a un id que no existe.
          aria-describedby={undefined}
          {...foco}
          className={cn(
            'animate-drawer bg-card text-card-foreground fixed z-50 flex flex-col overflow-hidden border shadow-2xl',
            'inset-x-0 bottom-0 rounded-t-2xl',
            fit ? 'max-h-[88vh]' : 'top-14',
            'sm:inset-y-4 sm:right-4 sm:left-auto sm:max-h-none sm:w-[30rem] sm:max-w-[calc(100%-2rem)] sm:rounded-xl',
          )}
        >
          {/* Tirador: solo en la hoja móvil, donde se arrastra con el pulgar. */}
          <div className="bg-border mx-auto mt-2 h-1 w-9 shrink-0 rounded-full sm:hidden" />

          <div className="flex-none border-b px-5 pt-4 pb-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {loading ? (
                  <>
                    <DialogPrimitive.Title className="sr-only">
                      Cargando detalle
                    </DialogPrimitive.Title>
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

          <div
            className={cn(
              'scrollbar-slim flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6',
              // Sin pie, el respiro de abajo lo pone el propio cuerpo; con pie,
              // lo pone el pie, que es quien toca el borde de la pantalla.
              !footer && 'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
            )}
          >
            {loading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
              </>
            ) : error ? (
              <InlineError>{error}</InlineError>
            ) : (
              children
            )}
          </div>

          {/*
            Pie fijo fuera del área con scroll: en un formulario, Guardar tiene
            que estar visible sin llegar al final de los campos.
          */}
          {!loading && !error && footer && (
            <div className="bg-card flex-none border-t px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
