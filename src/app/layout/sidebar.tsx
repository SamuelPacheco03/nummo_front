import { Link, NavLink, useLocation } from 'react-router'
import { Activity, HelpCircle, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
  return (
    <nav aria-label="Principal" className="flex flex-col gap-5 px-3 py-4">
      {SECTIONS.map((section, i) => (
        <div key={section.title ?? i} className="flex flex-col gap-0.5">
          {section.title && (
            <div className="text-sidebar-muted-foreground px-3 pb-1.5 text-[0.66rem] font-semibold tracking-[0.09em] uppercase">
              {section.title}
            </div>
          )}
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground relative flex items-center gap-2.5 rounded-md py-2 pr-2 pl-3 text-sm transition-colors',
                  'focus-visible:ring-sidebar-ring/60 focus-visible:ring-[3px] focus-visible:outline-none',
                  // El activo no solo se tiñe: lleva una barra de marca a la
                  // izquierda. Sobre superficie oscura un simple cambio de fondo
                  // se pierde, y §7 pide no fiarlo todo al color.
                  isActive &&
                    'bg-sidebar-accent text-sidebar-foreground font-medium before:bg-sidebar-primary before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[3px] before:rounded-full before:content-[""]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.Icon
                    aria-hidden
                    className={cn('size-4 shrink-0', isActive && 'text-sidebar-primary')}
                  />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

/**
 * Enlace del pie: mismo peso menor para los tres, que es lo que los agrupa como
 * «esto no es una sección de trabajo».
 */
function FooterLink({
  to,
  label,
  Icon,
  onNavigate,
  forceActive = false,
}: {
  to: string
  label: string
  Icon: LucideIcon
  onNavigate?: () => void
  /** Para destinos que cubren más rutas que la suya. */
  forceActive?: boolean
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      aria-current={forceActive ? 'page' : undefined}
      className={({ isActive }) =>
        cn(
          'text-sidebar-muted-foreground hover:text-sidebar-foreground flex items-center gap-2 px-3 text-xs transition-colors',
          (isActive || forceActive) && 'text-sidebar-foreground font-medium',
        )
      }
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {label}
    </NavLink>
  )
}

/**
 * Cuerpo del sidebar. Se monta en dos sitios: la columna fija de escritorio y la
 * hoja de "Más" en móvil — de ahí que viva aparte del shell.
 */
export function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation()

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
      {/*
        El pie de lo que no es una sección de trabajo.

        **Configuración va aquí y no en la navegación**, aunque sea el destino
        más importante de los tres: en el pie está siempre a la vista al abrir el
        sidebar, mientras que al final de la lista obligaba a desplazarse —y
        además quedaba como un ítem suelto sin grupo—.
      */}
      <div className="border-sidebar-border space-y-3 border-t p-3">
        <FooterLink
          to="/config"
          label="Configuración"
          Icon={Settings}
          onNavigate={onNavigate}
          // `/config` no casa con `/maestros/…` ni con `/cartera/interes`, que
          // también cuelgan de aquí: sin esto el enlace se apagaría justo cuando
          // el usuario está dentro de esa sección.
          forceActive={isSettingsPath(pathname)}
        />
        <FooterLink to="/ayuda" label="Ayuda" Icon={HelpCircle} onNavigate={onNavigate} />
        <FooterLink
          to="/estado"
          label="Estado del sistema"
          Icon={Activity}
          onNavigate={onNavigate}
        />
        <InstallAppButton className="text-sidebar-muted-foreground hover:text-sidebar-foreground px-3 transition-colors" />
        <OfflineIndicator />
        {/*
          Preferencia a la izquierda, cuenta a la derecha, al fondo del todo.
          Ambos heredan la superficie con `border-current` (§11.2): el sidebar va
          oscuro también en tema claro, así que fijar color dejaría uno de los dos
          ilegible.

          **Solo por debajo de `lg`.** En escritorio los dos ya viven en la barra
          superior, siempre a la vista; repetirlos aquí abajo era ofrecer el mismo
          control dos veces en la misma pantalla. En móvil y tablet no hay barra
          superior —este cuerpo es la hoja de «Más»—, así que aquí es su único
          sitio.
        */}
        <div className="flex items-center justify-between gap-2 pt-1 lg:hidden">
          <ThemeToggle className="border-current/15 bg-transparent" />
          <UserMenu />
        </div>
      </div>
    </>
  )
}
