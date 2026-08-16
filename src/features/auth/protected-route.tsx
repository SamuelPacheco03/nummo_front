import { Navigate, Outlet, useLocation } from 'react-router'
import { PageLoader } from '@/components/ui/loader'
import { useAuth } from './hooks'

/** Guard: mientras carga muestra loader; sin sesión redirige a /login. */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader label="Verificando sesión…" />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}
