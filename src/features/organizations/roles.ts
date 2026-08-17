import type { MemberRole, OrganizationSummaryRole } from '@/api/generated/model'

export type AnyRole = OrganizationSummaryRole | MemberRole

/** OWNER/ADMIN pueden gestionar org, sedes, miembros y maestros (el API es el guard real). */
export function canManageOrg(role: AnyRole | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}

/** Contactos: crear/editar/archivar = todos menos VIEWER (el API es el guard real). */
export function canEditContacts(role: AnyRole | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'ACCOUNTANT' || role === 'OPERATOR'
}

/** Acuerdos de facturación: crear/editar/ciclo de vida = OWNER/ADMIN/ACCOUNTANT. */
export function canManageAgreements(role: AnyRole | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'ACCOUNTANT'
}

const ROLE_LABELS: Record<AnyRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  ACCOUNTANT: 'Contador',
  OPERATOR: 'Operador',
  VIEWER: 'Lector',
}

export function roleLabel(role: string | undefined): string {
  if (!role) return '—'
  return ROLE_LABELS[role as AnyRole] ?? role
}

/** Roles asignables a un miembro (todos menos… todos; el backend valida OWNER único, etc.). */
export const ASSIGNABLE_ROLES: AnyRole[] = ['OWNER', 'ADMIN', 'ACCOUNTANT', 'OPERATOR', 'VIEWER']
