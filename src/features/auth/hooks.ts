import { useQueryClient } from '@tanstack/react-query'
import {
  getGetApiV1AuthSessionsQueryKey,
  useDeleteApiV1AuthSessionsId,
  useGetApiV1AuthMe,
  useGetApiV1AuthSessions,
  usePostApiV1AuthLogin,
  usePostApiV1AuthLogout,
  usePostApiV1AuthRegister,
  usePostApiV1AuthSessionsRevokeOthers,
} from '@/api/generated/endpoints/auth/auth'
import type { Session, User } from '@/api/generated/model'
import { clearCsrfToken, refreshCsrfToken } from '@/lib/csrf'
import { asArray } from '@/lib/list-result'

/**
 * Usuario autenticado actual (estado de servidor vía `GET /auth/me`).
 * customFetch lanza ApiError en 401, así que un 401 => query.error (no data).
 */
export function useAuth() {
  const query = useGetApiV1AuthMe({
    query: {
      retry: false,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: true,
    },
  })

  // En éxito, data siempre es el envoltorio de 200 (User); el caso 401 va a error.
  const user = query.data?.data as User | undefined

  return {
    user,
    isAuthenticated: !!user,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
  }
}

/** Login: tras el 200, la sesión cambia → re-pedir CSRF e invalidar el cache. */
export function useLogin() {
  const queryClient = useQueryClient()
  return usePostApiV1AuthLogin({
    mutation: {
      onSuccess: async () => {
        await refreshCsrfToken()
        await queryClient.invalidateQueries()
      },
    },
  })
}

/**
 * Registro público de una cuenta. NO inicia sesión (spec): tras el 201 el usuario
 * va a login. CSRF lo adjunta customFetch automáticamente en el POST.
 */
export function useRegister() {
  return usePostApiV1AuthRegister()
}

/** Logout: limpia el token CSRF y todo el cache de queries. */
export function useLogout() {
  const queryClient = useQueryClient()
  return usePostApiV1AuthLogout({
    mutation: {
      onSuccess: () => {
        clearCsrfToken()
        queryClient.removeQueries()
      },
    },
  })
}

/* ---------- Sesiones activas ---------- */

/** Sesiones activas del usuario (dispositivos con la sesión abierta). */
export function useSessions() {
  const query = useGetApiV1AuthSessions({ query: { staleTime: 30_000 } })
  return { ...query, sessions: asArray<Session>(query.data?.data) }
}

/** Cierra una sesión concreta por id. */
export function useRevokeSession() {
  const qc = useQueryClient()
  return useDeleteApiV1AuthSessionsId({
    mutation: { onSuccess: () => void qc.invalidateQueries({ queryKey: getGetApiV1AuthSessionsQueryKey() }) },
  })
}

/** Cierra todas las demás sesiones (deja solo la actual). */
export function useRevokeOtherSessions() {
  const qc = useQueryClient()
  return usePostApiV1AuthSessionsRevokeOthers({
    mutation: { onSuccess: () => void qc.invalidateQueries({ queryKey: getGetApiV1AuthSessionsQueryKey() }) },
  })
}
