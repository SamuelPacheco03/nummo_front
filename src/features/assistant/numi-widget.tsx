import { useEffect, useRef } from 'react'
import { NumiLauncher } from './numi-launcher'
import { NumiPanel } from './numi-panel'
import { useNumiStore } from './numi-store'

/**
 * Punto de montaje del asistente: se cuelga una sola vez del shell autenticado
 * y queda disponible en toda la plataforma (el hilo sobrevive a la navegación
 * porque vive fuera del árbol de rutas).
 *
 * Botón y panel se turnan: con el chat abierto manda la X de la cabecera.
 */
export function NumiWidget() {
  const isOpen = useNumiStore((s) => s.isOpen)
  const open = useNumiStore((s) => s.open)
  const close = useNumiStore((s) => s.close)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)

  const dismiss = () => {
    restoreFocus.current = true
    close()
  }

  // El botón no existe mientras el chat está abierto, así que el foco se le
  // devuelve cuando vuelve a montarse, no en el mismo manejador que cierra.
  useEffect(() => {
    if (isOpen || !restoreFocus.current) return
    restoreFocus.current = false
    launcherRef.current?.focus()
  }, [isOpen])

  // Esc cierra el panel desde cualquier punto (evento global del documento).
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        restoreFocus.current = true
        close()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  return isOpen ? <NumiPanel onClose={dismiss} /> : <NumiLauncher ref={launcherRef} onClick={open} />
}
