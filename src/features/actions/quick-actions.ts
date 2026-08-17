import {
  ArrowLeftRight,
  Banknote,
  Coins,
  FileText,
  HandCoins,
  UserPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { canEditContacts, canManageAgreements, type AnyRole } from '@/features/organizations/roles'

export type QuickAction = {
  to: string
  label: string
  /** Verbo suelto para la rejilla del Panel, donde el espacio manda. */
  short?: string
  description: string
  Icon: LucideIcon
  allowed: (role: AnyRole | undefined) => boolean
}

/**
 * Las operaciones del día a día: lo que el usuario viene a *registrar*, no a
 * consultar. Vive en un solo sitio porque se ofrece desde dos —la fila de
 * acciones rápidas del Panel (§16) y el botón central de la barra de móvil
 * (§15)—, y dos catálogos que se desincronizan es exactamente el problema que
 * §2.5 y §64 piden evitar.
 *
 * Dos acciones abren un diálogo que vive dentro de una lista, así que se piden
 * por URL (`?nueva=1`, `?transferir=1`) y la página los abre al llegar.
 */
export const QUICK_ACTIONS: QuickAction[] = [
  {
    to: '/cartera/pagos/nuevo',
    label: 'Registrar pago',
    short: 'Pago',
    description: 'Alguien te pagó',
    Icon: Banknote,
    allowed: canEditContacts,
  },
  {
    to: '/gastos/egresos/nuevo',
    label: 'Registrar egreso',
    short: 'Egreso',
    description: 'Pagaste algo',
    Icon: HandCoins,
    allowed: canEditContacts,
  },
  {
    to: '/cartera/cxc?nueva=1',
    label: 'Nueva cuenta por cobrar',
    short: 'Cobro',
    description: 'Registrar algo que te deben',
    Icon: Coins,
    allowed: canEditContacts,
  },
  {
    to: '/contactos/nuevo',
    label: 'Nuevo contacto',
    short: 'Contacto',
    description: 'Un pagador o un proveedor',
    Icon: UserPlus,
    allowed: canEditContacts,
  },
  {
    to: '/cartera/acuerdos/nuevo',
    label: 'Nuevo acuerdo',
    short: 'Acuerdo',
    description: 'Un cobro que se repite cada mes',
    Icon: FileText,
    allowed: canManageAgreements,
  },
  {
    to: '/caja/cuentas?transferir=1',
    label: 'Transferencia',
    short: 'Transferir',
    description: 'Mover dinero entre tus cuentas',
    Icon: ArrowLeftRight,
    allowed: canEditContacts,
  },
]

/** §47: nunca se ofrece una acción que el rol no puede ejecutar. */
export function allowedQuickActions(role: AnyRole | undefined): QuickAction[] {
  return QUICK_ACTIONS.filter((a) => a.allowed(role))
}
