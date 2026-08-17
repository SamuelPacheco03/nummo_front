import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { ArrowDownToLine } from 'lucide-react'
import { applyUpdate, startAppUpdates, useAppUpdate } from './app-update'

/** Un `id` fijo: el aviso de versión nueva es siempre el mismo y nunca se apila. */
const TOAST_ID = 'app-update'

/**
 * **El aviso de versión nueva.**
 *
 * `registerType: 'prompt'` (vite.config): NO recargamos solos. En una consola
 * financiera alguien puede estar a medio formulario, así que la recarga la
 * dispara el usuario.
 *
 * Dos cosas que este aviso hace distinto al resto (§11.1.5):
 *
 * - **No caduca y no se cierra solo.** Los cuatro segundos de un «Pago
 *   registrado» aquí serían una versión nueva que pasa de largo mientras miras
 *   otra pestaña.
 * - **Vuelve.** Si se descarta, reaparece al volver a la pestaña: la versión
 *   vieja sigue ahí y callarse no la arregla. «Después» aplaza; no cancela.
 *
 * El estado y la detección viven en `app-update.ts`; aquí solo se pinta.
 */
export function PwaUpdater() {
  const { state, offlineReady } = useAppUpdate()
  const offlineShown = useRef(false)

  useEffect(() => {
    startAppUpdates()
  }, [])

  useEffect(() => {
    if (!offlineReady || offlineShown.current) return
    offlineShown.current = true
    toast.success('Nummo está lista para usarse sin conexión')
  }, [offlineReady])

  useEffect(() => {
    if (state !== 'ready') return

    const show = () => {
      toast('Hay una versión nueva', {
        id: TOAST_ID,
        description: 'Al recargar se aplica. Se perderán los cambios sin guardar.',
        duration: Infinity,
        icon: <ArrowDownToLine aria-hidden className="text-brand size-4" />,
        className: 'before:bg-brand',
        // Una sola acción. Un «Después» al lado deja al texto un palmo de ancho,
        // y para aplazar ya está la X: aquí cerrar **es** aplazar, porque el
        // aviso vuelve al volver a la pestaña.
        action: { label: 'Actualizar', onClick: () => applyUpdate() },
      })
    }

    show()
    // Volver a la pestaña lo vuelve a poner: descartarlo aplaza el aviso, no la
    // actualización.
    const onVisible = () => {
      if (document.visibilityState === 'visible') show()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [state])

  return null
}
