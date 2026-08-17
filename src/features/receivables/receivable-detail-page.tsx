import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Ban, Banknote, HandCoins, MoreHorizontal, Plus, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DetailDrawer,
  DetailEmpty,
  DetailRow,
  DetailRows,
  DetailSection,
} from '@/components/ui/detail-drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { useContact } from '@/features/contacts/hooks'
import { useBillingConcepts } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts, canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AddAdjustmentDialog } from './add-adjustment-dialog'
import { WaiveInterestDialog } from './waive-interest-dialog'
import { ADJUSTMENT_TYPE_LABELS, receivableStatus } from './labels'
import {
  useAccruals,
  useCancelReceivable,
  useReceivable,
  useReverseAdjustment,
  useWriteOffReceivable,
} from './hooks'

const LIST = '/cartera/cxc'
const CLOSED = new Set(['CANCELLED', 'WRITTEN_OFF'])

/**
 * Ficha de una cuenta por cobrar. Abre como cajón sobre la lista, igual que su
 * espejo en cuentas por pagar (§94.0).
 *
 * Vivió un tiempo como pantalla completa con su propio `PageHeader` y sus
 * tarjetas: al abrirla se perdían los filtros y el scroll de la lista, y al
 * volver había que reconstruirlos. Ahora es una ruta **hija** de la lista, que
 * sigue montada detrás (§87.5).
 */
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
  const { items: concepts } = useBillingConcepts(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'name',
    order: 'asc',
  })
  const conceptName = useMemo(
    () => concepts.find((c) => c.id === r?.billingConceptId)?.name,
    [concepts, r],
  )

  if (isPending) return <DetailDrawer closeTo={LIST} loading />
  if (isError || !detail || !r) {
    return (
      <DetailDrawer
        closeTo={LIST}
        title="Cuenta por cobrar"
        error={getErrorMessage(error, 'No se encontró la cuenta.')}
      />
    )
  }

  const b = detail.balance
  const status = b?.displayStatus ?? r.state
  const isClosed = CLOSED.has(status)
  const canWaive = canManage && Number(b?.interestTotal) > 0
  const hasMenu = !isClosed && (canAdjust || canManage)

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
    <>
      <DetailDrawer
        closeTo={LIST}
        title={payer?.displayName ?? 'Cuenta por cobrar'}
        meta={
          <span className="flex items-center gap-2">
            {conceptName ?? '—'}
            <span className="text-border">·</span>
            <StatusBadge {...receivableStatus(status)} />
          </span>
        }
        // La cifra que se viene a consultar es el saldo, no el valor original.
        amount={formatAmount(b?.balance ?? r.originalAmount, r.currency)}
        actions={
          <>
            {canAdjust && !isClosed && (
              <Button asChild size="sm">
                <Link to={`/cartera/pagos/nuevo?payer=${r.payerContactId}`}>
                  <Banknote aria-hidden className="size-4" />
                  Registrar pago
                </Link>
              </Button>
            )}
            {/*
              Cobrar es lo que se viene a hacer; lo demás son operaciones de
              excepción. Cinco botones en fila no caben en el cajón y ponen
              «Castigar» a la misma altura visual que «Registrar pago».
            */}
            {hasMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal aria-hidden className="size-4" />
                    Más
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {canAdjust && (
                    <DropdownMenuItem onClick={() => setAdjOpen(true)}>
                      <Plus className="size-4" />
                      Añadir ajuste
                    </DropdownMenuItem>
                  )}
                  {canWaive && (
                    <DropdownMenuItem onClick={() => setWaiveOpen(true)}>
                      <HandCoins className="size-4" />
                      Condonar mora
                    </DropdownMenuItem>
                  )}
                  {canManage && (
                    <>
                      {(canAdjust || canWaive) && <DropdownMenuSeparator />}
                      <DropdownMenuItem onClick={() => setCancelOpen(true)}>
                        <XCircle className="size-4" />
                        Cancelar cuenta
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setWriteOffOpen(true)}>
                        <Ban className="size-4" />
                        Castigar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      >
        <DetailSection title="Saldo">
          <DetailRows>
            <DetailRow label="Valor original">
              {formatAmount(b?.originalAmount ?? r.originalAmount, r.currency)}
            </DetailRow>
            {b && Number(b.adjustmentsTotal) !== 0 && (
              <DetailRow label="Ajustes">{formatAmount(b.adjustmentsTotal, r.currency)}</DetailRow>
            )}
            {b && Number(b.interestTotal) !== 0 && (
              <DetailRow label="Interés de mora">
                {formatAmount(b.interestTotal, r.currency)}
              </DetailRow>
            )}
            {b && Number(b.paidTotal) !== 0 && (
              <DetailRow label="Pagado">− {formatAmount(b.paidTotal, r.currency)}</DetailRow>
            )}
            <DetailRow label="Saldo" strong>
              {formatAmount(b?.balance ?? r.originalAmount, r.currency)}
            </DetailRow>
          </DetailRows>
        </DetailSection>

        {accruals.length > 0 && (
          <DetailSection title="Causaciones de mora">
            <ul className="divide-y rounded-lg border">
              {accruals.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="nums">{formatDateHuman(a.accrualDate)}</p>
                    <p className="nums text-muted-foreground text-xs">
                      {plural(a.daysOverdue, 'día', 'días')} · base{' '}
                      {formatAmount(a.baseAmount, r.currency)} · {a.rateValue}%
                    </p>
                  </div>
                  <span className="nums font-medium">{formatAmount(a.amount, r.currency)}</span>
                </li>
              ))}
            </ul>
          </DetailSection>
        )}

        <DetailSection title="Detalle">
          <DetailRows>
            <DetailRow label="Vence">{formatDateHuman(r.dueDate)}</DetailRow>
            <DetailRow label="Emitida">{formatDateHuman(r.issueDate)}</DetailRow>
            <DetailRow label="Notas">{r.notes}</DetailRow>
            <DetailRow label="Motivo cierre">{r.cancellationReason}</DetailRow>
          </DetailRows>
        </DetailSection>

        <DetailSection title="Ajustes">
          {detail.adjustments.length === 0 ? (
            <DetailEmpty>Sin ajustes.</DetailEmpty>
          ) : (
            <ul className="divide-y rounded-lg border">
              {detail.adjustments.map((adj) => {
                const reversed = !!adj.reversedAt
                // El monto ya viene firmado desde el backend (negativo = reduce el saldo).
                const isReduction = Number(adj.amount) < 0
                const engineManaged =
                  adj.adjustmentType === 'INTEREST' || adj.adjustmentType === 'WAIVER'
                return (
                  <li key={adj.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'font-medium',
                          reversed && 'text-muted-foreground line-through',
                        )}
                      >
                        {ADJUSTMENT_TYPE_LABELS[adj.adjustmentType] ?? adj.adjustmentType}
                      </p>
                      {adj.reason && (
                        <p className="text-muted-foreground truncate text-xs">{adj.reason}</p>
                      )}
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
                      <span className="text-muted-foreground shrink-0 text-xs">reversado</span>
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
        </DetailSection>
      </DetailDrawer>

      {orgId && (
        <AddAdjustmentDialog
          orgId={orgId}
          receivableId={r.id}
          open={adjOpen}
          onOpenChange={setAdjOpen}
        />
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
    </>
  )
}
