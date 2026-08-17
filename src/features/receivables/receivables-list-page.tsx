import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronDown, Coins, Download, MoreHorizontal, Percent, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
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
import { FilterChips, type FilterChoice } from '@/components/ui/filter-chips'
import {
  FilterField,
  FilterSheet,
  FilterSheetTrigger,
  FilterSortField,
  type SortChoice,
} from '@/components/ui/filter-sheet'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { NativeSelect } from '@/components/ui/native-select'
import { SearchInput } from '@/components/search-input'
import { DataList, listColumns, RowChevron } from '@/components/ui/data-list'
import { StatusBadge } from '@/components/ui/status-badge'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { useContacts } from '@/features/contacts/hooks'
import { useBillingConcepts } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts, canManageAgreements } from '@/features/organizations/roles'
import { useReceivablesSummary } from '@/features/reports/hooks'
import { downloadCsv } from '@/lib/csv'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman, plural } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useListFilters } from '@/lib/use-list-filters'
import type {
  AccrueInterestResult,
  GenerateReceivablesResult,
  GetApiV1OrganizationsOrgIdReceivablesParams,
  GetApiV1OrganizationsOrgIdReceivablesSort,
  ReceivableBalance,
} from '@/api/generated/model'
import { RECEIVABLE_STATUS_LABELS, receivableStatus } from './labels'
import { CreateReceivableDialog } from './create-receivable-dialog'
import { useAccrueInterest, useGenerateReceivables, useReceivables } from './hooks'

/** Diez caben en una pantalla sin scroll infinito y bajan lo que pesa cada carga. */
const PAGE_SIZE = 10

/**
 * Criterios que viven en la URL. Los nombres van en español, como las rutas
 * (§87.5): la URL es interfaz de usuario y alguien la va a leer al compartirla.
 */
const FILTER_KEYS = ['estado', 'pagador', 'concepto', 'desde', 'hasta', 'orden', 'dir', 'pagina'] as const
type FilterKey = (typeof FILTER_KEYS)[number]

/** Criterios que cuentan para el contador del botón «Filtros». */
const ADVANCED_KEYS: FilterKey[] = ['pagador', 'concepto', 'desde', 'hasta']

/** Todos los estados del contrato, para el desplegable de los avanzados. */
const ALL_STATUSES = ['PENDING', 'PARTIAL', 'OVERDUE', 'PAID', 'CANCELLED', 'WRITTEN_OFF']

/** Columnas ordenables que acepta el endpoint (contrato: ListReceivablesQuery). */
const SORT_CHOICES: SortChoice[] = [
  { field: 'dueDate', label: 'Vencimiento', asc: 'Vencen antes', desc: 'Vencen después' },
  { field: 'balance', label: 'Saldo', asc: 'Menor primero', desc: 'Mayor primero' },
  { field: 'originalAmount', label: 'Valor original', asc: 'Menor primero', desc: 'Mayor primero' },
]

/** Lo que necesitan las cabeceras de la tabla: solo la columna y su nombre. */
const SORT_OPTIONS = SORT_CHOICES.map(({ field, label }) => ({ field, label }))

/** Lo primero que se quiere ver de una cartera: lo que vence antes. */
const DEFAULT_SORT = 'dueDate'

const column = listColumns<ReceivableBalance>()

export function ReceivablesListPage() {
  const { orgId, organization, role } = useCurrentOrg()
  const currency = organization?.defaultCurrency
  const canGenerate = canManageAgreements(role)
  const canCreate = canEditContacts(role)
  const navigate = useNavigate()

  const { values, set, clear } = useListFilters<FilterKey>('nummo:cxc:filtros', FILTER_KEYS)
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [createOpen, setCreateOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const page = Number(values.pagina) || 1
  const sortField = values.orden || DEFAULT_SORT
  const desc = values.dir === 'desc'

  /** Cambiar cualquier criterio devuelve a la primera página. */
  const filter = (patch: Partial<Record<FilterKey, string>>) => set({ ...patch, pagina: '' })

  /** El orden por defecto se calla en la URL: solo estorba al compartirla. */
  const sortBy = (field: string, descending: boolean) =>
    filter({ orden: field === DEFAULT_SORT ? '' : field, dir: descending ? 'desc' : '' })

  const params: GetApiV1OrganizationsOrgIdReceivablesParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    sort: sortField as GetApiV1OrganizationsOrgIdReceivablesSort,
    order: desc ? 'desc' : 'asc',
    displayStatus: (values.estado ||
      undefined) as GetApiV1OrganizationsOrgIdReceivablesParams['displayStatus'],
    payerContactId: values.pagador || undefined,
    billingConceptId: values.concepto || undefined,
    dueAfter: values.desde || undefined,
    dueBefore: values.hasta || undefined,
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = useReceivables(
    orgId,
    params,
  )
  const { summary, isPending: summaryLoading } = useReceivablesSummary(orgId)

  const { contacts } = useContacts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const { items: concepts } = useBillingConcepts(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'name',
    order: 'asc',
  })
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c.displayName])), [contacts])
  const conceptMap = useMemo(() => new Map(concepts.map((c) => [c.id, c.name])), [concepts])

  /*
   * Solo los estados de trabajo diario van a la vista. Pagadas, canceladas y
   * castigadas son consulta ocasional y viven en los filtros avanzados: sacarlas
   * de aquí es lo que permite que las fichas quepan en dos líneas sin desplazarse
   * en horizontal (§21).
   *
   * Los contadores salen del resumen del API. «Todas» va sin número a propósito:
   * sumar los tres estados daría un total que el backend no firma —y que puede
   * no cuadrar, porque una cuenta parcial y vencida cuenta en uno solo—. §70:
   * cuando falta un dato, no se inventa.
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
      label: RECEIVABLE_STATUS_LABELS[values.estado] ?? values.estado,
    })
  }

  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'payer',
          header: 'Pagador',
          cell: ({ row }) => (
            <div className="min-w-0">
              <p className="truncate font-medium">
                {contactMap.get(row.original.payerContactId) ?? '—'}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {conceptMap.get(row.original.billingConceptId) ?? '—'}
              </p>
            </div>
          ),
        }),
        column.display({
          id: 'dueDate',
          header: 'Vence',
          cell: ({ row }) => (
            <span className="nums text-muted-foreground">
              {formatDateHuman(row.original.dueDate)}
            </span>
          ),
        }),
        column.display({
          id: 'status',
          header: 'Estado',
          cell: ({ row }) => <StatusBadge {...receivableStatus(row.original.displayStatus)} />,
        }),
        column.display({
          id: 'balance',
          header: 'Saldo',
          meta: { align: 'right' },
          cell: ({ row }) => formatAmount(row.original.balance, row.original.currency),
        }),
        column.display({
          id: 'chevron',
          header: '',
          meta: { hideOnStack: true },
          cell: () => <RowChevron />,
        }),
      ]),
    // `filter` es una función estable por render; lo que cambia de verdad son
    // los valores, y de eso ya avisa `values`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contactMap, conceptMap, values, orgId],
  )

  const generate = useGenerateReceivables(orgId ?? '')
  const onGenerate = async () => {
    try {
      const res = await generate.mutateAsync({ orgId: orgId ?? '' })
      const r = res.data as GenerateReceivablesResult
      toast.success(`${r.created} generadas · ${r.skipped} ya existían`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudieron generar'))
    }
  }

  const accrue = useAccrueInterest(orgId ?? '')
  const onAccrue = async () => {
    try {
      const res = await accrue.mutateAsync({ orgId: orgId ?? '' })
      const r = res.data as AccrueInterestResult
      toast.success(`Mora causada: ${plural(r.charged, 'cargo', 'cargos')} · ${formatAmount(r.chargedAmount)}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo causar la mora'))
    }
  }

  /** Exporta lo que se está viendo, con los filtros puestos. */
  const onExport = () => {
    downloadCsv(
      `cuentas-por-cobrar_${new Date().toISOString().slice(0, 10)}.csv`,
      ['Pagador', 'Concepto', 'Vence', 'Estado', 'Saldo'],
      items.map((r) => [
        contactMap.get(r.payerContactId) ?? '',
        conceptMap.get(r.billingConceptId) ?? '',
        r.dueDate,
        RECEIVABLE_STATUS_LABELS[r.displayStatus] ?? r.displayStatus,
        r.balance,
      ]),
    )
  }

  const advancedCount = ADVANCED_KEYS.filter((k) => values[k]).length
  const hasFilters = Boolean(q) || FILTER_KEYS.some((k) => k !== 'pagina' && values[k])
  const clearAll = () => {
    setSearch('')
    clear()
  }

  const openCount = (summary?.pendingCount ?? 0) + (summary?.partialCount ?? 0)

  return (
    <div className="space-y-5">
      <PageHeader title="Cuentas por cobrar" description="Obligaciones de los pagadores.">
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
              <DropdownMenuItem onClick={onGenerate} disabled={generate.isPending}>
                {generate.isPending ? <Loader size="sm" /> : <RefreshCw className="size-4" />}
                <span className="min-w-0">
                  <span className="block font-medium">Generar mensualidades</span>
                  <span className="text-muted-foreground block text-xs">
                    Crea las cuentas del período desde los acuerdos activos
                  </span>
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAccrue} disabled={accrue.isPending}>
                {accrue.isPending ? <Loader size="sm" /> : <Percent className="size-4" />}
                <span className="min-w-0">
                  <span className="block font-medium">Causar mora</span>
                  <span className="text-muted-foreground block text-xs">
                    Aplica los intereses a las cuentas vencidas
                  </span>
                </span>
              </DropdownMenuItem>
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
          <Button size="sm" onClick={() => setCreateOpen(true)} aria-label="Nueva cuenta">
            <Plus aria-hidden className="size-4" />
            <span className="hidden sm:inline">Nueva cuenta</span>
          </Button>
        )}
      </PageHeader>

      <SectionSwitch options={PORTFOLIO_SECTIONS} />

      <BalanceKpis
        label="Por cobrar"
        totalOutstanding={summary?.totalOutstanding}
        overdueAmount={summary?.overdueAmount}
        overdueCount={summary?.overdueCount ?? 0}
          openCount={openCount}
        currency={currency}
        isLoading={summaryLoading}
      />

      {isError ? (
        <ErrorState error={error} fallback="No se pudieron cargar las cuentas por cobrar." />
      ) : (
        <>
          <div className="space-y-3">
            {/*
              Móvil y tablet: fichas. El dedo agradece un objetivo grande y
              siempre visible. Desde `lg` la lista es una tabla de verdad, con su
              propia fila de controles, y una rejilla de fichas ahí compite con
              las cabeceras: el estado vuelve a un desplegable junto al buscador.
            */}
            <FilterChips
              className="lg:hidden"
              label="Estado"
              choices={statusChoices}
              value={values.estado}
              onChange={(estado) => filter({ estado })}
            />

            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 sm:max-w-72">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Buscar por pagador…"
                />
              </div>
              {/* Ocultar va en la envoltura: `className` llega al `select`, y el
                  chevron vive fuera de él. */}
              <div className="hidden lg:block">
                <NativeSelect
                  className="w-44"
                  value={values.estado}
                  onChange={(e) => filter({ estado: e.target.value })}
                  aria-label="Estado"
                >
                  <option value="">Todos los estados</option>
                  {ALL_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {RECEIVABLE_STATUS_LABELS[value] ?? value}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              {/* A la derecha del todo: es el cajón, no un criterio más. */}
              <FilterSheetTrigger
                className="ml-auto"
                count={advancedCount}
                onClick={() => setSheetOpen(true)}
              />
            </div>
          </div>

          <DataList
            columns={columns}
            rows={items}
            getRowId={(r) => r.receivableId}
            onRowClick={(r) => navigate(`/cartera/cxc/${r.receivableId}`)}
            sort={{
              value: [{ id: sortField, desc }],
              onChange: (next) => sortBy(next[0]?.id ?? DEFAULT_SORT, Boolean(next[0]?.desc)),
              options: SORT_OPTIONS,
              // El orden ya vive en el cajón, que es la única vía en móvil.
              showSortControl: false,
            }}
            isLoading={isPending}
            skeletonRows={PAGE_SIZE}
            emptyText={
              hasFilters ? (
                <NoResults entity="cuentas por cobrar" onClear={clearAll} />
              ) : (
                <EmptyState
                  Icon={Coins}
                  title="Todavía no tienes cuentas por cobrar"
                  description="Aquí verás lo que te deben. Créalas una a una, o define un acuerdo para que Nummo las genere solas cada período."
                  action={
                    canCreate && (
                      <Button size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus className="size-4" />
                        Nueva cuenta
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
        resultLabel={`Ver ${plural(total, 'cuenta', 'cuentas')}`}
      >
        <FilterField label="Estado" hint="Aquí están también las pagadas y las canceladas.">
          <NativeSelect
            value={values.estado}
            onChange={(e) => filter({ estado: e.target.value })}
            aria-label="Estado"
          >
            <option value="">Todos los estados</option>
            {ALL_STATUSES.map((value) => (
              <option key={value} value={value}>
                {RECEIVABLE_STATUS_LABELS[value] ?? value}
              </option>
            ))}
          </NativeSelect>
        </FilterField>

        <FilterField label="Pagador">
          <ContactPicker
            orgId={orgId ?? ''}
            value={values.pagador || null}
            onChange={(pagador) => filter({ pagador: pagador ?? '' })}
            allowClear
            placeholder="Cualquiera"
          />
        </FilterField>

        <FilterField label="Concepto de cobro">
          <NativeSelect
            value={values.concepto}
            onChange={(e) => filter({ concepto: e.target.value })}
            aria-label="Concepto de cobro"
          >
            <option value="">Todos los conceptos</option>
            {concepts.map((c) => (
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

      {orgId && (
        <CreateReceivableDialog orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </div>
  )
}
