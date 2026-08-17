import { Link, NavLink, useLocation } from 'react-router'
import { Activity, HelpCircle } from 'lucide-react'
import { BrandLockup } from '@/components/brand-mark'
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
      <div className="scrollbar-slim scroll-fade-y min-h-0 flex-1 overflow-y-auto">
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
      </div>
    </>
  )
}
