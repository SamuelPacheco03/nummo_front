import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/stores/theme'
import { cn } from '@/lib/utils'

/**
 * El interruptor de tema de la portada: **un** botón, no tres.
 *
 * La consola usa `ThemeToggle`, un segmentado de Claro / Sistema / Oscuro, y ahí está bien:
 * es una preferencia que se configura una vez, entre otras opciones. En una barra de
 * portada ese bloque de tres pesa como si fuera una sección más del menú y compite con lo
 * único que esa barra tiene que conseguir, que es que pulsen «Probar Nummo».
 *
 * **El store es el mismo**: lo que cambia es el mando, no el estado. Quien elige oscuro
 * aquí entra a la consola en oscuro.
 *
 * «Sistema» deja de ser un botón y pasa a ser el punto de partida: mientras nadie toque
 * nada, manda el sistema. En cuanto alguien elige, manda su elección — que es justo lo que
 * hace falta en una página que se visita una vez.
 *
 * El estado llega **como prop** en vez de resolverlo aquí: la portada ya sabe en qué modo
 * se está pintando —y en desarrollo ese modo puede venir forzado por la URL—, así que
 * calcularlo otra vez daba un icono que anunciaba lo contrario de lo que se veía.
 */
export function ThemeButton({ dark, className }: { dark: boolean; className?: string }) {
  const setMode = useThemeStore((s) => s.setMode)

  /* El icono anuncia a dónde vas, no dónde estás: es lo que hace obvio qué va a pasar. */
  const Icon = dark ? Sun : Moon
  const etiqueta = dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'

  return (
    <button
      type="button"
      onClick={() => setMode(dark ? 'light' : 'dark')}
      aria-label={etiqueta}
      title={etiqueta}
      className={cn(
        // Hereda la superficie (§11.2): la barra es clara u oscura según el tema.
        'grid size-9 shrink-0 place-items-center rounded-full text-foreground/60 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className,
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}
