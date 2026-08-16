import { useEffect, useRef } from 'react'
import { NumiLauncher } from './numi-launcher'
import { NumiPanel } from './numi-panel'
import { useNumiStore } from './numi-store'

/**
 * Punto de montaje del asistente: se cuelga una sola vez del shell autenticado
 * y queda disponible en toda la plataforma (el hilo sobrevive a la navegación
 * porque vive fuera del árbol de rutas).
 */
export function NumiWidget() {
  const isOpen = useNumiStore((s) => s.isOpen)
  const open = useNumiStore((s) => s.open)
  const close = useNumiStore((s) => s.close)
  const launcherRef = useRef<HTMLButtonElement>(null)

  const dismiss = () => {
    close()
    launcherRef.current?.focus()
  }

  // Esc cierra el panel desde cualquier punto (evento global del documento).
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        launcherRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  return (
    <>
      {isOpen && <NumiPanel onClose={dismiss} />}
      <NumiLauncher ref={launcherRef} open={isOpen} onClick={() => (isOpen ? dismiss() : open())} />
    </>
  )
}
