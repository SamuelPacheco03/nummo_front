import { useQueryClient } from '@tanstack/react-query'
import {
  getGetApiV1AuthMeQueryKey,
  useGetApiV1AuthMe,
  usePostApiV1AuthLogin,
  usePostApiV1AuthLogout,
} from '@/api/generated/endpoints/auth/auth'
import type { User } from '@/api/generated/model'
import { clearCsrfToken, refreshCsrfToken } from '@/lib/csrf'

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

/** Query key de `/auth/me` (para invalidaciones puntuales). */
export const authMeQueryKey = getGetApiV1AuthMeQueryKey
