import { type Ref } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NumiAvatar } from './numi-avatar'

/**
 * Botón flotante siempre presente (esquina inferior derecha, como los widgets
 * de soporte). Va aquí y no en la barra de navegación porque Numi acompaña a
 * cualquier pantalla: no es un destino al que se navega, es una ayuda que se
 * abre encima de lo que estés haciendo — y en móvil la barra superior ya está
 * ocupada por el menú y el usuario.
 */
export function NumiLauncher({
  open,
  onClick,
  ref,
}: {
  open: boolean
  onClick: () => void
  ref?: Ref<HTMLButtonElement>
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={open ? 'Cerrar el chat con Numi' : 'Abrir el chat con Numi'}
      aria-expanded={open}
      className={cn(
        'fixed right-4 bottom-4 z-50 grid size-14 place-items-center rounded-[28%] transition-transform hover:scale-105 active:scale-95',
        'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        // En móvil el panel ocupa toda la pantalla: el botón estorbaría.
        open && 'hidden sm:grid',
      )}
    >
      {open ? (
        // Abierto, la marca ya está en la cabecera del panel: aquí manda la
        // acción de cerrar.
        <span className="bg-card text-foreground grid size-12 place-items-center rounded-full border shadow-lg">
          <X className="size-5" />
        </span>
      ) : (
        <NumiAvatar className="size-14 drop-shadow-lg" />
      )}
    </button>
  )
}
