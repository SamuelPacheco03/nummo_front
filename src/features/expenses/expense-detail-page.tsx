import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Ban, Coins, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useContact } from '@/features/contacts/hooks'
import { useExpenseCategories } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts, canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { ExpenseStatusPill } from './expenses-list-page'
import { useCancelExpense, useExpense, useWriteOffExpense } from './hooks'

function Row({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  if (children == null || children === '') return null
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('nums text-right', strong && 'font-semibold')}>{children}</span>
    </div>
  )
}

const CLOSED = new Set(['CANCELLED', 'WRITTEN_OFF'])

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
  const { items: categories } = useExpenseCategories(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const categoryName = useMemo(
    () => categories.find((c) => c.id === e?.expenseCategoryId)?.name,
    [categories, e],
  )

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }
  if (isError || !detail || !e) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/gastos/cxp">
            <ArrowLeft className="size-4" />
            Cuentas por pagar
          </Link>
        </Button>
        <p className="text-sm text-destructive">{getErrorMessage(error, 'No se encontró el gasto.')}</p>
      </div>
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
    <div className="max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/gastos/cxp">
            <ArrowLeft className="size-4" />
            Cuentas por pagar
          </Link>
        </Button>
        <PageHeader
          title={supplier?.displayName ?? 'Gasto'}
          description={
            <span className="flex items-center gap-2">
              {categoryName ?? '—'}
              <span className="text-border">·</span>
              <ExpenseStatusPill status={status} />
            </span>
          }
        >
          {canPay && !isClosed && (
            <Button asChild size="sm">
              <Link to={`/gastos/egresos/nuevo?supplier=${e.supplierContactId}`}>
                <Coins className="size-4" />
                Registrar egreso
              </Link>
            </Button>
          )}
          {canManage && !isClosed && (
            <>
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

      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Saldo</h2>
        <Card className="gap-0 py-0">
          <div className="divide-y">
            <Row label="Valor original">{formatAmount(b?.originalAmount ?? e.originalAmount, e.currency)}</Row>
            {b && Number(b.paidTotal) !== 0 && <Row label="Pagado">− {formatAmount(b.paidTotal, e.currency)}</Row>}
            <Row label="Saldo" strong>{formatAmount(b?.balance ?? e.originalAmount, e.currency)}</Row>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Detalle</h2>
        <Card className="gap-0 py-0">
          <div className="divide-y">
            <Row label="Vence">{formatDateHuman(e.dueDate)}</Row>
            <Row label="Emitido">{e.issueDate}</Row>
            {e.notes && <Row label="Notas">{e.notes}</Row>}
            {e.cancellationReason && <Row label="Motivo cierre">{e.cancellationReason}</Row>}
          </div>
        </Card>
      </section>

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
    </div>
  )
}
