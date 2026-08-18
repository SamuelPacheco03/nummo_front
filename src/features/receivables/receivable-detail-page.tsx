import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { Banknote, HandCoins, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AccountDetail,
  type AccountDetailCopy,
  type AccountDetailQuery,
} from '@/components/account-detail'
import { Button } from '@/components/ui/button'
import { DetailEmpty, DetailSection } from '@/components/ui/detail-drawer'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
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

const COPY: AccountDetailCopy = {
  entity: 'Cuenta por cobrar',
  notFound: 'No se encontró la cuenta.',
  fallbackTitle: 'Cuenta por cobrar',
  settleLabel: 'Registrar pago',
  issueLabel: 'Emitida',
  cancelItem: 'Cancelar cuenta',
  cancelTitle: 'Cancelar cuenta por cobrar',
  cancelDescription: 'La cuenta dejará de estar activa. No se puede deshacer.',
  canceled: 'Cuenta cancelada',
  writeOffTitle: 'Castigar cuenta por cobrar',
  writeOffDescription: 'Se marca como incobrable (write-off). No se puede deshacer.',
  writtenOff: 'Cuenta castigada',
}

/**
 * Ficha de una cuenta por cobrar. Abre como cajón sobre la lista, igual que su
 * espejo en cuentas por pagar (§94.0).
 *
 * El esqueleto —encabezado, desglose del saldo, detalle, saldar y cerrar— vive
 * en `AccountDetail`. Lo que se añade aquí es lo que **solo tiene esta cara**:
 * las causaciones de mora, los ajustes y las dos operaciones que los mueven. A
 * un proveedor no se le cobran intereses, así que no tienen espejo.
 */
export function ReceivableDetailPage() {
  const { receivableId } = useParams()
  const { orgId, role } = useCurrentOrg()
  const canAdjust = canEditContacts(role)
  const canManage = canManageAgreements(role)

  const { detail, isPending, isError, error } = useReceivable(orgId, receivableId)
  const { accruals } = useAccruals(orgId, receivableId)
  const reverseAdj = useReverseAdjustment(orgId ?? '')
  const [adjOpen, setAdjOpen] = useState(false)
  const [waiveOpen, setWaiveOpen] = useState(false)
  const [reversingId, setReversingId] = useState<string | null>(null)

  const r = detail?.receivable
  const b = detail?.balance
  const canWaive = canManage && Number(b?.interestTotal) > 0

  const { items: concepts } = useBillingConcepts(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'name',
    order: 'asc',
  })
  const catalogName = useMemo(
    () => concepts.find((c) => c.id === r?.billingConceptId)?.name,
    [concepts, r],
  )

  const query: AccountDetailQuery = {
    data:
      detail && r
        ? {
            id: r.id,
            contactId: r.payerContactId,
            catalogName,
            status: b?.displayStatus ?? r.state,
            currency: r.currency,
            originalAmount: b?.originalAmount ?? r.originalAmount,
            adjustmentsTotal: b?.adjustmentsTotal,
            interestTotal: b?.interestTotal,
            paidTotal: b?.paidTotal,
            balance: b?.balance ?? r.originalAmount,
            dueDate: r.dueDate,
            issueDate: r.issueDate,
            notes: r.notes,
            cancellationReason: r.cancellationReason,
          }
        : undefined,
    isPending,
    isError,
    error,
  }

  const cancel = useCancelReceivable(orgId ?? '')
  const writeOff = useWriteOffReceivable(orgId ?? '')
  const closeArgs = { orgId: orgId ?? '', id: receivableId ?? '', data: {} }
  const close = {
    cancel: { isPending: cancel.isPending, run: () => cancel.mutateAsync(closeArgs) },
    writeOff: { isPending: writeOff.isPending, run: () => writeOff.mutateAsync(closeArgs) },
  }

  const onReverseAdjustment = async (adjustmentId: string) => {
    setReversingId(adjustmentId)
    try {
      await reverseAdj.mutateAsync({ orgId: orgId ?? '', id: receivableId ?? '', adjustmentId })
      toast.success('Ajuste reversado')
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo reversar'))
    } finally {
      setReversingId(null)
    }
  }

  return (
    <AccountDetail
      listTo={LIST}
      copy={COPY}
      statusOf={receivableStatus}
      settleTo={(payerId) => `/cartera/pagos/nuevo?payer=${payerId}`}
      settleIcon={Banknote}
      query={query}
      close={close}
      menuItems={
        canAdjust || canWaive ? (
          <>
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
          </>
        ) : undefined
      }
      afterBalance={
        accruals.length > 0 && (
          <DetailSection title="Causaciones de mora">
            <ul className="divide-y rounded-lg border">
              {accruals.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="nums">{formatDateHuman(a.accrualDate)}</p>
                    <p className="nums text-muted-foreground text-xs">
                      {plural(a.daysOverdue, 'día', 'días')} · base{' '}
                      {formatAmount(a.baseAmount, r?.currency)} · {a.rateValue}%
                    </p>
                  </div>
                  <span className="nums font-medium">{formatAmount(a.amount, r?.currency)}</span>
                </li>
              ))}
            </ul>
          </DetailSection>
        )
      }
      afterDetail={
        detail && (
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
                            onClick={() => void onReverseAdjustment(adj.id)}
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
        )
      }
      dialogs={
        <>
          {orgId && r && (
            <AddAdjustmentDialog
              orgId={orgId}
              receivableId={r.id}
              open={adjOpen}
              onOpenChange={setAdjOpen}
            />
          )}
          {orgId && r && b && (
            <WaiveInterestDialog
              orgId={orgId}
              receivableId={r.id}
              interestTotal={b.interestTotal}
              currency={r.currency}
              open={waiveOpen}
              onOpenChange={setWaiveOpen}
            />
          )}
        </>
      }
    />
  )
}
