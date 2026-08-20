import { useEffect } from 'react'
import { keepPreviousData, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  getGetApiV1OrganizationsOrgIdNotificationsQueryKey,
  getGetApiV1OrganizationsOrgIdNotificationsUnreadCountQueryKey,
  useDeleteApiV1OrganizationsOrgIdNotificationsNotificationId,
  useGetApiV1OrganizationsOrgIdNotifications,
  useGetApiV1OrganizationsOrgIdNotificationsUnreadCount,
  usePostApiV1OrganizationsOrgIdNotificationsNotificationIdRead,
  usePostApiV1OrganizationsOrgIdNotificationsReadAll,
} from '@/api/generated/endpoints/notifications/notifications'
import type {
  GetApiV1OrganizationsOrgIdNotificationsParams,
  Notification,
} from '@/api/generated/model'
import { asArray } from '@/lib/list-result'
import { subscribeToRealtime } from '@/lib/realtime-stream'

/* ---------- Claves ---------- */

/**
 * Lo que hay que invalidar cuando algo se mueve en el centro: la lista —con
 * cualquier filtro y en cualquier página, porque la clave sin parámetros es
 * prefijo de todas— y el contador.
 *
 * Vive aquí y no en cada llamador porque **las dos van siempre juntas**: marcar
 * leído sin refrescar el contador deja el globo puesto sobre una lista limpia,
 * que es la clase de incoherencia que hace desconfiar del número.
 */
function invalidateNotifications(qc: QueryClient, orgId: string): void {
  void qc.invalidateQueries({ queryKey: getGetApiV1OrganizationsOrgIdNotificationsQueryKey(orgId) })
  void qc.invalidateQueries({
    queryKey: getGetApiV1OrganizationsOrgIdNotificationsUnreadCountQueryKey(orgId),
  })
}

/* ---------- Consultas ---------- */

/**
 * El número del globo. Se pide **siempre**, aunque el panel esté cerrado: es
 * justo lo que tiene que verse sin abrir nada.
 *
 * Sin `refetchInterval`: quien avisa de que hay algo nuevo es el stream
 * (`useNotificationStream`), y un sondeo por encima sería pagar dos veces por
 * la misma noticia.
 */
export function useUnreadNotifications(orgId: string | undefined) {
  const query = useGetApiV1OrganizationsOrgIdNotificationsUnreadCount(orgId ?? '', {
    query: { enabled: !!orgId },
  })
  return {
    unread: query.data?.data?.unread ?? 0,
    // Un contador que no se pudo pedir se enseña como cero y no como error: el
    // globo es un adorno del botón, y un botón roto no ayuda a nadie.
    isError: query.isError,
  }
}

/**
 * La lista del centro. `enabled` la ata al panel abierto: mientras nadie lo
 * abra, la única petición que corre es la del contador.
 */
export function useNotifications(
  orgId: string | undefined,
  params: GetApiV1OrganizationsOrgIdNotificationsParams,
  enabled: boolean,
) {
  const query = useGetApiV1OrganizationsOrgIdNotifications(orgId ?? '', params, {
    query: { enabled: enabled && !!orgId, placeholderData: keepPreviousData },
  })
  const page = query.data?.data
  return {
    ...query,
    notifications: asArray<Notification>(page?.data),
    total: page?.total ?? 0,
    totalPages: page?.totalPages ?? 1,
    pageNumber: page?.page ?? params.page ?? 1,
  }
}

/* ---------- Mutaciones ---------- */

export function useMarkNotificationRead(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdNotificationsNotificationIdRead({
    mutation: { onSuccess: () => invalidateNotifications(qc, orgId) },
  })
}

export function useMarkAllNotificationsRead(orgId: string) {
  const qc = useQueryClient()
  return usePostApiV1OrganizationsOrgIdNotificationsReadAll({
    mutation: { onSuccess: () => invalidateNotifications(qc, orgId) },
  })
}

/** Descarta un aviso. **No borra el hecho**: quita el aviso de la bandeja. */
export function useDismissNotification(orgId: string) {
  const qc = useQueryClient()
  return useDeleteApiV1OrganizationsOrgIdNotificationsNotificationId({
    mutation: { onSuccess: () => invalidateNotifications(qc, orgId) },
  })
}

/* ---------- Tiempo real ---------- */

/**
 * **Enterarse sin recargar.**
 *
 * Se engancha al stream de la aplicación, que es uno solo para todo el producto
 * (`lib/realtime-stream.ts`): el centro no abre su propia conexión.
 *
 * Lo que llega es un aviso, no el dato — `{ notificationId }` y nada más—, así
 * que aquí no se inserta nada en la caché: se invalida y la lista se pide por
 * su endpoint de siempre. Es **la misma llamada que al reconectar**, de modo que
 * hay un solo camino por el que entran los datos y perder un aviso mientras el
 * móvil estaba sin cobertura no deja el centro desincronizado.
 *
 * Se monta una vez, en el shell.
 */
export function useNotificationStream(orgId: string | undefined): void {
  const qc = useQueryClient()

  useEffect(() => {
    if (!orgId) return
    return subscribeToRealtime(orgId, (event) => {
      if (event.kind !== 'notification') return
      invalidateNotifications(qc, orgId)
    })
  }, [orgId, qc])
}
