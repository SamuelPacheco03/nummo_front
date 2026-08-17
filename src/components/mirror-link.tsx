import { Link, useLocation } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Salto a la pantalla espejo — de lo que te deben a lo que debes, y al revés.
 *
 * **Solo por debajo de `lg`.** En escritorio el sidebar ya tiene las dos a la
 * vista y esto sería una tercera forma de navegar a lo mismo; en móvil la
 * navegación vive en «Más», detrás de dos toques, y saltar de cobros a pagos es
 * justo lo que se hace cada dos minutos revisando la cartera.
 *
 * Es **un** enlace, no dos pestañas. Un par de botones al estilo pestaña
 * prometía que las dos vistas son hermanas dentro de una misma pantalla, y no lo
 * son: son secciones distintas del menú, cada una con su cabecera y sus
 * acciones. Además duplicaba en pantalla la que ya estás mirando. Así solo se
 * anuncia lo que no ves, y pesa una línea de texto en vez de una barra.
 *
 * Va de enlace de verdad, no de pestaña: el botón «atrás» funciona y la ruta se
 * puede compartir.
 */
export function MirrorLink({
  options,
  className,
}: {
  /** El par de rutas espejo; se enlaza la que no estás viendo. */
  options: { to: string; label: string }[]
  className?: string
}) {
  const { pathname } = useLocation()
  const other = options.find((option) => !pathname.startsWith(option.to))
  if (!other) return null

  return (
    <Link
      to={other.to}
      className={cn(
        'text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -mt-2 inline-flex items-center gap-1.5 rounded-md text-sm transition-colors pointer-coarse:min-h-11 focus-visible:ring-[3px] focus-visible:outline-none lg:hidden',
        className,
      )}
    >
      Ver {other.label}
      <ArrowRight aria-hidden className="size-3.5" />
    </Link>
  )
}
