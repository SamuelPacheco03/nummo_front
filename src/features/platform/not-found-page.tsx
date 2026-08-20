import { Link, Navigate, useLocation } from 'react-router'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { notificationRoute } from '@/features/notifications/deep-link'

/**
 * **Cualquier otra ruta.** Hace dos cosas, y las dos hacían falta.
 *
 * La primera es tener una: sin un `*` el router enseñaba su propia pantalla de
 * error —en inglés, sin la navegación de la aplicación—, así que una URL vieja
 * de un enlace compartido dejaba a quien la abría sin manera de volver.
 *
 * La segunda es **rescatar el destino de un aviso que entra desde fuera del
 * cliente**. El centro de notificaciones traduce el `deepLink` antes de navegar
 * (§95.16), pero el service worker de Web Push no puede: es un script clásico
 * que abre la URL tal cual, y ahí no hay router al que preguntar. Cayendo aquí,
 * la traducción ocurre igual y el aviso llega a su ficha en vez de a un 404.
 * Cuando el backend publique las rutas de verdad esto no traduce nada y esta
 * pantalla se queda solo con su primer trabajo.
 */
export function NotFoundPage() {
  const { pathname, search } = useLocation()
  const here = pathname + search
  const bridged = notificationRoute(here)

  // `replace`: la ruta que no existe no tiene por qué quedarse en el historial.
  if (bridged && bridged !== here) return <Navigate to={bridged} replace />

  return (
    <EmptyState
      Icon={Compass}
      title="No encontramos esa pantalla"
      description="El enlace puede estar mal escrito, o llevar a algo que ya no está."
      action={
        <Button asChild>
          <Link to="/">Ir al inicio</Link>
        </Button>
      }
    />
  )
}
