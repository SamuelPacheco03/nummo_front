import { type Ref } from 'react'
import { Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
        'bg-brand-gradient fixed right-4 bottom-4 z-50 grid size-13 place-items-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95',
        'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        // En móvil el panel ocupa toda la pantalla: el botón estorbaría.
        open && 'hidden sm:grid',
      )}
    >
      {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
    </button>
  )
}
