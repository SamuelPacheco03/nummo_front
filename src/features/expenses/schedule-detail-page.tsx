import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Ban, Pause, Pencil, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DetailDrawer, DetailRow, DetailRows, DetailSection } from '@/components/ui/detail-drawer'
import { StatusBadge } from '@/components/ui/status-badge'
import { AutoChargeSection } from '@/components/auto-charge-section'
import { useContact } from '@/features/contacts/hooks'
import { useExpenseCategories } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { getErrorMessage } from '@/lib/errors'
import { toastApiError } from '@/features/platform/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { useKeepFilters } from '@/lib/use-list-filters'
import { RECURRENCE_LABELS, scheduleStatus } from './labels'
import {
  useEndSchedule,
  useExpenseSchedule,
  usePauseSchedule,
  useResumeSchedule,
  useSetScheduleAutoCharge,
} from './hooks'

const LIST = '/gastos/recurrentes'

/**
 * La otra cara del espejo, y lo que la distingue no es el tono: por encima del
 * umbral de aprobación de la organización el cargo automático **no paga**, deja
 * una solicitud esperando firma. Sin decirlo, alguien pone un automático de tres
 * millones y da por hecho que el dinero salió.
 */
const COPY = {
  title: 'Pago automático',
  description:
    'Cada gasto de este recurrente se registra como pagado el día que vence, sin que nadie lo toque.',
  warning: {
    title: 'Si es un monto grande no paga: pide firma',
    body:
      'Si el gasto supera el monto que la organización pide aprobar, el automático deja una solicitud esperando firma y no mueve dinero. Por debajo, el egreso se registra solo.',
  },
  enableTitle: 'Activar el pago automático',
  disableDescription:
    'Los próximos gastos de este recurrente volverán a esperar que alguien registre el egreso. Lo ya registrado se queda como está.',
}

/** Ficha de un gasto recurrente. Abre como cajón sobre la lista. */
export function ScheduleDetailPage() {
  const { scheduleId } = useParams()
  const keepFilters = useKeepFilters()
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canManage = can('expense_schedules.manage')
  // El permiso de registrar el egreso que va a registrar solo, no el de
  // gestionar el recurrente.
  const canAutoCharge = can('disbursements.create')

  const { schedule: s, isPending, isError, error } = useExpenseSchedule(orgId, scheduleId)
  const pause = usePauseSchedule(orgId ?? '')
  const resume = useResumeSchedule(orgId ?? '')
  const end = useEndSchedule(orgId ?? '')
  const autoCharge = useSetScheduleAutoCharge(orgId ?? '')
  const [endOpen, setEndOpen] = useState(false)

  const { contact: supplier } = useContact(orgId, s?.supplierContactId)
  const { items: categories } = useExpenseCategories(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'position',
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
      toastApiError(err)
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
                    <Link to={keepFilters(`/gastos/recurrentes/${s.id}/editar`)}>
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

        <AutoChargeSection
          autoCharge={s.autoCharge}
          canManage={canAutoCharge}
          copy={COPY}
          onSave={(data) => autoCharge.mutateAsync({ orgId: orgId ?? '', id: s.id, data })}
        />
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
