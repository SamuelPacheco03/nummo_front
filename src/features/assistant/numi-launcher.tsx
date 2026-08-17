import { type Ref } from 'react'
import { cn } from '@/lib/utils'
import { NumiAppMark } from './numi-avatar'

/**
 * Botón flotante de escritorio (esquina inferior derecha, como los widgets de
 * soporte). Numi acompaña a cualquier pantalla: no es un destino al que se
 * navega, es una ayuda que se abre encima de lo que estés haciendo.
 *
 * **Solo desde `lg`**: en móvil Numi tiene su sitio en la barra de navegación
 * inferior, y el botón flotante se solaparía con ella.
 *
 * Solo existe con el chat cerrado: abierto, estorbaría sobre el composer y
 * duplicaría la X de la cabecera, que es la que cierra.
 */
export function NumiLauncher({ onClick, ref }: { onClick: () => void; ref?: Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label="Abrir el chat con Numi"
      className={cn(
        'fixed right-4 bottom-4 z-50 hidden size-14 place-items-center rounded-[28%] transition-transform hover:scale-105 active:scale-95 lg:grid',
        'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
      )}
    >
      <NumiAppMark className="drop-shadow-lg" />
    </button>
  )
}
