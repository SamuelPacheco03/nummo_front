import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { DataList } from '@/components/ui/data-list'
import {
  FilterField,
  FilterSheet,
  FilterSortField,
  type SortChoice,
} from '@/components/ui/filter-sheet'
import { listColumns } from '@/components/ui/list-columns'
import { ListToolbar } from '@/components/ui/list-toolbar'
import { NativeSelect } from '@/components/ui/native-select'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { formatAmount, formatDateHuman, plural } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useListFilters } from '@/lib/use-list-filters'
import { cn } from '@/lib/utils'
import type {
  GetApiV1OrganizationsOrgIdFinancialMovementsMovementType,
  GetApiV1OrganizationsOrgIdFinancialMovementsParams,
  GetApiV1OrganizationsOrgIdFinancialMovementsSort,
  LedgerMovement,
} from '@/api/generated/model'
import { MOVEMENT_TYPES, MOVEMENT_TYPE_LABELS } from './labels'
import { useAccountBalances, useMovements } from './hooks'

/** Diez, como el resto de listados. */
const PAGE_SIZE = 10

/** Criterios que viven en la URL, en español como las rutas (§87.5). */
const FILTER_KEYS = ['flujo', 'cuenta', 'tipo', 'orden', 'dir', 'pagina'] as const
type FilterKey = (typeof FILTER_KEYS)[number]

/** Los que cuentan para el contador del botón «Filtros». */
const ADVANCED_KEYS: FilterKey[] = ['cuenta', 'tipo']

/** Entra o sale: la pregunta que más se hace sobre un libro de caja. */
const FLOW_CHOICES = [
  { value: '', label: 'Todos' },
  { value: 'IN', label: 'Entradas' },
  { value: 'OUT', label: 'Salidas' },
]

/** Columnas ordenables que acepta el endpoint (contrato: ListMovementsQuery). */
const SORT_CHOICES: SortChoice[] = [
  { field: 'occurredAt', label: 'Fecha', asc: 'Más antiguos', desc: 'Más recientes' },
  { field: 'amount', label: 'Monto', asc: 'Menor primero', desc: 'Mayor primero' },
]

const DEFAULT_SORT = 'occurredAt'

const column = listColumns<LedgerMovement>()

/**
 * El libro de caja, con el mismo patrón de filtros que el resto (§21.1).
 *
 * **Sin cifras de cabecera:** los saldos por cuenta ya son la pantalla de al
 * lado (`/caja/cuentas`), y sumarlos aquí en uno solo sería inventar un total —
 * las cuentas pueden estar en monedas distintas y el backend no firma esa suma
 * (§70, §88.4).
 */
export function MovementsPage() {
  const { orgId } = useCurrentOrg()
  const { balances } = useAccountBalances(orgId)
  const accountName = useMemo(() => new Map(balances.map((b) => [b.accountId, b.name])), [balances])

  const { values, set, clear } = useListFilters<FilterKey>('nummo:movimientos:filtros', FILTER_KEYS)
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sheetOpen, setSheetOpen] = useState(false)

  const page = Number(values.pagina) || 1
  const sortField = values.orden || DEFAULT_SORT
  // Lo último ocurrido primero: se calla `desc` en la URL y se escribe `asc`.
  const desc = values.dir !== 'asc'

  /** Cambiar cualquier criterio devuelve a la primera página. */
  const filter = (patch: Partial<Record<FilterKey, string>>) => set({ ...patch, pagina: '' })

  const sortBy = (field: string, descending: boolean) =>
    filter({ orden: field === DEFAULT_SORT ? '' : field, dir: descending ? '' : 'asc' })

  const params: GetApiV1OrganizationsOrgIdFinancialMovementsParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    financialAccountId: values.cuenta || undefined,
    direction: (values.flujo ||
      undefined) as GetApiV1OrganizationsOrgIdFinancialMovementsParams['direction'],
    movementType: (values.tipo ||
      undefined) as GetApiV1OrganizationsOrgIdFinancialMovementsMovementType,
    sort: sortField as GetApiV1OrganizationsOrgIdFinancialMovementsSort,
    order: desc ? 'desc' : 'asc',
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = useMovements(
    orgId,
    params,
  )

  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'account',
          header: 'Cuenta',
          meta: { card: 'title' },
          cell: ({ row }) => (
            <div className="min-w-0">
              <p className="truncate font-medium">
                {accountName.get(row.original.financialAccountId) ?? '—'}
              </p>
              {/* En la tarjeta el tipo va en su línea de contexto. */}
              <p className="text-muted-foreground hidden truncate text-xs lg:block">
                {MOVEMENT_TYPE_LABELS[row.original.movementType] ?? row.original.movementType}
              </p>
            </div>
          ),
        }),
        column.display({
          id: 'movementType',
          header: 'Tipo',
          meta: { hideOnTable: true, card: 'meta' },
          cell: ({ row }) =>
            MOVEMENT_TYPE_LABELS[row.original.movementType] ?? row.original.movementType,
        }),
        column.display({
          id: 'occurredAt',
          header: 'Fecha',
          meta: { card: 'meta' },
          cell: ({ row }) => (
            <span className="nums text-muted-foreground">
              {formatDateHuman(row.original.occurredAt)}
            </span>
          ),
        }),
        column.display({
          id: 'amount',
          header: 'Monto',
          meta: { align: 'right', card: 'amount' },
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

  const advancedCount = ADVANCED_KEYS.filter((k) => values[k]).length
  const hasFilters = Boolean(q) || FILTER_KEYS.some((k) => k !== 'pagina' && values[k])
  const clearAll = () => {
    setSearch('')
    clear()
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Movimientos" description="Libro de todos los movimientos de caja." />

      {isError ? (
        <ErrorState error={error} fallback="No se pudieron cargar los movimientos." />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Buscar por descripción o referencia…"
            main={{
              label: 'Flujo',
              allLabel: 'Entradas y salidas',
              choices: FLOW_CHOICES,
              value: values.flujo,
              onChange: (flujo) => filter({ flujo }),
            }}
            filterCount={advancedCount}
            onOpenFilters={() => setSheetOpen(true)}
          />

          <DataList
            columns={columns}
            rows={items}
            getRowId={(m) => m.id}
            // Entra o sale: el tono ya lo dice el signo del monto, así que aquí
            // basta con la dirección.
            rowIcon={(m) => ({
              Icon: m.direction === 'IN' ? ArrowDownLeft : ArrowUpRight,
              tone: m.direction === 'IN' ? 'success' : 'destructive',
            })}
            sort={{
              value: [{ id: sortField, desc }],
              onChange: (next) => sortBy(next[0]?.id ?? DEFAULT_SORT, next[0]?.desc !== false),
              options: SORT_CHOICES.map(({ field, label }) => ({ field, label })),
              // El orden ya vive en el cajón, que es la única vía en móvil.
              showSortControl: false,
            }}
            isLoading={isPending}
            skeletonRows={PAGE_SIZE}
            emptyText={
              hasFilters ? (
                <NoResults entity="movimientos" onClear={clearAll} />
              ) : (
                <EmptyState
                  Icon={ArrowLeftRight}
                  title="Todavía no hay movimientos"
                  description="Cada pago, egreso o transferencia que registres aparecerá aquí, con su efecto en la cuenta."
                />
              )
            }
          />

          {!isPending && total > 0 && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              isFetching={isFetching}
              onPage={(next) => set({ pagina: next > 1 ? String(next) : '' })}
            />
          )}
        </>
      )}

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onClear={clearAll}
        canClear={hasFilters}
        resultLabel={`Ver ${plural(total, 'movimiento', 'movimientos')}`}
      >
        <FilterField label="Cuenta">
          <NativeSelect
            value={values.cuenta}
            onChange={(e) => filter({ cuenta: e.target.value })}
            aria-label="Cuenta"
          >
            <option value="">Todas las cuentas</option>
            {balances.map((b) => (
              <option key={b.accountId} value={b.accountId}>
                {b.name}
              </option>
            ))}
          </NativeSelect>
        </FilterField>

        <FilterField label="Tipo de movimiento" hint="Qué lo originó: un pago, un egreso…">
          <NativeSelect
            value={values.tipo}
            onChange={(e) => filter({ tipo: e.target.value })}
            aria-label="Tipo de movimiento"
          >
            <option value="">Todos los tipos</option>
            {MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {MOVEMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </FilterField>

        <FilterSortField choices={SORT_CHOICES} field={sortField} desc={desc} onChange={sortBy} />
      </FilterSheet>
    </div>
  )
}
