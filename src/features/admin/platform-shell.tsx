import { useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Menu, PanelLeft, ShieldAlert } from 'lucide-react'
import { BrandLockup } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageLoader } from '@/components/ui/loader'
import { UserMenu } from '@/features/auth/user-menu'
import { usePlatformAccess } from '@/features/platform/hooks'
import { cn } from '@/lib/utils'
import { activeSectionLabel } from './platform-nav'
import { PlatformSidebarBody } from './platform-sidebar'

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
 * **Pero fuera de `AppShell` no significa con otro lenguaje.** La consola tuvo un
 * tiempo por navegación la sub-navegación de Configuración —una columna clara sobre
 * el fondo de la página, pensada para vivir *dentro* de una pantalla— y era la única
 * superficie de Nummo donde navegar no pesaba nada: cruzar del inquilino a la
 * plataforma parecía cambiar de producto. Hoy tiene su propio sidebar con la misma
 * forma que el del negocio (`PlatformSidebarBody`), y lo que cambia es lo que lleva
 * dentro, no cómo se ve.
 *
 * El reparto de la cabecera es el de §11.1.1: el sidebar navega, y tema y cuenta
 * viven arriba a la derecha, una sola vez por pantalla.
 */
/** Dónde se recuerda si el carril está plegado. Es una preferencia, no un filtro. */
const RAIL_KEY = 'nummo:plataforma:carril'

function useCollapsedRail(): [boolean, (value: boolean) => void] {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(RAIL_KEY) === '1'
    } catch {
      // Safari privado y las cookies de terceros bloqueadas lanzan aquí. Sin memoria del
      // carril se trabaja igual; sin consola, no.
      return false
    }
  })

  return [
    collapsed,
    (value: boolean) => {
      setCollapsed(value)
      try {
        localStorage.setItem(RAIL_KEY, value ? '1' : '0')
      } catch {
        /* sin memoria, pero la consola funciona */
      }
    },
  ]
}

export function PlatformShell() {
  const { isPlatformAdmin, isLoading, isError, error } = usePlatformAccess()
  const { pathname } = useLocation()
  const section = activeSectionLabel(pathname)
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useCollapsedRail()

  return (
    <div className="bg-background flex h-dvh">
      {/*
        `sidebar-platform` cambia el acento de esta superficie sin tocar el del negocio: el
        índigo del isotipo en vez del azul, para que la consola no se confunda con la app
        del cliente (§47.2).
      */}
      <aside
        className={cn(
          'sidebar-platform bg-sidebar text-sidebar-foreground border-sidebar-border hidden h-dvh shrink-0 flex-col border-r transition-[width] lg:flex',
          collapsed ? 'w-[4.5rem]' : 'w-64',
        )}
      >
        <PlatformSidebarBody collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/85 sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b px-4 backdrop-blur lg:px-8">
          {/*
            Por debajo de `lg` no hay columna: la misma navegación entra en la hoja
            lateral, que es lo que ya hace el shell del inquilino. Y aquí no hay barra
            inferior que la sustituya, así que el menú es el único camino.
          */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir la navegación"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -ml-1 grid size-9 shrink-0 place-items-center rounded-md focus-visible:ring-[3px] focus-visible:outline-none lg:hidden"
          >
            <Menu aria-hidden className="size-5" />
          </button>

          <div className="flex items-center gap-2 lg:hidden">
            <BrandLockup />
          </div>

          {/*
            Plegar y el menú comparten hueco: el mismo sitio, y lo que hace depende del
            ancho. En escritorio pliega el carril; por debajo de `lg` no hay carril que
            plegar y ese botón es el que abre la navegación.
          */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Desplegar la navegación' : 'Plegar la navegación'}
            aria-pressed={collapsed}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -ml-1 hidden size-9 shrink-0 place-items-center rounded-md focus-visible:ring-[3px] focus-visible:outline-none lg:grid"
          >
            <PanelLeft aria-hidden className="size-[1.05rem]" />
          </button>

          {/*
            La miga de pan es lo único que la cabecera aporta en escritorio: la marca y la
            navegación se fueron al sidebar, y dejarla vacía era pedir 64 px por nada. En
            móvil no cabe —ahí manda la marca— y el título de la página está a un dedo.
          */}
          <nav aria-label="Ruta" className="text-muted-foreground hidden items-center gap-1.5 text-sm lg:flex">
            <span>Plataforma</span>
            {section && (
              <>
                <span aria-hidden className="text-muted-foreground/50">/</span>
                <span className="text-foreground font-medium">{section}</span>
              </>
            )}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden px-4 py-4 lg:px-8 lg:py-6">
          <div className="mx-auto h-full min-h-0 w-full max-w-[110rem]">
            <PlatformBody
              isPlatformAdmin={isPlatformAdmin}
              isLoading={isLoading}
              isError={isError}
              error={error}
            />
          </div>
        </main>
      </div>

      <Drawer open={menuOpen} onOpenChange={setMenuOpen} title="Plataforma">
        <div className="sidebar-platform bg-sidebar text-sidebar-foreground -mx-5 -my-4 flex min-h-[60vh] flex-col sm:-mx-6">
          <PlatformSidebarBody onNavigate={() => setMenuOpen(false)} />
        </div>
      </Drawer>
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

  return <Outlet />
}
