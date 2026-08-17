import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import type { SortingState } from '@tanstack/react-table'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { NativeSelect } from '@/components/ui/native-select'
import { DataList, listColumns, type ActiveFilter } from '@/components/ui/data-list'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'
import type {
  GetApiV1OrganizationsOrgIdFinancialMovementsMovementType,
  GetApiV1OrganizationsOrgIdFinancialMovementsParams,
  GetApiV1OrganizationsOrgIdFinancialMovementsSort,
  LedgerMovement,
} from '@/api/generated/model'
import { MOVEMENT_TYPES, MOVEMENT_TYPE_LABELS } from './labels'
import { useAccountBalances, useMovements } from './hooks'

type DirFilter = '' | 'IN' | 'OUT'
const PAGE_SIZE = 20

/** Columnas ordenables que acepta el endpoint (contrato: ListMovementsQuery). */
const SORT_OPTIONS = [
  { field: 'occurredAt', label: 'Fecha' },
  { field: 'amount', label: 'Monto' },
]

const column = listColumns<LedgerMovement>()

export function MovementsPage() {
  const { orgId } = useCurrentOrg()
  const { balances } = useAccountBalances(orgId)
  const accountName = useMemo(() => new Map(balances.map((b) => [b.accountId, b.name])), [balances])

  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'occurredAt', desc: true }])
  const [accountId, setAccountId] = useState('')
  const [direction, setDirection] = useState<DirFilter>('')
  const [movementType, setMovementType] = useState('')
  const [page, setPage] = useState(1)

  // Cualquier cambio de criterio devuelve a la primera página.
  useEffect(() => {
    setPage(1)
  }, [q, accountId, direction, movementType, sorting])

  const active = sorting[0]
  const params: GetApiV1OrganizationsOrgIdFinancialMovementsParams = {
    page,
    pageSize: PAGE_SIZE,
    financialAccountId: accountId || undefined,
    direction: direction || undefined,
    movementType: (movementType || undefined) as
      | GetApiV1OrganizationsOrgIdFinancialMovementsMovementType
      | undefined,
    q: q || undefined,
    sort: active?.id as GetApiV1OrganizationsOrgIdFinancialMovementsSort | undefined,
    order: active?.desc ? 'desc' : 'asc',
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = useMovements(orgId, params)

  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'account',
          header: 'Cuenta',
          cell: ({ row }) => (
            <div className="min-w-0">
              <p className="truncate font-medium">
                {accountName.get(row.original.financialAccountId) ?? '—'}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {MOVEMENT_TYPE_LABELS[row.original.movementType] ?? row.original.movementType}
              </p>
            </div>
          ),
        }),
        column.display({
          id: 'occurredAt',
          header: 'Fecha',
          cell: ({ row }) => (
            <span className="nums text-muted-foreground">
              {formatDateHuman(row.original.occurredAt)}
            </span>
          ),
        }),
        column.display({
          id: 'amount',
          header: 'Monto',
          meta: { align: 'right' },
          cell: ({ row }) => (
            <span
              className={cn(
                row.original.direction === 'IN' ? 'text-success-strong' : 'text-destructive',
              )}
            >
              {row.original.direction === 'IN' ? '+' : '−'} {formatAmount(row.original.amount)}
            </span>
          ),
        }),
      ]),
    [accountName],
  )

  const activeFilters = [
    q && { id: 'q', label: `Busca: ${q}`, onRemove: () => setSearch('') },
    accountId && { id: 'account', label: `Cuenta: ${accountName.get(accountId) ?? '—'}`, onRemove: () => setAccountId('') },
    direction && { id: 'dir', label: direction === 'IN' ? 'Entradas' : 'Salidas', onRemove: () => setDirection('') },
    movementType && {
      id: 'type',
      label: MOVEMENT_TYPE_LABELS[movementType] ?? movementType,
      onRemove: () => setMovementType(''),
    },
  ].filter(Boolean) as ActiveFilter[]

  const hasFilters = Boolean(q) || accountId !== '' || direction !== '' || movementType !== ''
  const clearFilters = () => {
    setSearch('')
    setAccountId('')
    setDirection('')
    setMovementType('')
  }

  return (
    <div>
      <PageHeader title="Movimientos" description="Libro de todos los movimientos de caja." />

      {isError ? (
        <ErrorState error={error} fallback="No se pudieron cargar los movimientos." />
      ) : (
        <>
          <DataList
            columns={columns}
            rows={items}
            getRowId={(m) => m.id}
            isLoading={isPending}
            activeFilters={activeFilters}
            onClearFilters={clearFilters}
            emptyText={
              hasFilters ? (
                <NoResults entity="movimientos" onClear={clearFilters} />
              ) : (
                <EmptyState
                  Icon={ArrowLeftRight}
                  title="Todavía no hay movimientos"
                  description="Cada pago, egreso o transferencia que registres aparecerá aquí, con su efecto en la cuenta."
                />
              )
            }
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Buscar por descripción o referencia…',
            }}
            sort={{ value: sorting, onChange: setSorting, options: SORT_OPTIONS }}
            filters={
              <>
                <NativeSelect
                  className="w-full sm:w-52"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  aria-label="Cuenta"
                >
                  <option value="">Todas las cuentas</option>
                  {balances.map((b) => (
                    <option key={b.accountId} value={b.accountId}>
                      {b.name}
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect
                  className="w-40"
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  aria-label="Tipo"
                >
                  <option value="">Todos los tipos</option>
                  {MOVEMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {MOVEMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect
                  className="w-32"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as DirFilter)}
                  aria-label="Dirección"
                >
                  <option value="">Ambas</option>
                  <option value="IN">Entradas</option>
                  <option value="OUT">Salidas</option>
                </NativeSelect>
              </>
            }
          />

          {!isPending && total > 0 && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} totalPages={totalPages} isFetching={isFetching} onPage={setPage} />
          )}
        </>
      )}
    </div>
  )
}
