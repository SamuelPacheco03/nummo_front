import { useSyncExternalStore } from 'react'
import { WifiOff } from 'lucide-react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/**
 * Aviso de "sin conexión". Nummo lee todos sus datos del API, así que offline
 * el shell abre pero las pantallas no se pueden refrescar: mejor decirlo.
 */
export function OfflineIndicator() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )

  if (online) return null

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-2 py-1.5 text-xs text-foreground"
    >
      <WifiOff className="size-3.5 shrink-0 text-warning" />
      Sin conexión
    </div>
  )
}
