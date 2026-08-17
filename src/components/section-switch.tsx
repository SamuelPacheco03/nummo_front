import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

/**
 * Salto entre dos pantallas espejo — lo que te deben y lo que debes.
 *
 * **Solo por debajo de `lg`.** En escritorio el sidebar ya tiene las dos a la
 * vista y esto sería una tercera forma de navegar a lo mismo; en móvil la
 * navegación vive en «Más», detrás de dos toques, y saltar de cobros a pagos es
 * justo lo que se hace cada dos minutos revisando la cartera.
 *
 * Va de enlaces, no de pestañas: son dos rutas de verdad, así que el botón
 * «atrás» funciona y cada una se puede compartir.
 */
export function SectionSwitch({
  options,
  className,
}: {
  options: { to: string; label: string }[]
  className?: string
}) {
  return (
    <nav
      aria-label="Cambiar de cartera"
      className={cn('bg-secondary flex gap-1 rounded-lg p-1 lg:hidden', className)}
    >
      {options.map((option) => (
        <NavLink
          key={option.to}
          to={option.to}
          className={({ isActive }) =>
            cn(
              'focus-visible:ring-ring/50 flex-1 rounded-md px-3 py-2 text-center text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none',
              isActive
                ? 'bg-card text-foreground font-medium shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )
          }
        >
          {option.label}
        </NavLink>
      ))}
    </nav>
  )
}
