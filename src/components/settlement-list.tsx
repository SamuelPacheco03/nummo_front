import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { Banknote, Plus } from 'lucide-react'
import { CashflowKpis } from '@/components/cashflow-kpis'
import { ContactPicker } from '@/components/contact-picker'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { SectionSwitch } from '@/components/section-switch'
import { Button } from '@/components/ui/button'
import { DataList, RowChevron } from '@/components/ui/data-list'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { type FilterChoice } from '@/components/ui/filter-chips'
import {
  FilterField,
  FilterSheet,
  FilterSortField,
  type SortChoice,
} from '@/components/ui/filter-sheet'
import { listColumns } from '@/components/ui/list-columns'
import { ListToolbar } from '@/components/ui/list-toolbar'
import { NativeSelect } from '@/components/ui/native-select'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { formatAmount, formatDateHuman, plural } from '@/lib/format'
import {
  SETTLEMENT_ADVANCED_KEYS,
  SETTLEMENT_FILTER_KEYS,
  SETTLEMENT_STATUSES,
  type SettlementFilterKey,
  type SettlementListCopy,
  type SettlementListResult,
  type SettlementQuery,
  type SettlementRow,
} from '@/lib/settlement-list'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useListFilters } from '@/lib/use-list-filters'
import { cn } from '@/lib/utils'

/** Diez caben en una pantalla sin scroll infinito, igual que en cartera. */
const PAGE_SIZE = 10

const column = listColumns<SettlementRow>()

/**
 * **Listado de dinero registrado**: pagos o egresos, la misma pantalla desde los
 * dos lados.
 *
 * Trae de cartera lo que allí funcionó (§21.1, §94.0): cifras de cabecera,
 * estado como fichas en móvil y desplegable en escritorio, lo demás en el cajón
 * de filtros, y todos los criterios en la URL para que sobrevivan a la
 * navegación y se puedan compartir.
 *
 * **`useList` es un hook, no un dato.** Es la única forma de que los filtros
 * vivan aquí —donde está la interfaz que los edita— y la consulta viva en su
 * feature, que es quien conoce los nombres de su endpoint (`payerContactId` vs
 * `supplierContactId`, `receivedAt` vs `disbursedAt`). Se llama sin condiciones
 * y cada pantalla monta uno solo, así que las reglas de hooks se cumplen.
 */
export function SettlementList({
  copy,
  storageKey,
  sections,
  newTo,
  detailTo,
  purposes,
  purposeLabels,
  sortChoices,
  statusOf,
  kpi,
  canRegister,
  useList,
}: {
  copy: SettlementListCopy
  /** Clave de `sessionStorage` para recordar los filtros de la sesión. */
  storageKey: string
  /** El par de rutas espejo, para el salto de móvil. */
  sections: { to: string; label: string }[]
  newTo: string
  detailTo: (id: string) => string
  /** Propósitos del contrato, en el orden en que se ofrecen. */
  purposes: { value: string; label: string }[]
  purposeLabels: Record<string, string>
  sortChoices: SortChoice[]
  statusOf: (status: string) => { tone: StatusTone; label: string }
  kpi: { kind: 'income' | 'expense'; label: string; previousLabel: string }
  /** Si el rol permite registrar. Lo decide cada feature, no este componente. */
  canRegister: boolean
  useList: (params: SettlementQuery) => SettlementListResult
}) {
  const { orgId, organization } = useCurrentOrg()
  const navigate = useNavigate()

  const { values, set, clear } = useListFilters<SettlementFilterKey>(
    storageKey,
    SETTLEMENT_FILTER_KEYS,
  )
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sheetOpen, setSheetOpen] = useState(false)

  const page = Number(values.pagina) || 1
  const defaultSort = sortChoices[0]?.field ?? ''
  const sortField = values.orden || defaultSort
  const desc = values.dir !== 'asc'

  /** Cambiar cualquier criterio devuelve a la primera página. */
  const filter = (patch: Partial<Record<SettlementFilterKey, string>>) =>
    set({ ...patch, pagina: '' })

  /*
    Aquí el orden por defecto es descendente —lo último cobrado primero—, así que
    lo que se calla en la URL es `desc` y lo que se escribe es `asc`. Al revés que
    en cartera, donde lo primero que interesa es lo que vence antes.
  */
  const sortBy = (field: string, descending: boolean) =>
    filter({
      orden: field === defaultSort ? '' : field,
      dir: descending ? '' : 'asc',
    })

  const list = useList({
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    sort: sortField,
    order: desc ? 'desc' : 'asc',
    contactId: values.contacto || undefined,
    status: values.estado || undefined,
    purpose: values.proposito || undefined,
  })
  const { items, total, totalPages, isPending, isError, error, isFetching } = list

  /*
    Solo dos estados, y ninguno lleva contador: el API no publica un resumen de
    pagos por estado y sumarlo desde la página visible daría una cifra que el
    backend no firma (§70).
  */
  const statusChoices: FilterChoice[] = [
    { value: '', label: 'Todos' },
    ...SETTLEMENT_STATUSES.map((value) => ({ value, label: statusOf(value).label })),
  ]

  const columns = column.columns([
    column.display({
      id: 'party',
      header: copy.party,
      meta: { card: 'title' },
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.contactName}</p>
          {/* En la tarjeta el propósito va en su línea de contexto; aquí solo
              estorbaría, así que `lg:block` lo deja para la tabla. */}
          <p className="text-muted-foreground hidden truncate text-xs lg:block">
            {purposeLabels[row.original.purpose] ?? row.original.purpose}
          </p>
        </div>
      ),
    }),
    column.display({
      id: 'purpose',
      header: 'Tipo',
      meta: { hideOnTable: true, card: 'meta' },
      cell: ({ row }) => purposeLabels[row.original.purpose] ?? row.original.purpose,
    }),
    column.display({
      id: 'date',
      header: 'Fecha',
      meta: { card: 'meta' },
      cell: ({ row }) => (
        <span className="nums text-muted-foreground">{formatDateHuman(row.original.date)}</span>
      ),
    }),
    column.display({
      id: 'status',
      header: 'Estado',
      meta: { card: 'status' },
      cell: ({ row }) => <StatusBadge {...statusOf(row.original.status)} />,
    }),
    column.display({
      id: 'amount',
      header: 'Monto',
      meta: { align: 'right', card: 'amount' },
      cell: ({ row }) => (
        <span
          className={cn(
            row.original.status === 'REVERSED' && 'text-muted-foreground line-through',
          )}
        >
          {formatAmount(row.original.amount)}
        </span>
      ),
    }),
    column.display({
      id: 'chevron',
      header: '',
      meta: { hideOnStack: true },
      cell: () => <RowChevron />,
    }),
  ])

  const advancedCount = SETTLEMENT_ADVANCED_KEYS.filter((k) => values[k]).length
  const hasFilters =
    Boolean(q) || SETTLEMENT_FILTER_KEYS.some((k) => k !== 'pagina' && values[k])
  const clearAll = () => {
    setSearch('')
    clear()
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} description={copy.description}>
        {canRegister && (
          <Button asChild size="sm" aria-label={copy.action}>
            <Link to={newTo}>
              <Plus aria-hidden className="size-4" />
              <span className="hidden sm:inline">{copy.action}</span>
            </Link>
          </Button>
        )}
      </PageHeader>

      <SectionSwitch options={sections} />

      <CashflowKpis {...kpi} currency={organization?.defaultCurrency} />

      {isError ? (
        <ErrorState error={error} fallback={copy.loadError} />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearch={setSearch}
            searchPlaceholder={copy.searchPlaceholder}
            main={{
              label: 'Estado',
              allLabel: 'Todos los estados',
              choices: statusChoices,
              value: values.estado,
              onChange: (estado) => filter({ estado }),
            }}
            filterCount={advancedCount}
            onOpenFilters={() => setSheetOpen(true)}
          />

          <DataList
            columns={columns}
            rows={items}
            getRowId={(row) => row.id}
            onRowClick={(row) => navigate(detailTo(row.id))}
            rowIcon={() => ({ Icon: Banknote })}
            sort={{
              value: [{ id: sortField, desc }],
              onChange: (next) => sortBy(next[0]?.id ?? defaultSort, next[0]?.desc !== false),
              options: sortChoices.map(({ field, label }) => ({ field, label })),
              // El orden ya vive en el cajón, que es la única vía en móvil.
              showSortControl: false,
            }}
            isLoading={isPending}
            skeletonRows={PAGE_SIZE}
            emptyText={
              hasFilters ? (
                <NoResults entity={copy.entity} onClear={clearAll} />
              ) : (
                <EmptyState
                  Icon={Banknote}
                  title={copy.emptyTitle}
                  description={copy.emptyDescription}
                  action={
                    canRegister && (
                      <Button asChild size="sm">
                        <Link to={newTo}>
                          <Plus className="size-4" />
                          {copy.action}
                        </Link>
                      </Button>
                    )
                  }
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
        resultLabel={`Ver ${plural(total, copy.entity.replace(/s$/, ''), copy.entity)}`}
      >
        <FilterField label="Estado">
          <NativeSelect
            value={values.estado}
            onChange={(e) => filter({ estado: e.target.value })}
            aria-label="Estado"
          >
            <option value="">Todos los estados</option>
            {SETTLEMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {statusOf(value).label}
              </option>
            ))}
          </NativeSelect>
        </FilterField>

        <FilterField label={copy.party}>
          <ContactPicker
            label={copy.party}
            orgId={orgId ?? ''}
            value={values.contacto || null}
            onChange={(contacto) => filter({ contacto: contacto ?? '' })}
            allowClear
            placeholder="Cualquiera"
          />
        </FilterField>

        <FilterField label="Propósito" hint="Para qué se registró el dinero.">
          <NativeSelect
            value={values.proposito}
            onChange={(e) => filter({ proposito: e.target.value })}
            aria-label="Propósito"
          >
            <option value="">Todos los propósitos</option>
            {purposes.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </NativeSelect>
        </FilterField>

        <FilterSortField choices={sortChoices} field={sortField} desc={desc} onChange={sortBy} />
      </FilterSheet>

      {/* Detalle en cajón: ruta hija, la lista se queda montada detrás. */}
      <Outlet />
    </div>
  )
}
