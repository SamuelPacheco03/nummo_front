import { Navigate, Outlet, useLocation } from 'react-router'
import { AppLoader } from '@/components/app-loader'
import { useAuth } from './hooks'

/** Guard: mientras carga muestra loader; sin sesión redirige a /login. */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <AppLoader label="Verificando sesión…" />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}
