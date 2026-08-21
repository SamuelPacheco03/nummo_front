import { Link, NavLink } from 'react-router'
import { Activity, ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { useAuth } from '@/features/auth/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'
import { GROUPS } from './platform-nav'

/**
 * **El sidebar de la consola de plataforma.**
 *
 * Tiene la forma del sidebar del negocio —superficie oscura, grupos, el activo con su
 * barra a la izquierda— pero **no su acento ni su cabecera**, y esa diferencia es
 * deliberada: esta es la única superficie de Nummo donde alguien mira la contabilidad de
 * otro y, con un interruptor, escribe en ella. Si se parece del todo a la app del cliente,
 * se olvida dónde se está.
 *
 * Por eso el índigo (`--sidebar-platform-primary`), el bloque «Consola de plataforma» y el
 * nombre de quien está dentro. Y por eso no lleva ni selector de organización —un
 * superadmin puede no ser miembro de ninguna (§47.2)— ni las secciones del negocio.
 *
 * **Se pliega a carril.** Estas pantallas son tablas densas y una comparación de cuatro
 * columnas; 256 px permanentes son caros cuando lo que se está mirando pide ancho. Plegado
 * deja los iconos, con la etiqueta en el `title` y el nombre del grupo fuera —lo que se
 * pierde al plegar es el texto, no la estructura—.
 */
export function PlatformSidebarBody({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const { user } = useAuth()
  // Solo para saber si hay algo a lo que volver: un superadmin puede tener su propia
  // organización, o ninguna.
  const { organizations } = useCurrentOrg()

  return (
    <>
      <div
        className={cn(
          'border-sidebar-border flex h-16 shrink-0 items-center border-b',
          collapsed ? 'justify-center px-2' : 'gap-2.5 px-4',
        )}
      >
        <Link
          to="/plataforma"
          className="focus-visible:ring-sidebar-ring/60 flex items-center gap-2.5 rounded-md focus-visible:ring-[3px] focus-visible:outline-none"
          aria-label="Consola de plataforma"
        >
          <BrandMark className="size-7 shrink-0" />
          {!collapsed && (
            <span className="min-w-0">
              <span className="font-display block text-sm leading-tight font-semibold">Nummo</span>
              <span className="text-sidebar-muted-foreground block text-[0.66rem] leading-tight">
                Consola de plataforma
              </span>
            </span>
          )}
        </Link>
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
        <nav
          aria-label="Plataforma"
          className={cn('flex flex-col gap-5 py-4', collapsed ? 'items-center px-2' : 'px-3')}
        >
          {GROUPS.map((group) => (
            <div key={group.title} className="flex w-full flex-col gap-0.5">
              {/*
                Plegado, el grupo se marca con una línea y no con el nombre recortado:
                «Plataforma» cabía como «Plata», que en español es otra palabra. Lo que se
                pierde al plegar es el texto; la estructura se conserva con una raya, que
                es lo que separa siete iconos seguidos de una lista sin secciones.
              */}
              {collapsed ? (
                <div aria-hidden className="bg-sidebar-border mx-auto mb-2 h-px w-6 first:hidden" />
              ) : (
                <div className="text-sidebar-muted-foreground px-3 pb-1.5 text-[0.66rem] font-semibold tracking-[0.09em] uppercase">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground relative flex items-center rounded-md text-sm transition-colors',
                      'focus-visible:ring-sidebar-ring/60 focus-visible:ring-[3px] focus-visible:outline-none',
                      collapsed ? 'justify-center p-2.5' : 'gap-2.5 py-2 pr-2 pl-3',
                      /*
                        El activo no solo se tiñe: lleva su barra a la izquierda. Sobre
                        superficie oscura un cambio de fondo se pierde, y §7 pide no fiarlo
                        todo al color.
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
                      {collapsed ? (
                        <span className="sr-only">{item.label}</span>
                      ) : (
                        <span className="truncate">{item.label}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div
        className={cn(
          'border-sidebar-border shrink-0 space-y-2.5 border-t py-3',
          collapsed ? 'px-2' : 'px-3',
        )}
      >
        {/*
          Quién está dentro, y que es superadmin. En la app del negocio esto vive en la
          cabecera y aquí se repite a propósito: es la mitad del recordatorio de dónde
          estás — la otra mitad es el acento.
        */}
        {user && (
          <div
            className={cn('flex items-center gap-2', collapsed && 'justify-center')}
            title={collapsed ? `${user.fullName} · superadmin` : undefined}
          >
            <span className="bg-sidebar-accent text-sidebar-foreground grid size-6 shrink-0 place-items-center rounded-full text-[0.6rem] font-semibold">
              {initials(user.fullName)}
            </span>
            {!collapsed && (
              <span className="text-sidebar-muted-foreground min-w-0 truncate text-[0.7rem]">
                {user.fullName} · superadmin
              </span>
            )}
          </div>
        )}

        {organizations.length > 0 && (
          <FooterLink
            to="/"
            label="Volver a Nummo"
            Icon={ArrowLeft}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        )}
        <FooterLink
          to="/estado"
          label="Estado del sistema"
          Icon={Activity}
          collapsed={collapsed}
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
  collapsed,
  onNavigate,
}: {
  to: string
  label: string
  Icon: LucideIcon
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'text-sidebar-muted-foreground hover:text-sidebar-foreground flex items-center gap-2 text-xs transition-colors',
          'focus-visible:ring-sidebar-ring/60 rounded focus-visible:ring-[3px] focus-visible:outline-none',
          collapsed ? 'justify-center' : 'px-1',
          isActive && 'text-sidebar-foreground font-medium',
        )
      }
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {collapsed ? <span className="sr-only">{label}</span> : label}
    </NavLink>
  )
}
