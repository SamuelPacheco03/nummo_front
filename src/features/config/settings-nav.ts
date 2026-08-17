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
import type { SectionGroup } from '@/components/ui/sectioned-layout'

/**
 * Todo lo que se configura una vez y luego se olvida. Vive aquí y no en el
 * sidebar porque §14 es explícito: la navegación principal sigue el modelo
 * mental del usuario, no el modelo de datos. Conceptos, categorías y métodos de
 * pago son catálogos que se tocan al montar la organización, no trabajo diario.
 */
export const GROUPS: SectionGroup[] = [
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
