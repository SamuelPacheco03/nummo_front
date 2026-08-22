import type { Permission } from './permissions'

/**
 * Los permisos en las palabras del usuario, **compuestos y no escritos uno a
 * uno**.
 *
 * Son 57 hoy y el catálogo crece: una tabla con una entrada por permiso se queda
 * coja a la primera clave nueva y nadie se entera —el permiso aparecería en la
 * pantalla como `disbursements.approve`—. Como todos tienen la forma
 * `recurso.acción`, dos tablas pequeñas los cubren todos y **componen el que venga**.
 *
 * Lo que llegue sin traducción se enseña crudo, que es feo pero honesto: se ve
 * al mirar la pantalla en vez de desaparecer.
 */

type Area =
  | 'Organización'
  | 'Contactos'
  | 'Cartera'
  | 'Gastos'
  | 'Caja'
  | 'Catálogos'
  | 'Informes'
  | 'Asistente'
  | 'Notificaciones'
  | 'Cobranza'

/** El orden en que se presentan los grupos: el de la navegación (§14). */
const AREA_ORDER: Area[] = [
  'Contactos',
  'Cartera',
  'Cobranza',
  'Gastos',
  'Caja',
  'Informes',
  'Catálogos',
  'Asistente',
  'Notificaciones',
  'Organización',
]

/** La parte del permiso **antes** de la última acción: `organization.branches`. */
const RESOURCES: Record<string, { label: string; area: Area }> = {
  organization: { label: 'La organización', area: 'Organización' },
  'organization.branches': { label: 'Sedes', area: 'Organización' },
  'organization.members': { label: 'Miembros', area: 'Organización' },
  'organization.roles': { label: 'Roles', area: 'Organización' },
  subscription: { label: 'Plan y suscripción', area: 'Organización' },
  contacts: { label: 'Contactos', area: 'Contactos' },
  agreements: { label: 'Acuerdos de cobro', area: 'Cartera' },
  receivables: { label: 'Cuentas por cobrar', area: 'Cartera' },
  payments: { label: 'Pagos', area: 'Cartera' },
  interest_policies: { label: 'Políticas de interés', area: 'Cartera' },
  expenses: { label: 'Cuentas por pagar', area: 'Gastos' },
  disbursements: { label: 'Egresos', area: 'Gastos' },
  expense_schedules: { label: 'Gastos recurrentes', area: 'Gastos' },
  treasury: { label: 'Caja y transferencias', area: 'Caja' },
  financial_accounts: { label: 'Cuentas de dinero', area: 'Catálogos' },
  payment_methods: { label: 'Métodos de pago', area: 'Catálogos' },
  // Dónde puede pagar quien debe: lo que sale en los recordatorios de cobro. Distinto de
  // «Métodos de pago», que es cómo se registró un pago que ya entró.
  payment_instructions: { label: 'Formas de cobro', area: 'Catálogos' },
  billing_concepts: { label: 'Conceptos de cobro', area: 'Catálogos' },
  expense_categories: { label: 'Categorías de gasto', area: 'Catálogos' },
  reports: { label: 'Informes', area: 'Informes' },
  search: { label: 'Buscador', area: 'Informes' },
  knowledge: { label: 'Base de conocimiento', area: 'Informes' },
  assistant: { label: 'Numi', area: 'Asistente' },
  // Las imágenes que se le mandan a Numi quedan archivadas aquí.
  documents: { label: 'Documentos', area: 'Asistente' },
  'assistant.settings': { label: 'Ajustes de Numi', area: 'Asistente' },
  notifications: { label: 'Notificaciones', area: 'Notificaciones' },
  'notifications.settings': { label: 'Política de avisos', area: 'Notificaciones' },
  // La cobranza por WhatsApp es su propia área y no un apartado de Cartera: el
  // destinatario no es quien usa Nummo, es el deudor. Los mensajes y su política
  // van por `messaging`; el canal —plantillas y cuenta de Meta— por `whatsapp`.
  messaging: { label: 'Mensajes al deudor', area: 'Cobranza' },
  'messaging.settings': { label: 'Política de cobranza', area: 'Cobranza' },
  'whatsapp.templates': { label: 'Plantillas de WhatsApp', area: 'Cobranza' },
  'whatsapp.settings': { label: 'Cuenta de WhatsApp', area: 'Cobranza' },
}

/** La última parte: el verbo. */
const ACTIONS: Record<string, string> = {
  read: 'Ver',
  use: 'Usar',
  // De audiencia, no de dato: solo resta destinatarios. Quien no lo tiene deja de
  // recibir lo que registran los demás; nunca da acceso a algo que no pudiera ver.
  team_activity: 'Recibir la actividad del equipo',
  write: 'Crear y editar',
  // Existe en el catálogo y **ninguna ruta lo usa todavía**: no hay endpoint de
  // enviar un mensaje suelto. Se nombra igual porque el editor de roles lo lista
  // —el backend lo publica— y una clave cruda ahí no la entiende nadie.
  send: 'Enviar',
  archive: 'Archivar',
  create: 'Registrar',
  adjust: 'Ajustar',
  allocate: 'Repartir anticipos',
  manage: 'Gestionar',
  reverse: 'Reversar',
  approve: 'Aprobar',
  transfer: 'Transferir',
  transfer_ownership: 'Transferir la propiedad',
  delete: 'Eliminar',
}

function split(permission: Permission): { resource: string; action: string } {
  const parts = permission.split('.')
  return { resource: parts.slice(0, -1).join('.'), action: parts.at(-1) ?? '' }
}

/** «Reversar» — el verbo solo, para listarlo bajo el nombre de su recurso. */
export function permissionAction(permission: Permission): string {
  return ACTIONS[split(permission).action] ?? split(permission).action
}

/** «Pagos» — de qué va el permiso. */
export function permissionResource(permission: Permission): string {
  const { resource } = split(permission)
  return RESOURCES[resource]?.label ?? resource
}

/** «Pagos · Reversar», para nombrarlo suelto (un error, una lista plana). */
export function permissionLabel(permission: Permission): string {
  return `${permissionResource(permission)} · ${permissionAction(permission)}`
}

interface PermissionGroup {
  area: string
  resources: { resource: string; label: string; permissions: Permission[] }[]
}

/**
 * Los permisos agrupados por área y, dentro, por recurso: es como se decide
 * «este rol lleva la cartera» sin leer cincuenta y siete casillas sueltas.
 *
 * Un recurso que el catálogo estrene y esta tabla no conozca **no se pierde**:
 * cae en «Otros», con su clave cruda a la vista.
 */
export function groupPermissions(permissions: readonly Permission[]): PermissionGroup[] {
  const byArea = new Map<string, Map<string, Permission[]>>()

  for (const permission of permissions) {
    const { resource } = split(permission)
    const area = RESOURCES[resource]?.area ?? 'Otros'
    const resources = byArea.get(area) ?? new Map<string, Permission[]>()
    resources.set(resource, [...(resources.get(resource) ?? []), permission])
    byArea.set(area, resources)
  }

  const order = [...AREA_ORDER, 'Otros'] as string[]
  return order
    .filter((area) => byArea.has(area))
    .map((area) => ({
      area,
      resources: [...byArea.get(area)!.entries()].map(([resource, items]) => ({
        resource,
        label: RESOURCES[resource]?.label ?? resource,
        permissions: items,
      })),
    }))
}
