import { NavLink, Outlet } from 'react-router'
import {
  Bot,
  Building2,
  CreditCard,
  MapPin,
  MonitorSmartphone,
  Palette,
  Percent,
  ReceiptText,
  Tags,
  UserCog,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type SettingsItem = { to: string; label: string; Icon: LucideIcon }
type SettingsGroup = { title: string; items: SettingsItem[] }

/**
 * Todo lo que se configura una vez y luego se olvida. Vive aquí y no en el
 * sidebar porque §14 es explícito: la navegación principal sigue el modelo
 * mental del usuario, no el modelo de datos. Conceptos, categorías y métodos de
 * pago son catálogos que se tocan al montar la organización, no trabajo diario.
 */
const GROUPS: SettingsGroup[] = [
  {
    title: 'Organización',
    items: [
      { to: '/config/empresa', label: 'Empresa', Icon: Building2 },
      { to: '/config/sedes', label: 'Sedes', Icon: MapPin },
      { to: '/config/miembros', label: 'Miembros', Icon: UserCog },
      { to: '/config/sesiones', label: 'Sesiones', Icon: MonitorSmartphone },
    ],
  },
  {
    title: 'Preferencias',
    items: [
      { to: '/config/apariencia', label: 'Apariencia', Icon: Palette },
      { to: '/config/asistente', label: 'Asistente', Icon: Bot },
    ],
  },
  {
    // "Maestros" era jerga de backend. Son las listas base que se reutilizan.
    title: 'Catálogos',
    items: [
      { to: '/maestros/conceptos', label: 'Conceptos de cobro', Icon: ReceiptText },
      { to: '/maestros/categorias', label: 'Categorías de gasto', Icon: Tags },
      { to: '/maestros/metodos', label: 'Métodos de pago', Icon: CreditCard },
      { to: '/maestros/cuentas', label: 'Cuentas', Icon: Wallet },
    ],
  },
  {
    title: 'Cartera',
    items: [{ to: '/cartera/interes', label: 'Políticas de interés', Icon: Percent }],
  },
]

/** Rutas que cuelgan de Configuración, para que el sidebar marque su enlace activo. */
export const SETTINGS_PATHS = GROUPS.flatMap((g) => g.items.map((i) => i.to))

export function isSettingsPath(pathname: string): boolean {
  return SETTINGS_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

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
        className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden"
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
