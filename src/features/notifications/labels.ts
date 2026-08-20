import {
  AlertTriangle,
  ArrowDownLeft,
  Bell,
  CalendarClock,
  CircleCheck,
  CircleX,
  Landmark,
  RefreshCw,
  Stamp,
  Undo2,
  UserPlus,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/ui/status-badge'
import type { NotificationCategory } from '@/api/generated/model'

/**
 * Las cuatro categorías, con **las palabras de la navegación** (§14) y no las
 * del backend: quien mira el centro busca lo de «Gastos», no lo de `PAYABLES`.
 */
const CATEGORIES: Record<NotificationCategory, string> = {
  RECEIVABLES: 'Cartera',
  PAYABLES: 'Gastos',
  TREASURY: 'Caja',
  TEAM: 'Equipo',
}

/** El orden en que se ofrecen para filtrar: el del sidebar. */
export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'RECEIVABLES',
  'PAYABLES',
  'TREASURY',
  'TEAM',
]

export function notificationCategory(category: string): string {
  return CATEGORIES[category as NotificationCategory] ?? category
}

/** El color del icono. Los cuatro tonos de §7, no una paleta nueva. */
const TONE_TEXT: Record<StatusTone, string> = {
  // `success-strong` y no `success`: el teal de marca vale como relleno, pero
  // como texto sobre fondo claro no llega a AA (§3.2).
  success: 'text-success-strong',
  warning: 'text-warning',
  destructive: 'text-destructive',
  muted: 'text-muted-foreground',
}

/**
 * La clave semántica que firma el backend (`icon`) traducida a un glifo de los
 * nuestros y a su tono.
 *
 * El backend manda una **clave**, no un icono, precisamente para que la
 * iconografía sea nuestra: `lucide-react` es la única familia del producto
 * (§37) y el día que cambie, cambia aquí y en ningún otro sitio.
 *
 * **Sin pastilla tintada detrás.** Un icono dentro de un cuadradito de color
 * repetido en cada fila es el tic de plantilla que §11.1 prohíbe: el icono va
 * al tamaño del texto y el color lo lleva él.
 */
const ICONS: Record<string, { Icon: LucideIcon; tone: StatusTone }> = {
  'receivable-due': { Icon: CalendarClock, tone: 'warning' },
  'receivable-overdue': { Icon: AlertTriangle, tone: 'destructive' },
  'payment-in': { Icon: ArrowDownLeft, tone: 'success' },
  'payment-reversed': { Icon: Undo2, tone: 'warning' },
  'payable-due': { Icon: CalendarClock, tone: 'warning' },
  'payable-overdue': { Icon: AlertTriangle, tone: 'destructive' },
  'auto-collect-failed': { Icon: CircleX, tone: 'destructive' },
  'auto-charge-failed': { Icon: CircleX, tone: 'destructive' },
  approval: { Icon: Stamp, tone: 'warning' },
  approved: { Icon: CircleCheck, tone: 'success' },
  rejected: { Icon: CircleX, tone: 'destructive' },
  balance: { Icon: Landmark, tone: 'warning' },
  recurring: { Icon: RefreshCw, tone: 'muted' },
  'team-activity': { Icon: Users, tone: 'muted' },
  member: { Icon: UserPlus, tone: 'muted' },
}

/**
 * Icono de reserva. El contrato tipa `icon` como cadena libre, así que una
 * clave que este mapa no conozca **no puede dejar la fila sin icono**: se pinta
 * la campana y el aviso se lee igual (§70: lo que no se tiene no se inventa,
 * pero tampoco rompe la pantalla).
 */
const FALLBACK = { Icon: Bell, tone: 'muted' } as const

export function notificationIcon(icon: string): { Icon: LucideIcon; className: string } {
  const { Icon, tone } = ICONS[icon] ?? FALLBACK
  return { Icon, className: TONE_TEXT[tone] }
}
