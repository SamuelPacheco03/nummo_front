import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TransferDialog } from './transfer-dialog'
import { useAccountBalances } from './hooks'

export function AccountsPage() {
  const { orgId, role } = useCurrentOrg()
  const canTransfer = canManageAgreements(role)
  const { balances, isPending, isError, error } = useAccountBalances(orgId)
  const [transferOpen, setTransferOpen] = useState(false)

  type Row = (typeof balances)[number]
  const columns: Column<Row>[] = [
    { header: 'Cuenta', cell: (b) => b.name, className: 'font-medium' },
    {
      header: 'Apertura',
      cell: (b) => formatAmount(b.openingBalance, b.currency),
      className: 'nums text-right text-muted-foreground',
      headClassName: 'text-right',
    },
    {
      header: 'Entradas',
      cell: (b) => formatAmount(b.totalIn, b.currency),
      className: 'nums text-right text-success',
      headClassName: 'text-right',
    },
    {
      header: 'Salidas',
      cell: (b) => formatAmount(b.totalOut, b.currency),
      className: 'nums text-right text-muted-foreground',
      headClassName: 'text-right',
    },
    {
      header: 'Saldo',
      cell: (b) => (
        <span className={cn(Number(b.balance) < 0 && 'text-destructive')}>{formatAmount(b.balance, b.currency)}</span>
      ),
      className: 'nums text-right font-semibold',
      headClassName: 'text-right',
    },
  ]
  const renderCard = (b: Row) => (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-medium">{b.name}</span>
        <span className={cn('nums shrink-0 font-semibold', Number(b.balance) < 0 && 'text-destructive')}>
          {formatAmount(b.balance, b.currency)}
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Apertura</dt>
          <dd className="nums">{formatAmount(b.openingBalance, b.currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Entradas</dt>
          <dd className="nums text-success">{formatAmount(b.totalIn, b.currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Salidas</dt>
          <dd className="nums">{formatAmount(b.totalOut, b.currency)}</dd>
        </div>
      </dl>
    </div>
  )

  return (
    <div>
      <PageHeader title="Caja" description="Saldos por cuenta, calculados desde los movimientos.">
        {canTransfer && balances.length >= 2 && (
          <Button size="sm" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight className="size-4" />
            Transferir
          </Button>
        )}
      </PageHeader>

      {isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(error, 'No se pudieron cargar los saldos.')}
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={balances}
          getKey={(b) => b.accountId}
          isLoading={isPending}
          skeletonRows={4}
          emptyText="No hay cuentas. Créalas en Maestros → Cuentas."
          renderCard={renderCard}
        />
      )}

      {orgId && (
        <TransferDialog
          orgId={orgId}
          accounts={balances.map((b) => ({ id: b.accountId, name: b.name }))}
          open={transferOpen}
          onOpenChange={setTransferOpen}
        />
      )}
    </div>
  )
}
