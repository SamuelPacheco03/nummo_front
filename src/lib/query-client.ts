import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/http-client'

const NO_RETRY_STATUS = new Set([400, 401, 403, 404, 409, 422])

/** QueryClient con defaults sensatos para Nummo (estado de servidor vive aquí, no en Zustand). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // No reintentar errores de cliente (auth/permiso/validación/conflicto).
          if (error instanceof ApiError && NO_RETRY_STATUS.has(error.status)) return false
          return failureCount < 2
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
}
