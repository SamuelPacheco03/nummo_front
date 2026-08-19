import { Link, Outlet } from 'react-router'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { BrandLockup } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageLoader } from '@/components/ui/loader'
import { SectionedLayout } from '@/components/ui/sectioned-layout'
import { UserMenu } from '@/features/auth/user-menu'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { usePlatformAccess } from '@/features/platform/hooks'
import { GROUPS } from './platform-nav'

/**
 * **El shell de la consola de plataforma**, y vive fuera de `AppShell` por una
 * razón que costó una captura de pantalla descubrir: el shell de la aplicación
 * empieza por «¿a qué organización perteneces?» y enseña el onboarding de
 * «Crea tu organización» a quien no pertenece a ninguna.
 *
 * Un superadmin **no tiene por qué tener organización**: administra todas, no
 * es miembro de ninguna. Con la consola dentro del shell del inquilino, esa
 * puerta se cerraba antes de que la ruta llegara a montarse, así que
 * `/plataforma` acababa en «Crea tu organización» — parecía una redirección y
 * era una pantalla tapando a la otra.
 *
 * Es también lo coherente con el backend: `requirePlatformAdmin` corre **fuera**
 * de `requireTenant`. Si allí no hace falta un inquilino, aquí tampoco.
 *
 * De ahí que el cromo sea el mínimo: marca, tema y cuenta. La navegación del
 * negocio —Cartera, Gastos, Caja— no significa nada mirando la plataforma, y el
 * selector de organización estaría vacío.
 */
export function PlatformShell() {
  const { isPlatformAdmin, isLoading, isError, error } = usePlatformAccess()
  // Solo para saber si hay algo a lo que volver: un superadmin puede tener su
  // propia organización, o ninguna.
  const { organizations } = useCurrentOrg()

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <header className="bg-background/85 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur lg:px-8">
        <Link to="/plataforma" className="flex items-center" aria-label="Consola de plataforma">
          <BrandLockup />
        </Link>
        <span className="border-brand/40 text-brand hidden rounded-full border px-2 py-0.5 text-xs font-medium sm:inline">
          Plataforma
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {organizations.length > 0 && (
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
            >
              <ArrowLeft aria-hidden className="size-4" />
              <span className="hidden sm:inline">Volver a Nummo</span>
            </Link>
          )}
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-6xl">
          <PlatformBody
            isPlatformAdmin={isPlatformAdmin}
            isLoading={isLoading}
            isError={isError}
            error={error}
          />
        </div>
      </main>
    </div>
  )
}

function PlatformBody({
  isPlatformAdmin,
  isLoading,
  isError,
  error,
}: {
  isPlatformAdmin: boolean
  isLoading: boolean
  isError: boolean
  error: unknown
}) {
  if (isLoading) return <PageLoader />

  /*
    Preguntar falló, que no es lo mismo que recibir un no. Pasa cuando el backend
    todavía no publica `/me/platform-access` —la señal es de la Fase 9— y sin
    separarlo, un superadmin de verdad vería el mensaje de «no tienes acceso» y
    se pondría a buscar el problema en su cuenta.
  */
  if (isError) {
    return (
      <ErrorState
        error={error}
        title="No se pudo comprobar el acceso de plataforma"
        fallback="El backend no respondió a GET /api/v1/me/platform-access."
      />
    )
  }

  /*
    **La comprobación de aquí es orientativa, no autorización.** Sirve para no
    pintar una consola que va a responder 403 en cada petición; el guard de
    verdad está en `/admin/*` y se vuelve a comprobar contra la tabla en cada
    llamada. Por eso se enseña un estado y no se redirige a escondidas: quien
    llegue por un enlace viejo merece saber qué pasó.
  */
  if (!isPlatformAdmin) {
    return (
      <EmptyState
        Icon={ShieldAlert}
        title="Esta sección es de la plataforma"
        description="Administra todas las organizaciones de Nummo, y tu cuenta no tiene ese acceso. No tiene nada que ver con tu rol en la organización: ser propietario de la tuya no te hace superadmin, es una concesión aparte que se da por script."
      />
    )
  }

  return (
    <SectionedLayout label="Plataforma" groups={GROUPS}>
      <Outlet />
    </SectionedLayout>
  )
}
