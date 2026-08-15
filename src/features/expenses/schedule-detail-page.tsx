import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Ban, Pause, Pencil, Play } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useContact } from '@/features/contacts/hooks'
import { useExpenseCategories } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import type { ReactNode } from 'react'
import { RECURRENCE_LABELS } from './labels'
import { ScheduleStatusPill } from './schedules-list-page'
import {
  useEndSchedule,
  useExpenseSchedule,
  usePauseSchedule,
  useResumeSchedule,
} from './hooks'

function Row({ label, children }: { label: string; children: ReactNode }) {
  if (children == null || children === '') return null
  return (
    <div className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="nums col-span-2 break-words">{children}</dd>
    </div>
  )
}

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
  const { items: categories } = useExpenseCategories(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const categoryName = useMemo(
    () => categories.find((c) => c.id === s?.expenseCategoryId)?.name,
    [categories, s],
  )

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (isError || !s) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/gastos/recurrentes">
            <ArrowLeft className="size-4" />
            Gastos recurrentes
          </Link>
        </Button>
        <p className="text-sm text-destructive">{getErrorMessage(error, 'No se encontró el recurrente.')}</p>
      </div>
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
    <div className="max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/gastos/recurrentes">
            <ArrowLeft className="size-4" />
            Gastos recurrentes
          </Link>
        </Button>
        <PageHeader
          title={supplier?.displayName ?? s.name ?? 'Gasto recurrente'}
          description={<ScheduleStatusPill status={s.status} />}
        >
          {canManage && (
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
          )}
        </PageHeader>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Detalle</h2>
        <Card className="gap-0 py-0">
          <dl className="divide-y">
            <Row label="Proveedor">{supplier?.displayName ?? '—'}</Row>
            <Row label="Categoría">{categoryName ?? '—'}</Row>
            <Row label="Monto">
              <span className="font-medium">{formatAmount(s.agreedAmount, s.currency)}</span>
            </Row>
            <Row label="Recurrencia">
              {RECURRENCE_LABELS[s.recurrenceType] ?? s.recurrenceType} · día {s.dueDay}
            </Row>
            <Row label="Vigencia">
              {formatDateHuman(s.startDate)}
              {s.endDate ? ` → ${formatDateHuman(s.endDate)}` : ' → sin fin'}
            </Row>
            <Row label="Generar días antes">{`${s.generateDaysBefore} días`}</Row>
            <Row label="Notas">{s.notes}</Row>
          </dl>
        </Card>
      </section>

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
    </div>
  )
}
