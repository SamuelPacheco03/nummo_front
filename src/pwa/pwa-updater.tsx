import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from 'sonner'

/**
 * Registra el service worker y avisa cuando hay una versión nueva.
 *
 * `registerType: 'prompt'` (vite.config): NO recargamos solos. En una consola
 * financiera alguien puede estar a medio formulario, así que la recarga la
 * dispara el usuario desde el toast.
 */
export function PwaUpdater() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Chrome solo busca actualizaciones al navegar; instalada como app puede
      // estar abierta días. Comprobamos cada hora.
      if (!registration) return
      setInterval(() => void registration.update(), 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (!offlineReady) return
    toast.success('Nummo está lista para usarse sin conexión')
    setOfflineReady(false)
  }, [offlineReady, setOfflineReady])

  useEffect(() => {
    if (!needRefresh) return
    toast('Hay una versión nueva de Nummo', {
      description: 'Recarga para aplicarla. Se perderán los cambios sin guardar.',
      duration: Infinity,
      action: {
        label: 'Actualizar',
        onClick: () => void updateServiceWorker(true),
      },
      onDismiss: () => setNeedRefresh(false),
    })
  }, [needRefresh, setNeedRefresh, updateServiceWorker])

  return null
}
