import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Activity, HelpCircle, LogOut } from 'lucide-react'
import { BrandLockup } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth, useLogout } from '@/features/auth/hooks'
import { OrgSwitcher } from '@/features/organizations/org-switcher'
import { isSettingsPath } from '@/features/config/settings-nav'
import { SECTIONS } from '@/features/navigation/sections'
import { InstallAppButton } from '@/pwa/install-app-button'
import { OfflineIndicator } from '@/pwa/offline-indicator'
import { getErrorMessage } from '@/lib/errors'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Identidad y salida, al pie del sidebar.
 *
 * Aquí y no en la cabecera: la cabecera es para trabajar —la barra de comandos
 * ocupa todo su ancho— y el nombre de quien está dentro es contexto, no una
 * herramienta. Cerrar sesión vive junto a él, que es donde se busca.
 */
function SidebarAccount() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const logout = useLogout()

  if (!user) return null

  const onLogout = async () => {
    try {
      await logout.mutateAsync()
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo cerrar sesión'))
    }
  }

  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-current/10 text-xs font-semibold">
        {initials(user.fullName)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{user.fullName}</span>
        <span className="text-sidebar-muted-foreground block truncate text-xs">{user.email}</span>
      </span>
      <button
        type="button"
        onClick={onLogout}
        disabled={logout.isPending}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className="text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-sidebar-ring/60 grid size-8 shrink-0 place-items-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:opacity-50"
      >
        <LogOut aria-hidden className="size-4" />
      </button>
    </div>
  )
}

export function Brand() {
  return (
    <Link to="/" className="flex items-center" aria-label="Nummo — ir al panel">
      <BrandLockup />
    </Link>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation()

  return (
    <nav aria-label="Principal" className="flex flex-col gap-5 px-3 py-4">
      {SECTIONS.map((section, i) => (
        <div key={section.title ?? i} className="flex flex-col gap-0.5">
          {section.title && (
            <div className="text-sidebar-muted-foreground px-3 pb-1.5 text-[0.66rem] font-semibold tracking-[0.09em] uppercase">
              {section.title}
            </div>
          )}
          {section.items.map((item) => {
            // `/config` no casa con `/maestros/…` ni con `/cartera/interes`, que
            // también cuelgan de Configuración: sin esto el enlace se apagaría
            // justo cuando el usuario está dentro de esa sección.
            const forceActive = item.to === '/config' && isSettingsPath(pathname)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                aria-current={forceActive ? 'page' : undefined}
                className={({ isActive }) =>
                  cn(
                    'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground relative flex items-center gap-2.5 rounded-md py-2 pr-2 pl-3 text-sm transition-colors',
                    'focus-visible:ring-sidebar-ring/60 focus-visible:ring-[3px] focus-visible:outline-none',
                    // El activo no solo se tiñe: lleva una barra de marca a la
                    // izquierda. Sobre superficie oscura un simple cambio de fondo
                    // se pierde, y §7 pide no fiarlo todo al color.
                    (isActive || forceActive) &&
                      'bg-sidebar-accent text-sidebar-foreground font-medium before:bg-sidebar-primary before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[3px] before:rounded-full before:content-[""]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.Icon
                      aria-hidden
                      className={cn(
                        'size-4 shrink-0',
                        (isActive || forceActive) && 'text-sidebar-primary',
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

/**
 * Cuerpo del sidebar. Se monta en dos sitios: la columna fija de escritorio y la
 * hoja de "Más" en móvil — de ahí que viva aparte del shell.
 */
export function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="border-sidebar-border flex h-16 items-center border-b px-4">
        <Brand />
      </div>
      <div className="p-3">
        <OrgSwitcher />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="border-sidebar-border space-y-3 border-t p-3">
        <NavLink
          to="/ayuda"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'text-sidebar-muted-foreground hover:text-sidebar-foreground flex items-center gap-2 px-3 text-xs transition-colors',
              isActive && 'text-sidebar-foreground',
            )
          }
        >
          <HelpCircle aria-hidden className="size-3.5" />
          Ayuda
        </NavLink>
        <NavLink
          to="/estado"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'text-sidebar-muted-foreground hover:text-sidebar-foreground flex items-center gap-2 px-3 text-xs transition-colors',
              isActive && 'text-sidebar-foreground',
            )
          }
        >
          <Activity aria-hidden className="size-3.5" />
          Estado del sistema
        </NavLink>
        <InstallAppButton className="text-sidebar-muted-foreground hover:text-sidebar-foreground px-3 transition-colors" />
        <OfflineIndicator />
        <ThemeToggle className="w-full justify-between border-current/15 bg-current/[0.04]" />
        <SidebarAccount />
      </div>
    </>
  )
}
