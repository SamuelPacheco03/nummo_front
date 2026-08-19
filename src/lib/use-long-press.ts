import { useCallback, useEffect, useRef } from 'react'

/** Lo que tarda un toque quieto en convertirse en selección. Es el de WhatsApp. */
const HOLD_MS = 500

/** Cuánto puede moverse el dedo sin dejar de ser una pulsación. Menos, y hacer scroll selecciona. */
const SLOP_PX = 10

/**
 * Mantener pulsado para seleccionar, como en WhatsApp.
 *
 * Devuelve los manejadores que hay que poner en el elemento. Se cancela al mover el dedo
 * —el hilo se desplaza más de lo que se pulsa— y al soltar antes de tiempo.
 *
 * Se apoya en eventos de puntero y no de toque para no escribir el gesto dos veces; quien
 * llame decide si lo ofrece, que en escritorio no tiene sentido.
 */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    origin.current = null
  }, [])

  // Si el mensaje se va de la pantalla a media pulsación, el temporizador se va con él.
  useEffect(() => cancel, [cancel])

  return {
    onPointerDown: (e: React.PointerEvent) => {
      origin.current = { x: e.clientX, y: e.clientY }
      timer.current = setTimeout(() => {
        timer.current = null
        onLongPress()
      }, HOLD_MS)
    },
    onPointerMove: (e: React.PointerEvent) => {
      const from = origin.current
      if (!from || !timer.current) return
      if (Math.abs(e.clientX - from.x) > SLOP_PX || Math.abs(e.clientY - from.y) > SLOP_PX) {
        cancel()
      }
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    /*
      El menú del sistema se lleva el gesto: en Android una pulsación larga abre el de
      seleccionar texto, y entonces la selección del mensaje no llega a verse.
    */
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }
}
