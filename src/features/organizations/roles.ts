import type { MemberRole, OrganizationSummaryRole } from '@/api/generated/model'

export type AnyRole = OrganizationSummaryRole | MemberRole

/*
 * Aquí vivían `canManageOrg`, `canEditContacts` y `canManageAgreements`: tres
 * predicados escritos contra nombres de rol. El backend ya no autoriza así
 * —cada operación declara su `x-required-permission`—, y los tres agrupaban
 * cosas que el contrato distingue: `canManageOrg` cubría nueve permisos
 * distintos, de modo que sedes, miembros y catálogos quedaban gateados por la
 * misma condición aunque el API los separe.
 *
 * Lo que queda de un rol es su **nombre**, que es lo que se enseña y lo que se
 * asigna. Para decidir si se ofrece una acción, `useCan` (features/platform).
 */

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
