import { NavLink, Outlet } from 'react-router'
import { cn } from '@/lib/utils'
import { GROUPS, type SettingsItem } from './settings-nav'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm whitespace-nowrap transition-colors',
    'text-muted-foreground hover:bg-secondary hover:text-foreground',
    'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
    isActive && 'bg-secondary text-foreground font-medium',
  )

function SettingsLink({ item }: { item: SettingsItem }) {
  return (
    <NavLink to={item.to} className={linkClass}>
      {({ isActive }) => (
        <>
          <item.Icon aria-hidden className={cn('size-4 shrink-0', isActive && 'text-brand')} />
          {item.label}
        </>
      )}
    </NavLink>
  )
}

/**
 * Shell de Configuración: una sola entrada en el sidebar que abre su propia
 * navegación.
 *
 * En escritorio la sub-navegación es una columna fija a la izquierda —el patrón
 * que el usuario ya conoce de cualquier panel de ajustes—. Por debajo de `lg`
 * se convierte en una tira horizontal desplazable, porque una segunda columna
 * de 200 px en una pantalla de 768 no deja sitio para el formulario.
 *
 * Cada página conserva su propio `PageHeader`: este layout aporta la navegación,
 * no el encabezado.
 */
export function SettingsLayout() {
  return (
    <div className="lg:flex lg:gap-8">
      {/* Escritorio: columna fija y agrupada */}
      <nav
        aria-label="Configuración"
        className="sticky top-8 hidden w-52 shrink-0 flex-col gap-5 self-start lg:flex"
      >
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5">
            <div className="text-muted-foreground px-2.5 pb-1 text-[0.68rem] font-medium tracking-wider uppercase">
              {group.title}
            </div>
            {group.items.map((item) => (
              <SettingsLink key={item.to} item={item} />
            ))}
          </div>
        ))}
      </nav>

      {/*
        Móvil y tablet: una sola tira. Los títulos de grupo se caen a propósito
        —en horizontal separan menos de lo que estorban— pero el orden se
        conserva, así que el agrupamiento sigue leyéndose.
      */}
      <nav
        aria-label="Configuración"
        className="scrollbar-slim -mx-4 mb-6 flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden"
      >
        {GROUPS.flatMap((g) => g.items).map((item) => (
          <SettingsLink key={item.to} item={item} />
        ))}
      </nav>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
