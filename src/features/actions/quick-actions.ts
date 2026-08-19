import {
  ArrowLeftRight,
  Banknote,
  Coins,
  FileText,
  HandCoins,
  UserPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Permission } from '@/features/platform/permissions'

type QuickAction = {
  to: string
  label: string
  /** Verbo suelto para la rejilla del Panel, donde el espacio manda. */
  short?: string
  description: string
  Icon: LucideIcon
  /** El permiso que el contrato exige a su endpoint (`x-required-permission`). */
  permission: Permission
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
const QUICK_ACTIONS: QuickAction[] = [
  {
    to: '/cartera/pagos/nuevo',
    label: 'Registrar pago',
    short: 'Pago',
    description: 'Alguien te pagó',
    Icon: Banknote,
    permission: 'payments.create',
  },
  {
    to: '/gastos/egresos/nuevo',
    label: 'Registrar egreso',
    short: 'Egreso',
    description: 'Pagaste algo',
    Icon: HandCoins,
    permission: 'disbursements.create',
  },
  {
    to: '/cartera/cxc?nueva=1',
    label: 'Nueva cuenta por cobrar',
    short: 'Cobro',
    description: 'Registrar algo que te deben',
    Icon: Coins,
    permission: 'receivables.create',
  },
  {
    to: '/contactos/nuevo',
    label: 'Nuevo contacto',
    short: 'Contacto',
    description: 'Un pagador o un proveedor',
    Icon: UserPlus,
    permission: 'contacts.write',
  },
  {
    to: '/cartera/acuerdos/nuevo',
    label: 'Nuevo acuerdo',
    short: 'Acuerdo',
    description: 'Un cobro que se repite cada mes',
    Icon: FileText,
    permission: 'agreements.manage',
  },
  {
    to: '/caja/cuentas?transferir=1',
    label: 'Transferencia',
    short: 'Transferir',
    description: 'Mover dinero entre tus cuentas',
    Icon: ArrowLeftRight,
    permission: 'treasury.transfer',
  },
]

/**
 * §47: nunca se ofrece una acción que el usuario no puede ejecutar.
 *
 * Recibe el predicado de `useCan()` en vez de llamarlo: así el catálogo sigue
 * siendo un módulo sin React, que es lo que permite probarlo sin montar nada.
 */
export function allowedQuickActions(can: (permission: Permission) => boolean): QuickAction[] {
  return QUICK_ACTIONS.filter((a) => can(a.permission))
}
