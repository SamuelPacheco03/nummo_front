import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Undo2, Wallet } from 'lucide-react'
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
import { useContact } from '@/features/contacts/hooks'
import { usePaymentMethods } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts, canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DISBURSEMENT_PURPOSE_LABELS, DISBURSEMENT_STATUS_LABELS } from './labels'
import { ApplySupplierAdvanceDialog } from './apply-supplier-advance-dialog'
import { useDisbursement, useReverseDisbursement } from './hooks'

const LIST = '/gastos/egresos'

/** Ficha de un egreso. Abre como cajón sobre la lista (ruta hija de /gastos/egresos). */
export function DisbursementDetailPage() {
  const { disbursementId } = useParams()
  const { orgId, role } = useCurrentOrg()
  const canReverse = canManageAgreements(role)
  const canApply = canEditContacts(role)

  const { detail, isPending, isError, error } = useDisbursement(orgId, disbursementId)
  const reverse = useReverseDisbursement(orgId ?? '')
  const [reverseOpen, setReverseOpen] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  const d = detail?.disbursement
  const { contact: supplier } = useContact(orgId, d?.supplierContactId ?? undefined)
  const { items: methods } = usePaymentMethods(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'name',
    order: 'asc',
  })
  const methodName = useMemo(() => methods.find((m) => m.id === d?.paymentMethodId)?.name, [methods, d])

  if (isPending) return <DetailDrawer closeTo={LIST} loading />
  if (isError || !detail || !d) {
    return (
      <DetailDrawer
        closeTo={LIST}
        title="Egreso"
        error={getErrorMessage(error, 'No se encontró el egreso.')}
      />
    )
  }

  const reversed = d.status === 'REVERSED'
  const unassigned = Number(detail.unallocated.unallocatedAmount) || 0

  const onReverse = async () => {
    try {
      await reverse.mutateAsync({ orgId: orgId ?? '', id: d.id })
      toast.success('Egreso reversado')
      setReverseOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo reversar'))
    }
  }

  return (
    <>
      <DetailDrawer
        closeTo={LIST}
        title={supplier?.displayName ?? 'Egreso directo'}
        meta={
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                'size-1.5 rounded-full',
                reversed ? 'bg-muted-foreground/40' : 'bg-success',
              )}
            />
            {DISBURSEMENT_STATUS_LABELS[d.status] ?? d.status} ·{' '}
            {DISBURSEMENT_PURPOSE_LABELS[d.purpose] ?? d.purpose}
          </span>
        }
        amount={
          <span className={cn(reversed && 'text-muted-foreground line-through')}>
            {formatAmount(d.amount)}
          </span>
        }
        actions={
          <>
            {canApply && !reversed && unassigned > 0 && d.supplierContactId && (
              <Button size="sm" onClick={() => setApplyOpen(true)}>
                <Wallet className="size-4" />
                Aplicar anticipo
              </Button>
            )}
            {canReverse && !reversed && (
              <Button variant="outline" size="sm" onClick={() => setReverseOpen(true)}>
                <Undo2 className="size-4" />
                Revertir
              </Button>
            )}
          </>
        }
      >
        {unassigned > 0 && !reversed && (
          <div className="border-warning/40 bg-warning/5 rounded-lg border px-3.5 py-2.5 text-sm">
            Crédito sin asignar:{' '}
            <span className="nums font-semibold">
              {formatAmount(detail.unallocated.unallocatedAmount)}
            </span>
          </div>
        )}

        <DetailSection title="Resumen">
          <DetailRows>
            <DetailRow label="Fecha">{formatDateHuman(d.disbursedAt)}</DetailRow>
            <DetailRow label="Método">{methodName ?? '—'}</DetailRow>
            <DetailRow label="Referencia">{d.reference}</DetailRow>
            <DetailRow label="Notas">{d.notes}</DetailRow>
          </DetailRows>
        </DetailSection>

        <DetailSection title={`Aplicado a gastos (${detail.allocations.length})`}>
          {detail.allocations.length === 0 ? (
            <DetailEmpty>Sin asignaciones.</DetailEmpty>
          ) : (
            <DetailRows>
              {detail.allocations.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                  <Link to={`/gastos/cxp/${a.expenseId}`} className="text-brand hover:underline">
                    Ver gasto
                  </Link>
                  <span className="nums text-muted-foreground text-xs">
                    {formatDateHuman(a.allocatedAt)}
                  </span>
                  <span className="nums ml-auto font-medium">{formatAmount(a.amount)}</span>
                </div>
              ))}
            </DetailRows>
          )}
        </DetailSection>
      </DetailDrawer>

      {orgId && (
        <ApplySupplierAdvanceDialog
          orgId={orgId}
          disbursementId={d.id}
          supplierId={d.supplierContactId}
          available={detail.unallocated.unallocatedAmount}
          open={applyOpen}
          onOpenChange={setApplyOpen}
        />
      )}
      <ConfirmDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title="Revertir egreso"
        description="Se genera un movimiento de reversión y el saldo se recalcula. No borra historia."
        confirmLabel="Revertir"
        destructive
        loading={reverse.isPending}
        onConfirm={onReverse}
      />
    </>
  )
}
