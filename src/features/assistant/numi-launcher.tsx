import { type Ref } from 'react'
import { cn } from '@/lib/utils'
import { NumiAppMark } from './numi-avatar'
import { useLauncherPosition } from './use-launcher-position'

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
 *
 * **Se puede arrastrar** (`useLauncherPosition`): flota sobre el contenido y en
 * algunas pantallas tapa justo lo que se mira. Se queda donde lo dejes —también
 * al recargar— y vuelve a encajar solo si lo sueltas cerca de su esquina.
 */
export function NumiLauncher({
  onClick,
  ref,
}: {
  onClick: () => void
  ref?: Ref<HTMLButtonElement>
}) {
  const { position, dragging, onPointerDown, wasDragged } = useLauncherPosition()

  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={onPointerDown}
      onClick={() => {
        if (!wasDragged()) onClick()
      }}
      aria-label="Abrir el chat con Numi"
      title="Abrir el chat con Numi · arrástralo si estorba"
      style={{ right: position.right, bottom: position.bottom }}
      className={cn(
        'fixed z-50 hidden size-14 touch-none place-items-center rounded-[28%] lg:grid',
        'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        // Sin transición mientras se arrastra: el botón tiene que ir pegado al
        // puntero, no persiguiéndolo.
        dragging ? 'scale-105 cursor-grabbing' : 'cursor-grab transition-transform hover:scale-105 active:scale-95',
      )}
    >
      <NumiAppMark className="drop-shadow-lg" />
    </button>
  )
}
