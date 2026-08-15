import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/query-client'
import { setUnauthorizedHandler } from '@/api/http-client'
import { clearCsrfToken } from '@/lib/csrf'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { PwaUpdater } from '@/pwa/pwa-updater'

export function AppProviders({ children }: { children: ReactNode }) {
  // Un QueryClient estable por montaje de la app.
  const [queryClient] = useState(createQueryClient)

  // Dev: acceso al cache desde la consola para depurar (window.__queryClient).
  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(globalThis as { __queryClient?: unknown }).__queryClient = queryClient
    }
  }, [queryClient])

  // En cualquier 401, el token CSRF (session-bound) quedó obsoleto: lo limpiamos.
  // El redirect a /login lo maneja ProtectedRoute según el estado de `/auth/me`.
  useEffect(() => {
    setUnauthorizedHandler(() => clearCsrfToken())
    return () => setUnauthorizedHandler(null)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
      <Toaster />
      <PwaUpdater />
    </QueryClientProvider>
  )
}
