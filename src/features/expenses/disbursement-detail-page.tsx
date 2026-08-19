import { useState } from 'react'
import { useParams } from 'react-router'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DetailRow, DetailRows, DetailSection } from '@/components/ui/detail-drawer'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { Textarea } from '@/components/ui/textarea'
import { toastApiError } from '@/features/platform/errors'
import { formatDateHuman } from '@/lib/format'
import {
  SettlementDetail,
  type SettlementDetailCopy,
  type SettlementDetailQuery,
} from '@/components/settlement-detail'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { DISBURSEMENT_PURPOSE_LABELS, disbursementStatus } from './labels'
import { ApplySupplierAdvanceDialog } from './apply-supplier-advance-dialog'
import {
  useApproveDisbursement,
  useDisbursement,
  useRejectDisbursement,
  useReverseDisbursement,
} from './hooks'

const LIST = '/gastos/egresos'

const COPY: SettlementDetailCopy = {
  entity: 'Egreso',
  notFound: 'No se encontró el egreso.',
  direct: 'Egreso directo',
  dateLabel: 'Fecha',
  allocationsTitle: 'Aplicado a gastos',
  allocationLink: 'Ver gasto',
  reverseTitle: 'Revertir egreso',
  reverseDescription:
    'Se genera un movimiento de reversión y el saldo se recalcula. No borra historia.',
  reversed: 'Egreso reversado',
}

/**
 * Ficha de un egreso. Abre como cajón sobre la lista (ruta hija de /gastos/egresos).
 *
 * Es el espejo de la ficha de pagos: la pantalla es la misma y vive en
 * `SettlementDetail` (§94.0). Esto solo traduce de dónde sale el egreso, cómo se
 * reversa y a dónde llevan sus aplicaciones.
 */
export function DisbursementDetailPage() {
  const { disbursementId } = useParams()
  const { orgId } = useCurrentOrg()
  const can = useCan()

  const { detail, isPending, isError, error } = useDisbursement(orgId, disbursementId)
  const d = detail?.disbursement

  const approve = useApproveDisbursement(orgId ?? '')
  const reject = useRejectDisbursement(orgId ?? '')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  const pending = d?.status === 'PENDING_APPROVAL'
  // El permiso es condición **necesaria, no suficiente**: el backend comprueba
  // además que quien aprueba no sea quien registró, y el contrato no publica el
  // autor, así que eso solo se sabe al intentarlo.
  const canDecide = can('disbursements.approve')

  const onApprove = async () => {
    try {
      await approve.mutateAsync({ orgId: orgId ?? '', id: disbursementId ?? '' })
      toast.success('Egreso aprobado')
    } catch (err) {
      toastApiError(err, 'No se pudo aprobar el egreso')
    }
  }

  const onReject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reason.trim()) {
      toast.error('El rechazo necesita un motivo.')
      return
    }
    try {
      await reject.mutateAsync({
        orgId: orgId ?? '',
        id: disbursementId ?? '',
        data: { reason: reason.trim() },
      })
      toast.success('Egreso rechazado')
      setReason('')
      setRejectOpen(false)
    } catch (err) {
      toastApiError(err, 'No se pudo rechazar el egreso')
    }
  }

  const query: SettlementDetailQuery = {
    data:
      detail && d
        ? {
            id: d.id,
            contactId: d.supplierContactId,
            purposeLabel: DISBURSEMENT_PURPOSE_LABELS[d.purpose] ?? d.purpose,
            status: d.status,
            amount: d.amount,
            date: d.disbursedAt,
            paymentMethodId: d.paymentMethodId,
            reference: d.reference,
            notes: d.notes,
            unallocatedAmount: detail.unallocated.unallocatedAmount,
            allocations: detail.allocations.map((a) => ({
              id: a.id,
              targetId: a.expenseId,
              allocatedAt: a.allocatedAt,
              amount: a.amount,
            })),
          }
        : undefined,
    isPending,
    isError,
    error,
  }

  const useReverse = (idempotencyKey: string) => {
    const reverse = useReverseDisbursement(orgId ?? '', idempotencyKey)
    return {
      isPending: reverse.isPending,
      reverse: () => reverse.mutateAsync({ orgId: orgId ?? '', id: disbursementId ?? '' }),
    }
  }

  return (
    <>
    <SettlementDetail
      listTo={LIST}
      targetTo={(expenseId) => `/gastos/cxp/${expenseId}`}
      copy={COPY}
      statusOf={disbursementStatus}
      canReverse={can('disbursements.reverse')}
      canApply={can('disbursements.allocate')}
      actions={
        pending &&
        canDecide && (
          <>
            <Button size="sm" onClick={() => void onApprove()} disabled={approve.isPending}>
              <Check aria-hidden className="size-4" />
              Aprobar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRejectOpen(true)}>
              <X aria-hidden className="size-4" />
              Rechazar
            </Button>
          </>
        )
      }
      afterDetail={
        d?.decidedAt ? (
          <DetailSection title="La decisión">
            <DetailRows>
              <DetailRow label="Cuándo">{formatDateHuman(d.decidedAt)}</DetailRow>
              <DetailRow label="Motivo">{d.decisionReason}</DetailRow>
            </DetailRows>
          </DetailSection>
        ) : pending ? (
          <p className="text-muted-foreground text-sm">
            Espera aprobación: no ha salido dinero todavía. Lo aprueba alguien distinto de quien lo
            registró.
          </p>
        ) : null
      }
      query={query}
      useReverse={useReverse}
      applyDialog={(open, onOpenChange, disbursement) =>
        orgId && (
          <ApplySupplierAdvanceDialog
            orgId={orgId}
            disbursementId={disbursement.id}
            supplierId={disbursement.contactId}
            available={disbursement.unallocatedAmount}
            open={open}
            onOpenChange={onOpenChange}
          />
        )
      }
    />

      {/*
        El rechazo pide motivo y lo guarda con quién decidió: no se borra nada.
        Va en diálogo centrado y no en cajón porque es un campo, y el cajón que
        hay detrás es la ficha que se está decidiendo (§11.1.3).
      */}
      <FormDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Rechazar el egreso"
        description="No sale dinero y queda registrado por qué. Lo que se pidió se conserva."
        submitLabel="Rechazar"
        loading={reject.isPending}
        onSubmit={(event) => void onReject(event)}
      >
        <Field label="Motivo" htmlFor="reject-reason" required>
          <Textarea
            id="reject-reason"
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </FormDialog>
    </>
  )
}
