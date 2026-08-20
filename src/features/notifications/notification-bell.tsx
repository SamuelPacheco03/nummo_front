import { Bell } from 'lucide-react'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { cn } from '@/lib/utils'
import { useUnreadNotifications } from './hooks'

/** Más de esto no cabe en el globo sin deformar el botón. */
const MAX_BADGE = 99

/**
 * La campana de la cabecera, con el número de avisos sin leer.
 *
 * **Solo el botón.** El panel se monta una vez en el shell (§94: hay un solo
 * `Drawer`), porque la cabecera de escritorio y la de móvil están las dos en el
 * DOM y montarlo aquí dejaría dos paneles vivos que se desincronizan al cambiar
 * de tamaño la ventana.
 *
 * Decide ella si existe: sin `notifications.read` no hay campana. Ofrecer un
 * botón que abre una lista que va a responder 403 es peor que no ofrecerlo
 * (§47).
 *
 * El globo va en `brand` y no en rojo: el rojo de §7 significa vencido o
 * fallido, y «tienes tres avisos» no es ninguna de las dos cosas. Es el mismo
 * criterio que el punto de Numi.
 */
export function NotificationBell({
  onClick,
  className,
}: {
  onClick: () => void
  className?: string
}) {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const { unread } = useUnreadNotifications(orgId)

  if (!can('notifications.read')) return null

  const badge = unread > MAX_BADGE ? `${MAX_BADGE}+` : String(unread)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        unread > 0 ? `Notificaciones · ${unread} sin leer` : 'Notificaciones'
      }
      className={cn(
        'text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 relative grid size-9 shrink-0 place-items-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none',
        className,
      )}
    >
      <Bell aria-hidden className="size-5" />
      {unread > 0 && (
        <span
          aria-hidden
          className="bg-brand text-primary-foreground ring-background absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[0.6rem] leading-4 font-semibold ring-2"
        >
          {badge}
        </span>
      )}
    </button>
  )
}
