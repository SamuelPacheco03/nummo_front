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

export type NavItem = { to: string; label: string; Icon: LucideIcon; end?: boolean }
export type NavSection = { title?: string; items: NavItem[] }

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
 * rutas, y las rutas viven en un solo sitio. Sirve a dos cosas —el enlace espejo
 * de móvil y el destino «Cartera» de la barra inferior—, que es justo por lo que
 * merece estar en un único sitio.
 *
 * Las etiquetas van en minúscula porque se leen dentro de una frase: «Ver
 * cuentas por pagar».
 */
export const PORTFOLIO_SECTIONS = [
  { to: '/cartera/cxc', label: 'cuentas por cobrar' },
  { to: '/gastos/cxp', label: 'cuentas por pagar' },
]
