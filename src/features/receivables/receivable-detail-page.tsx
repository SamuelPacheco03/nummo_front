import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Ban, Banknote, HandCoins, Plus, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useContact } from '@/features/contacts/hooks'
import { useBillingConcepts } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts, canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { AddAdjustmentDialog } from './add-adjustment-dialog'
import { WaiveInterestDialog } from './waive-interest-dialog'
import { StatusPill } from './receivables-list-page'
import { ADJUSTMENT_TYPE_LABELS } from './labels'
import {
  useAccruals,
  useCancelReceivable,
  useReceivable,
  useReverseAdjustment,
  useWriteOffReceivable,
} from './hooks'

function Row({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('nums', strong && 'font-semibold')}>{children}</span>
    </div>
  )
}

const CLOSED = new Set(['CANCELLED', 'WRITTEN_OFF'])

export function ReceivableDetailPage() {
  const { receivableId } = useParams()
  const { orgId, role } = useCurrentOrg()
  const canAdjust = canEditContacts(role)
  const canManage = canManageAgreements(role)

  const { detail, isPending, isError, error } = useReceivable(orgId, receivableId)
  const reverseAdj = useReverseAdjustment(orgId ?? '')
  const cancel = useCancelReceivable(orgId ?? '')
  const writeOff = useWriteOffReceivable(orgId ?? '')

  const { accruals } = useAccruals(orgId, receivableId)

  const [adjOpen, setAdjOpen] = useState(false)
  const [waiveOpen, setWaiveOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [writeOffOpen, setWriteOffOpen] = useState(false)
  const [reversingId, setReversingId] = useState<string | null>(null)

  const r = detail?.receivable
  const { contact: payer } = useContact(orgId, r?.payerContactId)
  const { items: concepts } = useBillingConcepts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const conceptName = useMemo(
    () => concepts.find((c) => c.id === r?.billingConceptId)?.name,
    [concepts, r],
  )

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (isError || !detail || !r) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cartera/cxc">
            <ArrowLeft className="size-4" />
            Cuentas por cobrar
          </Link>
        </Button>
        <p className="text-sm text-destructive">{getErrorMessage(error, 'No se encontró la cuenta.')}</p>
      </div>
    )
  }

  const b = detail.balance
  const status = b?.displayStatus ?? r.state
  const isClosed = CLOSED.has(status)

  const runClose = async (
    action: typeof cancel | typeof writeOff,
    okMsg: string,
    close: () => void,
  ) => {
    try {
      await action.mutateAsync({ orgId: orgId ?? '', id: r.id, data: {} })
      toast.success(okMsg)
      close()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const onReverse = async (adjustmentId: string) => {
    setReversingId(adjustmentId)
    try {
      await reverseAdj.mutateAsync({ orgId: orgId ?? '', id: r.id, adjustmentId })
      toast.success('Ajuste reversado')
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo reversar'))
    } finally {
      setReversingId(null)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/cartera/cxc">
            <ArrowLeft className="size-4" />
            Cuentas por cobrar
          </Link>
        </Button>
        <PageHeader
          title={payer?.displayName ?? 'Cuenta por cobrar'}
          description={
            <span className="flex items-center gap-2">
              {conceptName ?? '—'}
              <span className="text-border">·</span>
              <StatusPill status={status} />
            </span>
          }
        >
          {canAdjust && !isClosed && (
            <>
              <Button asChild size="sm">
                <Link to={`/cartera/pagos/nuevo?payer=${r.payerContactId}`}>
                  <Banknote className="size-4" />
                  Registrar pago
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAdjOpen(true)}>
                <Plus className="size-4" />
                Ajuste
              </Button>
            </>
          )}
          {canManage && !isClosed && (
            <>
              {Number(b?.interestTotal) > 0 && (
                <Button variant="outline" size="sm" onClick={() => setWaiveOpen(true)}>
                  <HandCoins className="size-4" />
                  Condonar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>
                <XCircle className="size-4" />
                Cancelar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWriteOffOpen(true)}>
                <Ban className="size-4" />
                Castigar
              </Button>
            </>
          )}
        </PageHeader>
      </div>

      {/* Saldo */}
      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Saldo</h2>
        <Card className="gap-0 py-0">
          <div className="divide-y">
            <Row label="Valor original">{formatAmount(b?.originalAmount ?? r.originalAmount, r.currency)}</Row>
            {b && Number(b.adjustmentsTotal) !== 0 && (
              <Row label="Ajustes">{formatAmount(b.adjustmentsTotal, r.currency)}</Row>
            )}
            {b && Number(b.interestTotal) !== 0 && (
              <Row label="Interés de mora">{formatAmount(b.interestTotal, r.currency)}</Row>
            )}
            {b && Number(b.paidTotal) !== 0 && (
              <Row label="Pagado">− {formatAmount(b.paidTotal, r.currency)}</Row>
            )}
            <Row label="Saldo" strong>
              {formatAmount(b?.balance ?? r.originalAmount, r.currency)}
            </Row>
          </div>
        </Card>
      </section>

      {/* Causaciones de mora */}
      {accruals.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Causaciones de mora
          </h2>
          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {accruals.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="nums">{a.accrualDate}</div>
                    <div className="nums text-xs text-muted-foreground">
                      {a.daysOverdue} día(s) · base {formatAmount(a.baseAmount, r.currency)} · {a.rateValue}%
                    </div>
                  </div>
                  <span className="nums font-medium">{formatAmount(a.amount, r.currency)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Info */}
      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Detalle</h2>
        <Card className="gap-0 py-0">
          <div className="divide-y">
            <Row label="Vence">{formatDateHuman(r.dueDate)}</Row>
            <Row label="Emitida">{r.issueDate}</Row>
            {r.notes && <Row label="Notas">{r.notes}</Row>}
            {r.cancellationReason && <Row label="Motivo cierre">{r.cancellationReason}</Row>}
          </div>
        </Card>
      </section>

      {/* Ajustes */}
      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Ajustes</h2>
        <Card className="gap-0 py-0">
          {detail.adjustments.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin ajustes.</p>
          ) : (
            <ul className="divide-y">
              {detail.adjustments.map((adj) => {
                const reversed = !!adj.reversedAt
                // El monto ya viene firmado desde el backend (negativo = reduce el saldo).
                const isReduction = Number(adj.amount) < 0
                const engineManaged = adj.adjustmentType === 'INTEREST' || adj.adjustmentType === 'WAIVER'
                return (
                  <li key={adj.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className={cn('font-medium', reversed && 'text-muted-foreground line-through')}>
                        {ADJUSTMENT_TYPE_LABELS[adj.adjustmentType] ?? adj.adjustmentType}
                      </div>
                      {adj.reason && <div className="truncate text-xs text-muted-foreground">{adj.reason}</div>}
                    </div>
                    <span
                      className={cn(
                        'nums shrink-0',
                        reversed && 'text-muted-foreground line-through',
                        !reversed && isReduction && 'text-success-strong',
                      )}
                    >
                      {formatAmount(adj.amount)}
                    </span>
                    {reversed ? (
                      <span className="shrink-0 text-xs text-muted-foreground">reversado</span>
                    ) : (
                      canManage &&
                      !engineManaged && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0"
                          disabled={reversingId === adj.id}
                          onClick={() => onReverse(adj.id)}
                          aria-label="Reversar ajuste"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </section>

      {orgId && (
        <AddAdjustmentDialog orgId={orgId} receivableId={r.id} open={adjOpen} onOpenChange={setAdjOpen} />
      )}
      {orgId && b && (
        <WaiveInterestDialog
          orgId={orgId}
          receivableId={r.id}
          interestTotal={b.interestTotal}
          currency={r.currency}
          open={waiveOpen}
          onOpenChange={setWaiveOpen}
        />
      )}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar cuenta por cobrar"
        description="La cuenta dejará de estar activa. No se puede deshacer."
        confirmLabel="Cancelar cuenta"
        destructive
        loading={cancel.isPending}
        onConfirm={() => runClose(cancel, 'Cuenta cancelada', () => setCancelOpen(false))}
      />
      <ConfirmDialog
        open={writeOffOpen}
        onOpenChange={setWriteOffOpen}
        title="Castigar cuenta por cobrar"
        description="Se marca como incobrable (write-off). No se puede deshacer."
        confirmLabel="Castigar"
        destructive
        loading={writeOff.isPending}
        onConfirm={() => runClose(writeOff, 'Cuenta castigada', () => setWriteOffOpen(false))}
      />
    </div>
  )
}
