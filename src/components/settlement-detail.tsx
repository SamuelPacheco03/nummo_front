import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
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
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { useContact } from '@/features/contacts/hooks'
import { usePaymentMethods } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts, canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { useIdempotencyKey } from '@/lib/idempotency'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Una aplicación del movimiento a una cuenta. */
export interface SettlementAllocation {
  id: string
  /** La cuenta o el gasto al que fue a parar. */
  targetId: string
  allocatedAt: string
  amount: string
}

/** El movimiento, ya traducido desde su endpoint. */
export interface SettlementDetailData {
  id: string
  contactId: string | null
  /** Propósito ya en palabras: «Anticipo», «Abono a cuenta»… */
  purposeLabel: string
  status: string
  amount: string
  /** Cuándo se recibió o se pagó. */
  date: string
  paymentMethodId?: string | null
  reference?: string | null
  notes?: string | null
  /** Crédito que todavía no se ha repartido. */
  unallocatedAmount: string
  allocations: SettlementAllocation[]
}

/** Lo que cambia entre cobrar y pagar: las palabras. */
export interface SettlementDetailCopy {
  /** Título cuando no se pudo cargar: «Pago» / «Egreso». */
  entity: string
  notFound: string
  /** Título cuando el movimiento no tiene contraparte. */
  direct: string
  /** Rótulo de la fecha: «Recibido» / «Fecha». */
  dateLabel: string
  /** Sección de aplicaciones, sin el contador: «Aplicado a cuentas». */
  allocationsTitle: string
  /** Enlace de cada aplicación: «Ver cuenta» / «Ver gasto». */
  allocationLink: string
  reverseTitle: string
  reverseDescription: string
  /** Aviso al reversar: «Pago reversado». */
  reversed: string
}

/** La reversión contra el API, ya atada a su movimiento por el adaptador. */
export interface SettlementReverse {
  isPending: boolean
  reverse: () => Promise<unknown>
}

/** Lo que devuelve el hook de carga del movimiento. */
export interface SettlementDetailQuery {
  data: SettlementDetailData | undefined
  isPending: boolean
  isError: boolean
  error: unknown
}

/**
 * **La ficha de un movimiento de dinero**, pago o egreso.
 *
 * Es la misma para las dos caras —quién, cuánto, cómo, a qué cuentas fue a
 * parar y cómo se deshace— y por eso es **una**: eran dos archivos calcados
 * línea por línea que solo se diferenciaban en una docena de palabras y a dónde
 * apunta cada enlace (§«nada por duplicado»).
 *
 * Abre como cajón sobre su lista, que sigue montada detrás: es una ruta **hija**
 * de la lista y `listTo` es a donde vuelve al cerrarse, así que la URL se puede
 * compartir y recargar sin perder filtros ni scroll (§87.5).
 *
 * Reversar manda con **clave de idempotencia** y la renueva al terminar (§88.4b).
 */
export function SettlementDetail({
  listTo,
  targetTo,
  copy,
  statusOf,
  query,
  useReverse,
  applyDialog,
}: {
  /** Ruta de la lista: a donde se vuelve al cerrar el cajón. */
  listTo: string
  /** A dónde lleva cada aplicación. */
  targetTo: (targetId: string) => string
  copy: SettlementDetailCopy
  statusOf: (status: string) => { tone: StatusTone; label: string }
  /** El movimiento ya cargado y traducido. */
  query: SettlementDetailQuery
  /**
   * La reversión. Es un hook —se llama en el render— porque necesita la clave de
   * idempotencia que nace aquí dentro.
   */
  useReverse: (idempotencyKey: string) => SettlementReverse
  /** El diálogo de repartir el anticipo, que es distinto en cada cara. */
  applyDialog: (
    open: boolean,
    onOpenChange: (open: boolean) => void,
    settlement: SettlementDetailData,
  ) => ReactNode
}) {
  const { orgId, role } = useCurrentOrg()
  const canReverse = canManageAgreements(role)
  const canApply = canEditContacts(role)

  const { data, isPending, isError, error } = query
  const idem = useIdempotencyKey()
  const reverse = useReverse(idem.key)
  const [reverseOpen, setReverseOpen] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  const { contact } = useContact(orgId, data?.contactId ?? undefined)
  const { items: methods } = usePaymentMethods(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'name',
    order: 'asc',
  })
  const methodName = useMemo(
    () => methods.find((x) => x.id === data?.paymentMethodId)?.name,
    [methods, data],
  )

  if (isPending) return <DetailDrawer closeTo={listTo} loading />
  if (isError || !data) {
    return (
      <DetailDrawer
        closeTo={listTo}
        title={copy.entity}
        error={getErrorMessage(error, copy.notFound)}
      />
    )
  }

  const reversed = data.status === 'REVERSED'
  const unassigned = Number(data.unallocatedAmount) || 0

  const onReverse = async () => {
    try {
      await reverse.reverse()
      toast.success(copy.reversed)
      idem.renew()
      setReverseOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo reversar'))
    }
  }

  return (
    <>
      <DetailDrawer
        closeTo={listTo}
        title={contact?.displayName ?? copy.direct}
        meta={
          <span className="flex items-center gap-2">
            {data.purposeLabel}
            <span className="text-border">·</span>
            <StatusBadge {...statusOf(data.status)} />
          </span>
        }
        amount={
          <span className={cn(reversed && 'text-muted-foreground line-through')}>
            {formatAmount(data.amount)}
          </span>
        }
        actions={
          <>
            {canApply && !reversed && unassigned > 0 && data.contactId && (
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
            <span className="nums font-semibold">{formatAmount(data.unallocatedAmount)}</span>
          </div>
        )}

        <DetailSection title="Resumen">
          <DetailRows>
            <DetailRow label={copy.dateLabel}>{formatDateHuman(data.date)}</DetailRow>
            <DetailRow label="Método">{methodName ?? '—'}</DetailRow>
            <DetailRow label="Referencia">{data.reference}</DetailRow>
            <DetailRow label="Notas">{data.notes}</DetailRow>
          </DetailRows>
        </DetailSection>

        <DetailSection title={`${copy.allocationsTitle} (${data.allocations.length})`}>
          {data.allocations.length === 0 ? (
            <DetailEmpty>Sin asignaciones.</DetailEmpty>
          ) : (
            <DetailRows>
              {data.allocations.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                  <Link to={targetTo(a.targetId)} className="text-brand hover:underline">
                    {copy.allocationLink}
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

      {applyDialog(applyOpen, setApplyOpen, data)}
      <ConfirmDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        title={copy.reverseTitle}
        description={copy.reverseDescription}
        confirmLabel="Revertir"
        destructive
        loading={reverse.isPending}
        onConfirm={() => void onReverse()}
      />
    </>
  )
}
