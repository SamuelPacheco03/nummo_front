import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Bell, CheckCheck, X } from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { NativeSelect } from '@/components/ui/native-select'
import { Pagination } from '@/components/pagination'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { toastApiError } from '@/features/platform/errors'
import { useCan } from '@/features/platform/permissions'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Notification, NotificationCategory } from '@/api/generated/model'
import {
  useDismissNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotifications,
} from './hooks'
import { notificationRoute } from './deep-link'
import { notificationCategory, notificationIcon, NOTIFICATION_CATEGORIES } from './labels'

const PAGE_SIZE = 20

/** Filtro de lectura. Solo dos estados, que es lo que el endpoint acepta. */
type ReadFilter = 'all' | 'unread'

function NotificationRow({
  notification,
  canManage,
  onOpen,
  onDismiss,
}: {
  notification: Notification
  canManage: boolean
  onOpen: (notification: Notification) => void
  onDismiss: (notification: Notification) => void
}) {
  const { Icon, className } = notificationIcon(notification.icon)
  const unread = notification.readAt == null
  const link = notificationRoute(notification.deepLink)

  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className={cn(
          'hover:bg-secondary focus-visible:ring-ring/50 flex w-full gap-3 rounded-lg px-2 py-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none',
          // Sin destino no hay nada que abrir, pero sí que marcar como leído:
          // el cursor lo dice, y el botón sigue siendo un botón.
          link ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        <Icon aria-hidden className={cn('mt-0.5 size-4.5 shrink-0', className)} />

        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span className={cn('min-w-0 flex-1 text-sm', unread && 'font-medium')}>
              {notification.title}
            </span>
            {unread && (
              <>
                {/* El punto no lleva el significado él solo (§7). */}
                <span className="sr-only">Sin leer</span>
                <span aria-hidden className="bg-brand mt-1.5 size-2 shrink-0 rounded-full" />
              </>
            )}
          </span>
          <span className="text-muted-foreground mt-0.5 block text-sm">{notification.body}</span>
          <span className="text-muted-foreground mt-1 block text-xs">
            {notificationCategory(notification.category)} ·{' '}
            {formatRelativeTime(notification.createdAt)}
          </span>
        </span>

        {/* Hueco para el botón de descartar, que va fuera (no se anida un botón
            dentro de otro) y encima con posición absoluta. */}
        {canManage && <span aria-hidden className="w-7 shrink-0" />}
      </button>

      {canManage && (
        <button
          type="button"
          onClick={() => onDismiss(notification)}
          aria-label={`Descartar «${notification.title}»`}
          /*
            Siempre visible, no al pasar por encima: en una pantalla táctil no
            hay «encima», y §78 prohíbe esconder acciones tras el hover.
          */
          className="text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-ring/50 absolute top-2.5 right-1 grid size-7 place-items-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <X className="size-3.5" />
        </button>
      )}
    </li>
  )
}

function RowsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-3 px-2">
          <Skeleton className="mt-0.5 size-4.5 shrink-0 rounded" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * **El centro de notificaciones.**
 *
 * Va en el `Drawer` de la app —hoja desde abajo en móvil, cajón por la derecha
 * en escritorio (§11.1.3)— y no en una página: se abre **encima** de lo que
 * estabas mirando, y casi todo lo que hay dentro te lleva a otro sitio. Una
 * pantalla propia obligaría a volver.
 *
 * Sus filtros son de los efímeros y viven en `useState`, no en la URL: nadie
 * comparte por enlace «mira mis notificaciones sin leer», y la URL de esta
 * pantalla es la de detrás, que es la que sí se comparte (§21.1).
 */
export function NotificationsDrawer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canManage = can('notifications.manage')
  const { unread } = useUnreadNotifications(orgId)

  const [read, setRead] = useState<ReadFilter>('all')
  const [category, setCategory] = useState<'' | NotificationCategory>('')
  const [page, setPage] = useState(1)

  const {
    notifications,
    total,
    totalPages,
    pageNumber,
    isPending,
    isError,
    error,
    isFetching,
    refetch,
  } = useNotifications(
    orgId,
    {
      page,
      pageSize: PAGE_SIZE,
      ...(read === 'unread' ? { unread: 'true' as const } : {}),
      ...(category ? { category } : {}),
    },
    open,
  )

  const markRead = useMarkNotificationRead(orgId ?? '')
  const markAll = useMarkAllNotificationsRead(orgId ?? '')
  const dismiss = useDismissNotification(orgId ?? '')

  const filtered = read === 'unread' || category !== ''
  const clearFilters = () => {
    setRead('all')
    setCategory('')
    setPage(1)
  }

  const openNotification = (notification: Notification) => {
    // Abrir es leer. Quien no puede gestionar el centro navega igual: el aviso
    // se queda sin leer porque el backend no le deja marcarlo, no porque aquí
    // se le esconda el destino.
    if (notification.readAt == null && canManage && orgId) {
      markRead.mutate({ orgId, notificationId: notification.id })
    }
    const link = notificationRoute(notification.deepLink)
    if (!link) return
    onOpenChange(false)
    navigate(link)
  }

  const dismissNotification = (notification: Notification) => {
    if (!orgId) return
    dismiss.mutate(
      { orgId, notificationId: notification.id },
      { onError: (err) => toastApiError(err) },
    )
  }

  const markAllRead = () => {
    if (!orgId) return
    markAll.mutate({ orgId }, { onError: (err) => toastApiError(err) })
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Notificaciones"
      actions={
        canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            // Sin nada sin leer no hay nada que marcar. Se apaga en vez de
            // esconderse: desaparecer y volver con cada aviso que llega es un
            // botón que cambia de sitio.
            disabled={markAll.isPending || unread === 0}
          >
            <CheckCheck className="size-4" />
            Marcar todo como leído
          </Button>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          aria-label="Leídas o sin leer"
          value={read}
          onChange={(value) => {
            setRead(value)
            setPage(1)
          }}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'unread', label: 'Sin leer' },
          ]}
        />
        <NativeSelect
          aria-label="Categoría"
          className="w-auto min-w-40 flex-1"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as '' | NotificationCategory)
            setPage(1)
          }}
        >
          {/* El vacío se nombra entero: la opción se lee sola con el
              desplegable cerrado (§21.1). */}
          <option value="">Todas las categorías</option>
          {NOTIFICATION_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {notificationCategory(value)}
            </option>
          ))}
        </NativeSelect>
      </div>

      {isPending ? (
        <RowsSkeleton />
      ) : isError ? (
        <ErrorState
          error={error}
          title="No se pudieron cargar las notificaciones"
          onRetry={() => void refetch()}
        />
      ) : notifications.length === 0 ? (
        filtered ? (
          <NoResults entity="notificaciones" onClear={clearFilters} />
        ) : (
          <EmptyState
            Icon={Bell}
            title="No tienes notificaciones"
            description="Aquí van a llegar los avisos de tu cartera, tus gastos, tu caja y tu equipo: lo que vence, lo que entra y lo que necesita tu firma."
          />
        )
      ) : (
        <>
          <ul className="-mx-2 divide-y">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                canManage={canManage}
                onOpen={openNotification}
                onDismiss={dismissNotification}
              />
            ))}
          </ul>
          {totalPages > 1 && (
            <Pagination
              page={pageNumber}
              pageSize={PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              isFetching={isFetching}
              onPage={setPage}
            />
          )}
        </>
      )}
    </Drawer>
  )
}
