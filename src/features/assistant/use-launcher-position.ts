import { useCallback, useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Sitio de casa: la esquina inferior derecha, a 16 px de los dos bordes. */
export const HOME = { right: 16, bottom: 16 } as const

/** Distancia de casa dentro de la cual el botón vuelve a encajar solo. */
const SNAP = 64

/** Margen mínimo con cualquier borde, para que no se salga ni se pegue. */
const EDGE = 8

/** Píxeles arrastrados a partir de los cuales esto fue un arrastre y no un clic. */
const DRAG_THRESHOLD = 4

export interface LauncherPosition {
  /** Distancia al borde derecho. */
  right: number
  /** Distancia al borde inferior. */
  bottom: number
}

interface PositionState {
  /** `null` = está en casa. Solo se guarda cuando el usuario lo movió de verdad. */
  position: LauncherPosition | null
  setPosition: (position: LauncherPosition | null) => void
}

/**
 * Dónde dejó el usuario el botón de Numi.
 *
 * `localStorage` y no `sessionStorage`: no es contexto de un rato como un filtro
 * (§21.1), es una preferencia del dispositivo —«en esta pantalla el botón me
 * estorba aquí»— y tiene que seguir puesta mañana.
 */
const usePositionStore = create<PositionState>()(
  persist(
    (set) => ({
      position: null,
      setPosition: (position) => set({ position }),
    }),
    { name: 'nummo-numi-launcher' },
  ),
)

const clamp = (value: number, max: number) => Math.min(Math.max(value, EDGE), Math.max(EDGE, max))

const distanceToHome = (p: LauncherPosition) =>
  Math.hypot(p.right - HOME.right, p.bottom - HOME.bottom)

/**
 * **Arrastrar el botón de Numi** y recordar dónde quedó.
 *
 * Existe porque el botón flota sobre el contenido y en algunas pantallas tapa
 * justo lo que se está mirando —una cifra del informe, la última fila de una
 * tabla—. Moverlo es más rápido que rediseñar cada pantalla para dejarle sitio.
 *
 * Tres decisiones que hacen que se sienta bien:
 *
 * 1. **Vuelve a casa solo.** Si se suelta cerca de la esquina de siempre, encaja
 *    ahí exacto y se olvida la posición guardada. Sin eso, «devolverlo a su
 *    sitio» sería un ejercicio de puntería y quedaría desalineado para siempre.
 * 2. **Se guarda como distancia a los bordes**, no como coordenadas absolutas:
 *    al cambiar el tamaño de la ventana el botón sigue igual de lejos de la
 *    esquina en la que lo dejaste, en vez de aparecer fuera de la pantalla.
 * 3. **Arrastrar no es hacer clic.** Hasta que no se mueven 4 px sigue siendo un
 *    clic normal; a partir de ahí, el clic que cierra el gesto se descarta.
 */
export function useLauncherPosition() {
  const stored = usePositionStore((s) => s.position)
  const setStored = usePositionStore((s) => s.setPosition)

  const [dragging, setDragging] = useState(false)
  /** Posición en vuelo mientras se arrastra; fuera del render para no ir a destiempo. */
  const [preview, setPreview] = useState<LauncherPosition | null>(null)
  const moved = useRef(false)

  const position = preview ?? stored ?? HOME

  /*
    La ventana puede haber encogido desde la última vez —otra pantalla, otro
    zoom— y dejar el botón fuera. Se recoloca al montar en vez de al soltar.
  */
  useEffect(() => {
    if (!stored) return
    const right = clamp(stored.right, window.innerWidth - 72)
    const bottom = clamp(stored.bottom, window.innerHeight - 72)
    if (right !== stored.right || bottom !== stored.bottom) setStored({ right, bottom })
  }, [stored, setStored])

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      // Solo el botón principal del ratón; el secundario abre el menú del sistema.
      if (event.button !== 0) return
      const start = { x: event.clientX, y: event.clientY }
      const from = stored ?? HOME
      moved.current = false
      setDragging(true)

      /*
        Capturar el puntero **es lo que hace que el arrastre funcione**, no un
        adorno: el botón se va de debajo del cursor en cuanto empieza a moverse y
        el navegador cancela el gesto al segundo movimiento (`pointercancel`).
        Con la captura, el botón sigue siendo el destino de los eventos hasta que
        se suelta.

        Con guarda porque jsdom no implementa esta API y tumbaba los tests del
        widget; ahí no hay arrastre que capturar.
      */
      const target = event.currentTarget
      if (typeof target.setPointerCapture === 'function') target.setPointerCapture(event.pointerId)

      const onMove = (e: PointerEvent) => {
        const dx = start.x - e.clientX
        const dy = start.y - e.clientY
        if (!moved.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) moved.current = true
        if (!moved.current) return
        setPreview({
          right: clamp(from.right + dx, window.innerWidth - 72),
          bottom: clamp(from.bottom + dy, window.innerHeight - 72),
        })
      }

      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        setDragging(false)
        setPreview((current) => {
          if (moved.current) setStored(current && distanceToHome(current) > SNAP ? current : null)
          return null
        })
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      // Si el sistema aborta el gesto, se cierra donde esté en vez de quedarse
      // el botón pegado al puntero para siempre.
      window.addEventListener('pointercancel', onUp)
    },
    [stored, setStored],
  )

  /** El clic que cierra un arrastre no abre el chat. */
  const wasDragged = useCallback(() => moved.current, [])

  return { position, dragging, onPointerDown, wasDragged }
}
