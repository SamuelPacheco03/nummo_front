import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowLeftRight, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { DataList } from '@/components/ui/data-list'
import { listColumns } from '@/components/ui/list-columns'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageAgreements } from '@/features/organizations/roles'
import { formatAmount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TransferDialog } from './transfer-dialog'
import { useAccountBalances } from './hooks'

export function AccountsPage() {
  const { orgId, role } = useCurrentOrg()
  const canTransfer = canManageAgreements(role)
  const { balances, isPending, isError, error } = useAccountBalances(orgId)
  const [transferOpen, setTransferOpen] = useState(false)

  // `?transferir=1` abre la transferencia: es la acción rápida de móvil. Se
  // consume al abrir para que recargar o volver atrás no la reabra.
  const [params, setParams] = useSearchParams()
  const wantsTransfer = params.get('transferir') === '1'
  useEffect(() => {
    if (!wantsTransfer) return
    setTransferOpen(true)
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('transferir')
        return next
      },
      { replace: true },
    )
  }, [wantsTransfer, setParams])

  // La fábrica no depende de nada del componente, pero el tipo sí sale de aquí,
  // así que no puede subir a nivel de módulo: se memoriza en su sitio.
  const column = useMemo(() => listColumns<(typeof balances)[number]>(), [])
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'name',
          header: 'Cuenta',
          cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        }),
        column.display({
          id: 'opening',
          header: 'Apertura',
          meta: { align: 'right' },
          cell: ({ row }) => (
            <span className="text-muted-foreground">
              {formatAmount(row.original.openingBalance, row.original.currency)}
            </span>
          ),
        }),
        column.display({
          id: 'in',
          header: 'Entradas',
          meta: { align: 'right' },
          cell: ({ row }) => (
            <span className="text-success-strong">
              {formatAmount(row.original.totalIn, row.original.currency)}
            </span>
          ),
        }),
        column.display({
          id: 'out',
          header: 'Salidas',
          meta: { align: 'right' },
          cell: ({ row }) => (
            <span className="text-muted-foreground">
              {formatAmount(row.original.totalOut, row.original.currency)}
            </span>
          ),
        }),
        column.display({
          id: 'balance',
          header: 'Saldo',
          meta: { align: 'right' },
          cell: ({ row }) => (
            <span className={cn('font-semibold', Number(row.original.balance) < 0 && 'text-destructive')}>
              {formatAmount(row.original.balance, row.original.currency)}
            </span>
          ),
        }),
      ]),
    [column],
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
        <ErrorState error={error} fallback="No se pudieron cargar los saldos." />
      ) : (
        <DataList
          columns={columns}
          rows={balances}
          getRowId={(b) => b.accountId}
          isLoading={isPending}
          skeletonRows={4}
          emptyText={
            <EmptyState
              Icon={Wallet}
              title="Todavía no tienes cuentas"
              description="Las cuentas son donde vive tu dinero: caja, bancos, billeteras. Cada pago y cada egreso mueve el saldo de una."
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link to="/maestros/cuentas">Crear cuentas</Link>
                </Button>
              }
            />
          }
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
