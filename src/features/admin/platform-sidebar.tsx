import { Link, NavLink } from 'react-router'
import { Activity, ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BrandLockup } from '@/components/brand-mark'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { cn } from '@/lib/utils'
import { GROUPS } from './platform-nav'

/**
 * **El sidebar de la consola de plataforma.**
 *
 * Habla el idioma de navegación de la app —superficie oscura, grupos en versaditas, el
 * activo con su barra de marca a la izquierda— y no otro. Antes la consola era la única
 * pantalla de Nummo cuya navegación era una columna clara sobre el fondo de la página:
 * `SectionedLayout`, que está pensado para vivir **dentro** de una página de Configuración
 * y aquí hacía de shell. Cruzar del inquilino a la plataforma cambiaba de producto.
 *
 * Lo que **no** lleva, y es lo que lo distingue del sidebar del inquilino:
 *
 * - **Ningún selector de organización.** Un superadmin administra todas y puede no ser
 *   miembro de ninguna (§47.2) — un selector vacío sería la primera cosa que se ve.
 * - **Ninguna sección del negocio.** Cartera, Gastos y Caja no significan nada mirando la
 *   plataforma.
 *
 * Y en el pie, la salida: volver a Nummo —solo si hay algo a lo que volver— y el estado
 * del sistema, que es cosa de quien lo opera.
 */
export function PlatformSidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  // Un superadmin puede tener su propia organización, o ninguna.
  const { organizations } = useCurrentOrg()

  return (
    <>
      <div className="border-sidebar-border flex h-16 items-center gap-2 border-b px-4">
        <Link to="/plataforma" className="flex items-center" aria-label="Consola de plataforma">
          <BrandLockup />
        </Link>
        <span className="border-sidebar-primary/40 text-sidebar-primary rounded-full border px-2 py-0.5 text-[0.68rem] font-medium">
          Plataforma
        </span>
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
        <nav aria-label="Plataforma" className="flex flex-col gap-5 px-3 py-4">
          {GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-0.5">
              <div className="text-sidebar-muted-foreground px-3 pb-1.5 text-[0.66rem] font-semibold tracking-[0.09em] uppercase">
                {group.title}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground relative flex items-center gap-2.5 rounded-md py-2 pr-2 pl-3 text-sm transition-colors',
                      'focus-visible:ring-sidebar-ring/60 focus-visible:ring-[3px] focus-visible:outline-none',
                      /*
                        El activo no solo se tiñe: lleva la barra de marca a la izquierda.
                        Sobre superficie oscura un cambio de fondo se pierde, y §7 pide no
                        fiarlo todo al color.
                      */
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
      </div>

      <div className="border-sidebar-border space-y-3 border-t p-3">
        {organizations.length > 0 && (
          <FooterLink to="/" label="Volver a Nummo" Icon={ArrowLeft} onNavigate={onNavigate} />
        )}
        <FooterLink
          to="/estado"
          label="Estado del sistema"
          Icon={Activity}
          onNavigate={onNavigate}
        />
      </div>
    </>
  )
}

/** Mismo peso menor para todo el pie: «esto no es una sección de trabajo». */
function FooterLink({
  to,
  label,
  Icon,
  onNavigate,
}: {
  to: string
  label: string
  Icon: LucideIcon
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'text-sidebar-muted-foreground hover:text-sidebar-foreground flex items-center gap-2 px-3 text-xs transition-colors',
          isActive && 'text-sidebar-foreground font-medium',
        )
      }
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {label}
    </NavLink>
  )
}
