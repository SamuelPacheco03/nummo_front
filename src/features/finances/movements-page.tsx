import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { NativeSelect } from '@/components/ui/native-select'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  GetApiV1OrganizationsOrgIdFinancialMovementsMovementType,
  GetApiV1OrganizationsOrgIdFinancialMovementsParams,
} from '@/api/generated/model'
import { MOVEMENT_TYPES, MOVEMENT_TYPE_LABELS } from './labels'
import { useAccountBalances, useMovements } from './hooks'

type DirFilter = '' | 'IN' | 'OUT'
const PAGE_SIZE = 20

export function MovementsPage() {
  const { orgId } = useCurrentOrg()
  const { balances } = useAccountBalances(orgId)
  const accountName = useMemo(() => new Map(balances.map((b) => [b.accountId, b.name])), [balances])

  const [accountId, setAccountId] = useState('')
  const [direction, setDirection] = useState<DirFilter>('')
  const [movementType, setMovementType] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [accountId, direction, movementType])

  const params: GetApiV1OrganizationsOrgIdFinancialMovementsParams = {
    page,
    pageSize: PAGE_SIZE,
    financialAccountId: accountId || undefined,
    direction: direction || undefined,
    movementType: (movementType || undefined) as
      | GetApiV1OrganizationsOrgIdFinancialMovementsMovementType
      | undefined,
    order: 'desc',
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = useMovements(orgId, params)

  type Row = (typeof items)[number]
  const amountCell = (m: Row) => (
    <span className={m.direction === 'IN' ? 'text-success' : 'text-destructive'}>
      {m.direction === 'IN' ? '+' : '−'} {formatAmount(m.amount)}
    </span>
  )
  const columns: Column<Row>[] = [
    { header: 'Fecha', cell: (m) => formatDateHuman(m.occurredAt), className: 'nums text-muted-foreground' },
    { header: 'Cuenta', cell: (m) => accountName.get(m.financialAccountId) ?? '—' },
    { header: 'Tipo', cell: (m) => MOVEMENT_TYPE_LABELS[m.movementType] ?? m.movementType, className: 'text-muted-foreground' },
    { header: 'Monto', cell: amountCell, className: 'nums text-right font-medium', headClassName: 'text-right' },
  ]
  const renderCard = (m: Row) => (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-medium">{accountName.get(m.financialAccountId) ?? '—'}</span>
        <span className={cn('nums shrink-0 font-medium', m.direction === 'IN' ? 'text-success' : 'text-destructive')}>
          {m.direction === 'IN' ? '+' : '−'} {formatAmount(m.amount)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="nums">{formatDateHuman(m.occurredAt)}</span>
        <span aria-hidden>·</span>
        <span>{MOVEMENT_TYPE_LABELS[m.movementType] ?? m.movementType}</span>
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader title="Movimientos" description="Libro de todos los movimientos de caja." />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <NativeSelect className="sm:w-56" value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Cuenta">
          <option value="">Todas las cuentas</option>
          {balances.map((b) => (
            <option key={b.accountId} value={b.accountId}>
              {b.name}
            </option>
          ))}
        </NativeSelect>
        <div className="flex gap-2 sm:ml-auto">
          <NativeSelect className="w-40" value={movementType} onChange={(e) => setMovementType(e.target.value)} aria-label="Tipo">
            <option value="">Todos los tipos</option>
            {MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {MOVEMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect className="w-32" value={direction} onChange={(e) => setDirection(e.target.value as DirFilter)} aria-label="Dirección">
            <option value="">Ambas</option>
            <option value="IN">Entradas</option>
            <option value="OUT">Salidas</option>
          </NativeSelect>
        </div>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(error, 'No se pudieron cargar los movimientos.')}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getKey={(m) => m.id}
            isLoading={isPending}
            skeletonRows={8}
            emptyText="No hay movimientos con estos filtros."
            renderCard={renderCard}
          />

          {!isPending && total > 0 && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} totalPages={totalPages} isFetching={isFetching} onPage={setPage} />
          )}
        </>
      )}
    </div>
  )
}
