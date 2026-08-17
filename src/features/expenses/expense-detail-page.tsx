import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Ban, Coins, MoreHorizontal, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DetailDrawer, DetailRow, DetailRows, DetailSection } from '@/components/ui/detail-drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { useContact } from '@/features/contacts/hooks'
import { useExpenseCategories } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts, canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { expenseStatus } from './labels'
import { useCancelExpense, useExpense, useWriteOffExpense } from './hooks'

const LIST = '/gastos/cxp'
const CLOSED = new Set(['CANCELLED', 'WRITTEN_OFF'])

/** Ficha de una cuenta por pagar. Abre como cajón sobre la lista. */
export function ExpenseDetailPage() {
  const { expenseId } = useParams()
  const { orgId, role } = useCurrentOrg()
  const canPay = canEditContacts(role)
  const canManage = canManageAgreements(role)

  const { detail, isPending, isError, error } = useExpense(orgId, expenseId)
  const cancel = useCancelExpense(orgId ?? '')
  const writeOff = useWriteOffExpense(orgId ?? '')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [writeOffOpen, setWriteOffOpen] = useState(false)

  const e = detail?.expense
  const { contact: supplier } = useContact(orgId, e?.supplierContactId)
  const { items: categories } = useExpenseCategories(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'name',
    order: 'asc',
  })
  const categoryName = useMemo(
    () => categories.find((c) => c.id === e?.expenseCategoryId)?.name,
    [categories, e],
  )

  if (isPending) return <DetailDrawer closeTo={LIST} loading />
  if (isError || !detail || !e) {
    return (
      <DetailDrawer
        closeTo={LIST}
        title="Cuenta por pagar"
        error={getErrorMessage(error, 'No se encontró el gasto.')}
      />
    )
  }

  const b = detail.balance
  const status = b?.displayStatus ?? e.state
  const isClosed = CLOSED.has(status)

  const runClose = async (action: typeof cancel | typeof writeOff, okMsg: string, close: () => void) => {
    try {
      await action.mutateAsync({ orgId: orgId ?? '', id: e.id, data: {} })
      toast.success(okMsg)
      close()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <>
      <DetailDrawer
        closeTo={LIST}
        title={supplier?.displayName ?? 'Gasto'}
        meta={
          <span className="flex items-center gap-2">
            {categoryName ?? '—'}
            <span className="text-border">·</span>
            <StatusBadge {...expenseStatus(status)} />
          </span>
        }
        // La cifra que se viene a consultar es el saldo, no el valor original.
        amount={formatAmount(b?.balance ?? e.originalAmount, e.currency)}
        actions={
          <>
            {canPay && !isClosed && (
              <Button asChild size="sm">
                <Link to={`/gastos/egresos/nuevo?supplier=${e.supplierContactId}`}>
                  <Coins aria-hidden className="size-4" />
                  Registrar egreso
                </Link>
              </Button>
            )}
            {/*
              Pagar es lo que se viene a hacer; cerrar la cuenta es la excepción
              y no debe quedar a la misma altura visual (igual que en su espejo).
            */}
            {canManage && !isClosed && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal aria-hidden className="size-4" />
                    Más
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setCancelOpen(true)}>
                    <XCircle className="size-4" />
                    Cancelar gasto
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setWriteOffOpen(true)}>
                    <Ban className="size-4" />
                    Castigar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      >
        <DetailSection title="Saldo">
          <DetailRows>
            <DetailRow label="Valor original">
              {formatAmount(b?.originalAmount ?? e.originalAmount, e.currency)}
            </DetailRow>
            {b && Number(b.paidTotal) !== 0 && (
              <DetailRow label="Pagado">− {formatAmount(b.paidTotal, e.currency)}</DetailRow>
            )}
            <DetailRow label="Saldo" strong>
              {formatAmount(b?.balance ?? e.originalAmount, e.currency)}
            </DetailRow>
          </DetailRows>
        </DetailSection>

        <DetailSection title="Detalle">
          <DetailRows>
            <DetailRow label="Vence">{formatDateHuman(e.dueDate)}</DetailRow>
            <DetailRow label="Emitido">{formatDateHuman(e.issueDate)}</DetailRow>
            <DetailRow label="Notas">{e.notes}</DetailRow>
            <DetailRow label="Motivo cierre">{e.cancellationReason}</DetailRow>
          </DetailRows>
        </DetailSection>
      </DetailDrawer>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar gasto"
        description="El gasto dejará de estar activo. No se puede deshacer."
        confirmLabel="Cancelar gasto"
        destructive
        loading={cancel.isPending}
        onConfirm={() => runClose(cancel, 'Gasto cancelado', () => setCancelOpen(false))}
      />
      <ConfirmDialog
        open={writeOffOpen}
        onOpenChange={setWriteOffOpen}
        title="Castigar gasto"
        description="Se marca como no pagadero (write-off). No se puede deshacer."
        confirmLabel="Castigar"
        destructive
        loading={writeOff.isPending}
        onConfirm={() => runClose(writeOff, 'Gasto castigado', () => setWriteOffOpen(false))}
      />
    </>
  )
}
