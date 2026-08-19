import type { OrganizationStatus } from '@/api/generated/model'
import type { StatusTone } from '@/components/ui/status-badge'

/**
 * El estado de la organización lo administra la plataforma, no ella misma. Se
 * muestra porque **cambia lo que se puede hacer**: si no está activa, se
 * consulta y se exporta, pero no se registra ni se modifica nada (§45.4).
 */
const ORG_STATUS: Record<OrganizationStatus, { tone: StatusTone; label: string }> = {
  ACTIVE: { tone: 'success', label: 'Activa' },
  SUSPENDED: { tone: 'warning', label: 'Suspendida' },
  ARCHIVED: { tone: 'muted', label: 'Archivada' },
}

export function orgStatus(status: OrganizationStatus): { tone: StatusTone; label: string } {
  return ORG_STATUS[status]
}
