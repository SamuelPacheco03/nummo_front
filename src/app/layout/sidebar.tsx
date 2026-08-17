import { Link, NavLink, useLocation } from 'react-router'
import { Activity, HelpCircle } from 'lucide-react'
import { BrandLockup } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/features/auth/user-menu'
import { OrgSwitcher } from '@/features/organizations/org-switcher'
import { isSettingsPath } from '@/features/config/settings-nav'
import { SECTIONS } from '@/features/navigation/sections'
import { InstallAppButton } from '@/pwa/install-app-button'
import { OfflineIndicator } from '@/pwa/offline-indicator'
import { cn } from '@/lib/utils'

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
            <div className="text-muted-foreground px-2 pb-1 text-[0.68rem] font-medium tracking-wider uppercase">
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
                    'text-muted-foreground hover:bg-secondary hover:text-foreground flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                    'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                    (isActive || forceActive) && 'bg-secondary text-foreground font-medium',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.Icon
                      aria-hidden
                      className={cn('size-4 shrink-0', (isActive || forceActive) && 'text-brand')}
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
      <div className="flex h-14 items-center border-b px-4">
        <Brand />
      </div>
      <div className="border-b p-3">
        <OrgSwitcher />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="space-y-3 border-t p-3">
        <NavLink
          to="/ayuda"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'text-muted-foreground hover:text-foreground flex items-center gap-2 px-2 text-xs',
              isActive && 'text-foreground',
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
              'text-muted-foreground hover:text-foreground flex items-center gap-2 px-2 text-xs',
              isActive && 'text-foreground',
            )
          }
        >
          <Activity aria-hidden className="size-3.5" />
          Estado del sistema
        </NavLink>
        <InstallAppButton />
        <OfflineIndicator />
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </>
  )
}
