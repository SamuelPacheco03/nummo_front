import { type ComponentProps, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Drawer } from '@/components/ui/drawer'
import { useKeepFilters } from '@/lib/use-list-filters'
import { cn } from '@/lib/utils'

/**
 * Cajón de detalle: la ficha de un registro sin abandonar su lista.
 *
 * Es `Drawer` (§94) atado a una **ruta hija** de la lista (ver `router.tsx`): la
 * lista sigue montada detrás y `closeTo` es la ruta a la que se vuelve al
 * cerrar, de modo que la URL del detalle se puede compartir y recargar. Todo lo
 * demás —el eje, la cabecera, el pie fijo— lo pone el panel.
 *
 * **Cerrar devuelve a la lista tal como estaba** (§21.1): los criterios viajan
 * en la URL, así que vuelven con ella.
 */
export function DetailDrawer({
  closeTo,
  ...panel
}: Omit<ComponentProps<typeof Drawer>, 'open' | 'onOpenChange'> & {
  /** Ruta de la lista: a donde se navega al cerrar. */
  closeTo: string
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const keepFilters = useKeepFilters()

  /*
    Los criterios vuelven **solo si volvemos a nuestra propia lista**, de la que
    esta ficha es ruta hija. `closeTo` no siempre lo es: registrar un pago desde
    una cuenta por cobrar cierra hacia la cuenta (§34, el «volver» del enlace), y
    ahí las mismas claves —`estado`, `orden`, `pagina`— filtrarían una lista que
    no es la suya.
  */
  const backToOwnList = pathname === closeTo || pathname.startsWith(`${closeTo}/`)

  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) navigate(backToOwnList ? keepFilters(closeTo) : closeTo)
      }}
      {...panel}
    />
  )
}

/**
 * Bloque titulado dentro de una ficha.
 *
 * Título **en frase y del color del texto**, no en versaditas grises: así se lee
 * antes que la tabla que encabeza, y no arrastra el tic de plantilla que §11.1
 * prohíbe. Las versaditas se quedan donde sí significan algo —las cabeceras de
 * una tabla de datos—, no en los títulos de contenido.
 */
export function DetailSection({
  title,
  action,
  children,
}: {
  title: string
  /** Lo que se hace con esta sección: un interruptor, un botón. */
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      {/* El título y su acción en la misma línea: bajarla la dejaría flotando
          entre dos secciones sin decir de cuál es. */}
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {action}
      </div>
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
