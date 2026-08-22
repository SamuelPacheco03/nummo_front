import {
  Bell,
  BellRing,
  Bot,
  Building2,
  CreditCard,
  Gauge,
  KeyRound,
  MapPin,
  MessageSquareQuote,
  MessageSquareText,
  MonitorSmartphone,
  Palette,
  Percent,
  Phone,
  ReceiptText,
  ShieldCheck,
  RefreshCw,
  Tags,
  UserCog,
  Wallet,
  Wallet2,
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
      { to: '/config/roles', label: 'Roles', Icon: KeyRound },
      { to: '/config/avisos', label: 'Política de avisos', Icon: BellRing },
      { to: '/config/plan', label: 'Plan y consumo', Icon: Gauge },
      { to: '/config/sesiones', label: 'Sesiones', Icon: MonitorSmartphone },
    ],
  },
  {
    title: 'Preferencias',
    items: [
      { to: '/config/apariencia', label: 'Apariencia', Icon: Palette },
      { to: '/config/notificaciones', label: 'Notificaciones', Icon: Bell },
      { to: '/config/asistente', label: 'Asistente', Icon: Bot },
      { to: '/config/aplicacion', label: 'Aplicación', Icon: RefreshCw },
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
    items: [
      { to: '/cartera/interes', label: 'Políticas de interés', Icon: Percent },
      // La política es un ajuste que se toca una vez; el historial de lo que se
      // le escribió al deudor es trabajo diario y vive en el sidebar (§14).
      { to: '/config/cobranza', label: 'Cobranza por WhatsApp', Icon: MessageSquareText },
      // Dónde puede pagar el deudor. Va en Cartera y no en Catálogos porque no
      // es una lista base que se toca al montar: es lo que sale en cada
      // recordatorio, y cambiarla cambia a qué cuenta llega la plata.
      { to: '/config/formas-de-pago', label: 'Formas de pago', Icon: Wallet2 },
      { to: '/config/plantillas', label: 'Plantillas de WhatsApp', Icon: MessageSquareQuote },
      // Desde qué número sale: es otra pregunta que «¿puedo cobrar por
      // WhatsApp?», y por eso tiene pantalla propia (§11.1.16).
      { to: '/config/whatsapp', label: 'Número de WhatsApp', Icon: Phone },
    ],
  },
  {
    // Su hermana del otro lado del dinero: una política, no un catálogo.
    title: 'Gastos',
    items: [{ to: '/gastos/aprobacion', label: 'Aprobación de egresos', Icon: ShieldCheck }],
  },
]

/** Rutas que cuelgan de Configuración, para que el sidebar marque su enlace activo. */
export const SETTINGS_PATHS = GROUPS.flatMap((g) => g.items.map((i) => i.to))

export function isSettingsPath(pathname: string): boolean {
  return SETTINGS_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
