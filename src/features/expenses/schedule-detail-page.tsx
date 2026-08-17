import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Ban, Pause, Pencil, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DetailDrawer, DetailRow, DetailRows, DetailSection } from '@/components/ui/detail-drawer'
import { StatusBadge } from '@/components/ui/status-badge'
import { useContact } from '@/features/contacts/hooks'
import { useExpenseCategories } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { RECURRENCE_LABELS, scheduleStatus } from './labels'
import { useEndSchedule, useExpenseSchedule, usePauseSchedule, useResumeSchedule } from './hooks'

const LIST = '/gastos/recurrentes'

/** Ficha de un gasto recurrente. Abre como cajón sobre la lista. */
export function ScheduleDetailPage() {
  const { scheduleId } = useParams()
  const { orgId, role } = useCurrentOrg()
  const canManage = canManageAgreements(role)

  const { schedule: s, isPending, isError, error } = useExpenseSchedule(orgId, scheduleId)
  const pause = usePauseSchedule(orgId ?? '')
  const resume = useResumeSchedule(orgId ?? '')
  const end = useEndSchedule(orgId ?? '')
  const [endOpen, setEndOpen] = useState(false)

  const { contact: supplier } = useContact(orgId, s?.supplierContactId)
  const { items: categories } = useExpenseCategories(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'name',
    order: 'asc',
  })
  const categoryName = useMemo(
    () => categories.find((c) => c.id === s?.expenseCategoryId)?.name,
    [categories, s],
  )

  if (isPending) return <DetailDrawer closeTo={LIST} loading />
  if (isError || !s) {
    return (
      <DetailDrawer
        closeTo={LIST}
        title="Gasto recurrente"
        error={getErrorMessage(error, 'No se encontró el recurrente.')}
      />
    )
  }

  const busy = pause.isPending || resume.isPending || end.isPending
  const run = async (action: typeof pause | typeof resume | typeof end, okMsg: string) => {
    try {
      await action.mutateAsync({ orgId: orgId ?? '', id: s.id })
      toast.success(okMsg)
      setEndOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <>
      <DetailDrawer
        closeTo={LIST}
        title={supplier?.displayName ?? s.name ?? 'Gasto recurrente'}
        meta={<StatusBadge {...scheduleStatus(s.status)} />}
        amount={formatAmount(s.agreedAmount, s.currency)}
        actions={
          canManage && (
            <>
              {s.status === 'ACTIVE' && (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => run(pause, 'Pausado')}>
                  <Pause className="size-4" />
                  Pausar
                </Button>
              )}
              {s.status === 'PAUSED' && (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => run(resume, 'Reanudado')}>
                  <Play className="size-4" />
                  Reanudar
                </Button>
              )}
              {(s.status === 'ACTIVE' || s.status === 'PAUSED') && (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/gastos/recurrentes/${s.id}/editar`}>
                      <Pencil className="size-4" />
                      Editar
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => setEndOpen(true)}>
                    <Ban className="size-4" />
                    Finalizar
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        <DetailSection title="Detalle">
          <DetailRows>
            <DetailRow label="Referencia">{s.name}</DetailRow>
            <DetailRow label="Proveedor">{supplier?.displayName ?? '—'}</DetailRow>
            <DetailRow label="Categoría">{categoryName ?? '—'}</DetailRow>
            <DetailRow label="Recurrencia">
              {RECURRENCE_LABELS[s.recurrenceType] ?? s.recurrenceType} · día {s.dueDay}
            </DetailRow>
            <DetailRow label="Vigencia">
              {formatDateHuman(s.startDate)}
              {s.endDate ? ` → ${formatDateHuman(s.endDate)}` : ' → sin fin'}
            </DetailRow>
            <DetailRow label="Generar días antes">{`${s.generateDaysBefore} días`}</DetailRow>
            <DetailRow label="Notas">{s.notes}</DetailRow>
          </DetailRows>
        </DetailSection>
      </DetailDrawer>

      <ConfirmDialog
        open={endOpen}
        onOpenChange={setEndOpen}
        title="Finalizar gasto recurrente"
        description="Dejará de generar gastos. No se puede deshacer."
        confirmLabel="Finalizar"
        destructive
        loading={end.isPending}
        onConfirm={() => run(end, 'Finalizado')}
      />
    </>
  )
}
