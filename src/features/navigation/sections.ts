import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Coins,
  FileText,
  Landmark,
  LayoutDashboard,
  PieChart,
  Settings,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavItem = { to: string; label: string; Icon: LucideIcon; end?: boolean }
type NavSection = { title?: string; items: NavItem[] }

export const SECTIONS: NavSection[] = [
  {
    items: [
      { to: '/', label: 'Panel', Icon: LayoutDashboard, end: true },
      { to: '/contactos', label: 'Contactos', Icon: Users },
    ],
  },
  {
    title: 'Cartera',
    items: [
      { to: '/cartera/cxc', label: 'Cuentas por cobrar', Icon: Coins },
      { to: '/cartera/pagos', label: 'Pagos', Icon: Banknote },
      { to: '/cartera/acuerdos', label: 'Acuerdos', Icon: FileText },
    ],
  },
  {
    title: 'Gastos',
    items: [
      { to: '/gastos/cxp', label: 'Cuentas por pagar', Icon: Coins },
      { to: '/gastos/egresos', label: 'Egresos', Icon: Banknote },
      { to: '/gastos/recurrentes', label: 'Recurrentes', Icon: FileText },
    ],
  },
  {
    title: 'Caja',
    items: [
      { to: '/caja/cuentas', label: 'Cuentas', Icon: Landmark },
      { to: '/caja/movimientos', label: 'Movimientos', Icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Informes',
    items: [
      { to: '/informes/resultados', label: 'Resultados', Icon: BarChart3 },
      { to: '/informes/cartera', label: 'Cobros y pagos', Icon: PieChart },
    ],
  },
  {
    // Configuración entra como un único enlace: sus once pantallas viven en la
    // sub-navegación de SettingsLayout. Volcarlas aquí sería exponer el modelo
    // de datos en la navegación principal, que es justo lo que §14 prohíbe.
    items: [{ to: '/config', label: 'Configuración', Icon: Settings }],
  },
]

/**
 * Las dos caras de la cartera: lo que te deben y lo que debes.
 *
 * Se declara aquí, junto al resto de la navegación, y no en el componente: son
 * rutas, y las rutas viven en un solo sitio. Sirve a dos cosas —el `SectionSwitch`
 * de móvil y el destino «Cartera» de la barra inferior—, que es justo por lo que
 * merece estar en un único sitio.
 */
export const PORTFOLIO_SECTIONS = [
  { to: '/cartera/cxc', label: 'Por cobrar' },
  { to: '/gastos/cxp', label: 'Por pagar' },
]

/**
 * El otro par espejo: el dinero que ya se movió.
 *
 * Mismo motivo que `PORTFOLIO_SECTIONS` —se consultan a la vez y en móvil la
 * navegación está detrás de «Más»— y misma pareja de destinos para la barra
 * inferior.
 */
export const LEDGER_SECTIONS = [
  { to: '/cartera/pagos', label: 'Pagos' },
  { to: '/gastos/egresos', label: 'Egresos' },
]

/**
 * Y el tercero: lo que se repite todos los meses, cobrando y pagando.
 *
 * Un acuerdo y un gasto recurrente son la misma plantilla —genera sola la cuenta
 * de cada período— desde los dos lados del dinero.
 */
export const RECURRING_SECTIONS = [
  { to: '/cartera/acuerdos', label: 'Cobros' },
  { to: '/gastos/recurrentes', label: 'Gastos' },
]
