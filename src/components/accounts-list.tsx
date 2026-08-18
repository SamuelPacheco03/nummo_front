import { useMemo, useState, type ReactNode } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { ChevronDown, Coins, Download, MoreHorizontal, Plus, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { ContactPicker } from '@/components/contact-picker'
import { BalanceKpis } from '@/components/balance-kpis'
import { SectionSwitch } from '@/components/section-switch'
import { PORTFOLIO_SECTIONS } from '@/features/navigation/sections'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type FilterChoice } from '@/components/ui/filter-chips'
import {
  FilterField,
  FilterSheet,
  FilterSortField,
  type SortChoice,
} from '@/components/ui/filter-sheet'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { NativeSelect } from '@/components/ui/native-select'
import { DataList, RowChevron } from '@/components/ui/data-list'
import { listColumns } from '@/components/ui/list-columns'
import { ListToolbar } from '@/components/ui/list-toolbar'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { downloadCsv } from '@/lib/csv'
import { formatAmount, formatDateHuman, plural } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useListFilters } from '@/lib/use-list-filters'
import {
  ACCOUNTS_ADVANCED_KEYS,
  ACCOUNTS_DEFAULT_SORT,
  ACCOUNTS_FILTER_KEYS,
  ACCOUNT_STATUSES,
  type AccountsFilterKey,
  type AccountsListCopy,
  type AccountsListResult,
  type AccountsQuery,
  type AccountsSummary,
} from '@/lib/accounts-list'

/** Diez caben en una pantalla sin scroll infinito y bajan lo que pesa cada carga. */
const PAGE_SIZE = 10

/** Columnas ordenables que aceptan los dos endpoints. */
const SORT_CHOICES: SortChoice[] = [
  { field: 'dueDate', label: 'Vencimiento', asc: 'Vencen antes', desc: 'Vencen después' },
  { field: 'balance', label: 'Saldo', asc: 'Menor primero', desc: 'Mayor primero' },
  { field: 'originalAmount', label: 'Valor original', asc: 'Menor primero', desc: 'Mayor primero' },
]

/** Lo que necesitan las cabeceras de la tabla: solo la columna y su nombre. */
const SORT_OPTIONS = SORT_CHOICES.map(({ field, label }) => ({ field, label }))

const column = listColumns<AccountsListResult['items'][number]>()

/** Una acción del menú, con la línea que explica qué provoca. */
export interface AccountsAction {
  label: string
  hint: string
  Icon: typeof RefreshCw
  pending: boolean
  onSelect: () => void
}

/**
 * **La lista de una cartera**, de cobro o de pago.
 *
 * Cuentas por cobrar y cuentas por pagar son la misma pantalla mirada desde los
 * dos lados: la misma cabecera, las mismas seis columnas, los mismos filtros y
 * el mismo CSV. Eran dos archivos de quinientas líneas idénticos en un 64%, y
 * ya habían empezado a separarse — que es exactamente lo que CLAUDE.md predice
 * cuando se copia en vez de extraer.
 *
 * Es el tercero de los tres pares espejo en tener su componente: `SettlementList`
 * (pagos/egresos) y `RecurringList` (acuerdos/recurrentes) lo resolvieron antes
 * y con la misma forma, así que aquí no se inventa nada — **el hook de datos
 * viaja como prop** (`useList`) y lo demás son palabras.
 *
 * Lo que **sí** cambia de verdad entre los dos lados viaja explícito:
 * `actions` (cobrar puede causar mora; pagar no) y los contadores del resumen,
 * que el contrato solo firma para cobrar.
 */
export function AccountsList({
  copy,
  storageKey,
  detailTo,
  catalog,
  statusLabels,
  statusOf,
  summary,
  summaryLoading,
  canCreate,
  canGenerate,
  actions,
  onGenerate,
  generating,
  createDialog,
  onCreate,
  useList,
}: {
  copy: AccountsListCopy
  /** Clave de `sessionStorage` para recordar los filtros de la sesión. */
  storageKey: string
  detailTo: (id: string) => string
  /** Conceptos de cobro o categorías de gasto, para la columna y el filtro. */
  catalog: { id: string; name: string }[]
  statusLabels: Record<string, string>
  statusOf: (status: string) => { tone: StatusTone; label: string }
  summary: AccountsSummary | undefined
  summaryLoading: boolean
  canCreate: boolean
  canGenerate: boolean
  /** Operaciones periódicas propias de este lado (causar mora, en cobrar). */
  actions?: AccountsAction[]
  onGenerate: () => void
  generating: boolean
  /** El diálogo de crear, que cada lado monta con su formulario. */
  createDialog: (open: boolean, onOpenChange: (open: boolean) => void) => ReactNode
  /** Se llama al pedir crear, por si el lado quiere hacer algo más. */
  onCreate?: () => void
  useList: (params: AccountsQuery) => AccountsListResult
}) {
  const navigate = useNavigate()
  // La organización la lee la lista, como hace `SettlementList`: el `orgId` y la
  // moneda son del shell, no algo que cada cara tenga que ir pasando.
  const { orgId, organization } = useCurrentOrg()
  const { values, set, clear } = useListFilters<AccountsFilterKey>(storageKey, ACCOUNTS_FILTER_KEYS)
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [createOpen, setCreateOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const page = Number(values.pagina) || 1
  const sortField = values.orden || ACCOUNTS_DEFAULT_SORT
  const desc = values.dir === 'desc'

  /** Cambiar cualquier criterio devuelve a la primera página. */
  const filter = (patch: Partial<Record<AccountsFilterKey, string>>) => set({ ...patch, pagina: '' })

  /** El orden por defecto se calla en la URL: solo estorba al compartirla. */
  const sortBy = (field: string, descending: boolean) =>
    filter({ orden: field === ACCOUNTS_DEFAULT_SORT ? '' : field, dir: descending ? 'desc' : '' })

  const { items, total, totalPages, isPending, isError, error, isFetching } = useList({
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    sort: sortField,
    order: desc ? 'desc' : 'asc',
    status: values.estado || undefined,
    contactId: values.contacto || undefined,
    catalogId: values.catalogo || undefined,
    dueAfter: values.desde || undefined,
    dueBefore: values.hasta || undefined,
  })

  const catalogMap = useMemo(() => new Map(catalog.map((c) => [c.id, c.name])), [catalog])

  /*
   * Solo los estados de trabajo diario van a la vista. Pagadas, canceladas y
   * castigadas son consulta ocasional y viven en los filtros avanzados: sacarlas
   * de aquí es lo que permite que las fichas quepan en dos líneas sin desplazarse
   * en horizontal (§21).
   *
   * Los contadores salen del resumen del API, y **cuentas por pagar no los
   * tiene**: `PayablesSummary` solo firma el de vencidas. Sus fichas van sin
   * número, que es mejor que un número inventado (§70). «Todas» va sin número en
   * los dos lados: sumar los tres estados daría un total que el backend no firma
   * —una cuenta parcial y vencida cuenta en uno solo—.
   */
  const statusChoices: FilterChoice[] = [
    { value: '', label: 'Todas' },
    { value: 'OVERDUE', label: 'Vencidas', count: summary?.overdueCount },
    { value: 'PENDING', label: 'Pendientes', count: summary?.pendingCount },
    { value: 'PARTIAL', label: 'Parciales', count: summary?.partialCount },
  ]
  // Si el estado activo salió de los avanzados, se muestra igualmente: si no, el
  // usuario vería la lista filtrada y ninguna ficha marcada.
  if (values.estado && !statusChoices.some((c) => c.value === values.estado)) {
    statusChoices.push({
      value: values.estado,
      label: statusLabels[values.estado] ?? values.estado,
    })
  }

  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'contact',
          header: copy.contact,
          meta: { card: 'title' },
          cell: ({ row }) => (
            <div className="min-w-0">
              <p className="truncate font-medium">{row.original.contactName}</p>
              {/* En la tarjeta el catálogo va en su propia línea de contexto,
                  así que aquí solo estorbaría: `lg:block` lo deja para la tabla. */}
              <p className="text-muted-foreground hidden truncate text-xs lg:block">
                {catalogMap.get(row.original.catalogId) ?? '—'}
              </p>
            </div>
          ),
        }),
        column.display({
          id: 'catalog',
          header: copy.catalog,
          meta: { hideOnTable: true, card: 'meta' },
          cell: ({ row }) => catalogMap.get(row.original.catalogId) ?? copy.catalogNone,
        }),
        column.display({
          id: 'dueDate',
          header: 'Vence',
          meta: { card: 'meta' },
          cell: ({ row }) => (
            <span className="nums text-muted-foreground">
              {/* «Vence» es la cabecera en la tabla; en la línea de la tarjeta,
                  que no tiene cabeceras, la fecha sola no diría de qué. */}
              <span className="lg:hidden">Vence </span>
              {formatDateHuman(row.original.dueDate)}
            </span>
          ),
        }),
        column.display({
          id: 'status',
          header: 'Estado',
          meta: { card: 'status' },
          cell: ({ row }) => <StatusBadge {...statusOf(row.original.displayStatus)} />,
        }),
        column.display({
          id: 'balance',
          header: 'Saldo',
          meta: { align: 'right', card: 'amount' },
          cell: ({ row }) => formatAmount(row.original.balance, row.original.currency),
        }),
        column.display({
          id: 'chevron',
          header: '',
          meta: { hideOnStack: true },
          cell: () => <RowChevron />,
        }),
      ]),
    [catalogMap, copy, statusOf],
  )

  /** Exporta lo que se está viendo, con los filtros puestos. */
  const onExport = () => {
    downloadCsv(
      `${copy.csvFile}_${new Date().toISOString().slice(0, 10)}.csv`,
      [copy.contact, copy.catalog, 'Vence', 'Estado', 'Saldo'],
      items.map((r) => [
        r.contactName,
        catalogMap.get(r.catalogId) ?? '',
        r.dueDate,
        statusLabels[r.displayStatus] ?? r.displayStatus,
        r.balance,
      ]),
    )
  }

  const advancedCount = ACCOUNTS_ADVANCED_KEYS.filter((k) => values[k]).length
  const hasFilters = Boolean(q) || ACCOUNTS_FILTER_KEYS.some((k) => k !== 'pagina' && values[k])
  const clearAll = () => {
    setSearch('')
    clear()
  }

  const openCreate = () => {
    onCreate?.()
    setCreateOpen(true)
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} description={copy.description}>
        {canGenerate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* En móvil el título ya ocupa la fila: las acciones se reducen a
                  su icono para no empujar la lista una línea entera hacia abajo. */}
              <Button variant="outline" size="sm" aria-label="Acciones">
                <MoreHorizontal aria-hidden className="size-4 sm:hidden" />
                <span className="hidden sm:inline">Acciones</span>
                <ChevronDown aria-hidden className="hidden size-4 sm:inline" />
              </Button>
            </DropdownMenuTrigger>
            {/*
              Generar y causar mora son operaciones periódicas con impacto
              financiero, no trabajo de todos los días: salen del primer nivel y
              ganan una línea que explica qué provocan (§38, §74).
            */}
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuItem onClick={onGenerate} disabled={generating}>
                {generating ? <Loader size="sm" /> : <RefreshCw className="size-4" />}
                <span className="min-w-0">
                  <span className="block font-medium">Generar mensualidades</span>
                  <span className="text-muted-foreground block text-xs">{copy.generateHint}</span>
                </span>
              </DropdownMenuItem>
              {actions?.map((a) => (
                <DropdownMenuItem key={a.label} onClick={a.onSelect} disabled={a.pending}>
                  {a.pending ? <Loader size="sm" /> : <a.Icon className="size-4" />}
                  <span className="min-w-0">
                    <span className="block font-medium">{a.label}</span>
                    <span className="text-muted-foreground block text-xs">{a.hint}</span>
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExport} disabled={items.length === 0}>
                <Download className="size-4" />
                <span className="min-w-0">
                  <span className="block font-medium">Exportar a CSV</span>
                  <span className="text-muted-foreground block text-xs">
                    Lo que estás viendo, con los filtros puestos
                  </span>
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {canCreate && (
          <Button size="sm" onClick={openCreate} aria-label={copy.createLabel}>
            <Plus aria-hidden className="size-4" />
            <span className="hidden sm:inline">{copy.createLabel}</span>
          </Button>
        )}
      </PageHeader>

      <SectionSwitch options={PORTFOLIO_SECTIONS} />

      <BalanceKpis
        label={copy.kpiLabel}
        totalOutstanding={summary?.totalOutstanding}
        overdueAmount={summary?.overdueAmount}
        overdueCount={summary?.overdueCount ?? 0}
        openCount={
          summary?.pendingCount === undefined && summary?.partialCount === undefined
            ? undefined
            : (summary?.pendingCount ?? 0) + (summary?.partialCount ?? 0)
        }
        currency={organization?.defaultCurrency}
        isLoading={summaryLoading}
      />

      {isError ? (
        <ErrorState error={error} fallback={copy.errorFallback} />
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
              options: ACCOUNT_STATUSES.map((value) => ({
                value,
                label: statusLabels[value] ?? value,
              })),
              value: values.estado,
              onChange: (estado) => filter({ estado }),
            }}
            filterCount={advancedCount}
            onOpenFilters={() => setSheetOpen(true)}
          />

          <DataList
            columns={columns}
            rows={items}
            getRowId={(r) => r.id}
            onRowClick={(r) => navigate(detailTo(r.id))}
            // Un icono fijo mientras los catálogos no traigan el suyo: el hueco
            // ya está, y el día que lo traigan se cambia solo esta línea.
            rowIcon={() => ({ Icon: Coins })}
            sort={{
              value: [{ id: sortField, desc }],
              onChange: (next) =>
                sortBy(next[0]?.id ?? ACCOUNTS_DEFAULT_SORT, Boolean(next[0]?.desc)),
              options: SORT_OPTIONS,
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
                  Icon={Coins}
                  title={copy.emptyTitle}
                  description={copy.emptyDescription}
                  action={
                    canCreate && (
                      <Button size="sm" onClick={openCreate}>
                        <Plus className="size-4" />
                        {copy.createLabel}
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
        resultLabel={`Ver ${plural(total, ...copy.unit)}`}
      >
        <FilterField label="Estado" hint="Aquí están también las pagadas y las canceladas.">
          <NativeSelect
            value={values.estado}
            onChange={(e) => filter({ estado: e.target.value })}
            aria-label="Estado"
          >
            <option value="">Todos los estados</option>
            {ACCOUNT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {statusLabels[value] ?? value}
              </option>
            ))}
          </NativeSelect>
        </FilterField>

        <FilterField label={copy.contact}>
          <ContactPicker
            orgId={orgId ?? ''}
            value={values.contacto || null}
            onChange={(contacto) => filter({ contacto: contacto ?? '' })}
            allowClear
            placeholder="Cualquiera"
          />
        </FilterField>

        <FilterField label={copy.catalogFilter}>
          <NativeSelect
            value={values.catalogo}
            onChange={(e) => filter({ catalogo: e.target.value })}
            aria-label={copy.catalogFilter}
          >
            <option value="">{copy.catalogAll}</option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </FilterField>

        {/*
          Dos campos de fecha sin más son un acertijo: no se sabe cuál es cuál
          hasta abrir el calendario. Cada uno lleva su palabra encima, y la ayuda
          dice lo que no es evidente — que se puede acotar por un solo lado.
        */}
        <FilterField label="Fecha de vencimiento" hint="Puedes acotar solo un extremo.">
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 space-y-1">
              <span className="text-muted-foreground block text-xs">Desde</span>
              <Input
                type="date"
                value={values.desde}
                max={values.hasta || undefined}
                onChange={(e) => filter({ desde: e.target.value })}
                aria-label="Vence desde"
              />
            </label>
            <label className="min-w-0 flex-1 space-y-1">
              <span className="text-muted-foreground block text-xs">Hasta</span>
              <Input
                type="date"
                value={values.hasta}
                min={values.desde || undefined}
                onChange={(e) => filter({ hasta: e.target.value })}
                aria-label="Vence hasta"
              />
            </label>
          </div>
        </FilterField>

        <FilterSortField choices={SORT_CHOICES} field={sortField} desc={desc} onChange={sortBy} />
      </FilterSheet>

      {createDialog(createOpen, setCreateOpen)}

      {/* Detalle en cajón: ruta hija, la lista se queda montada detrás. */}
      <Outlet />
    </div>
  )
}
