import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { FileText, Plus } from 'lucide-react'
import { ContactPicker } from '@/components/contact-picker'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { SectionSwitch } from '@/components/section-switch'
import { Button } from '@/components/ui/button'
import { DataList, RowChevron } from '@/components/ui/data-list'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
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
import { useContacts } from '@/features/contacts/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { formatAmount, plural } from '@/lib/format'
import {
  RECURRING_ADVANCED_KEYS,
  RECURRING_FILTER_KEYS,
  RECURRING_FREQUENT_STATUSES,
  RECURRING_STATUSES,
  type RecurringFilterKey,
  type RecurringListCopy,
  type RecurringListResult,
  type RecurringQuery,
  type RecurringRow,
} from '@/lib/recurring-list'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useListFilters } from '@/lib/use-list-filters'

/** Diez, como el resto de listados. */
const PAGE_SIZE = 10

/** Columnas ordenables que aceptan los dos endpoints (contrato: NamedListQuery). */
const SORT_CHOICES: SortChoice[] = [
  { field: 'createdAt', label: 'Creación', asc: 'Más antiguos', desc: 'Más recientes' },
  { field: 'name', label: 'Nombre', asc: 'De la A a la Z', desc: 'De la Z a la A' },
]

const DEFAULT_SORT = 'createdAt'

const column = listColumns<RecurringRow>()

/**
 * **Listado de plantillas recurrentes**: acuerdos de cobro o gastos periódicos,
 * la misma pantalla desde los dos lados.
 *
 * Sigue el patrón de §21.1 —criterios en la URL, estado a la vista, lo demás en
 * el cajón— y el reparto de `RECURRING_FREQUENT_STATUSES`: lo vivo delante, lo
 * archivado dentro.
 *
 * **Sin cifras de cabecera:** el contrato no publica un resumen de lo recurrente,
 * y sumar la página visible daría un número que el backend no firma (§70). Lo
 * que sí resume esto —cuánto se va a cobrar o pagar el mes que viene— es una
 * pregunta del Panel, no de esta lista.
 *
 * `useList` es un hook, no un dato: mismo motivo que en `SettlementList`, los
 * filtros viven aquí y la consulta en la feature que conoce su endpoint.
 */
export function RecurringList({
  copy,
  storageKey,
  sections,
  newTo,
  detailTo,
  statusOf,
  recurrenceLabels,
  canManage,
  useList,
}: {
  copy: RecurringListCopy
  /** Clave de `sessionStorage` para recordar los filtros de la sesión. */
  storageKey: string
  /** El par de rutas espejo, para el salto de móvil. */
  sections: { to: string; label: string }[]
  newTo: string
  detailTo: (id: string) => string
  statusOf: (status: string) => { tone: StatusTone; label: string }
  recurrenceLabels: Record<string, string>
  /** Si el rol permite crear y gestionar. Lo decide cada feature. */
  canManage: boolean
  useList: (params: RecurringQuery) => RecurringListResult
}) {
  const { orgId } = useCurrentOrg()
  const navigate = useNavigate()

  const { values, set, clear } = useListFilters<RecurringFilterKey>(
    storageKey,
    RECURRING_FILTER_KEYS,
  )
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sheetOpen, setSheetOpen] = useState(false)

  const page = Number(values.pagina) || 1
  const sortField = values.orden || DEFAULT_SORT
  // Lo último creado primero: se calla `desc` en la URL y se escribe `asc`.
  const desc = values.dir !== 'asc'

  /** Cambiar cualquier criterio devuelve a la primera página. */
  const filter = (patch: Partial<Record<RecurringFilterKey, string>>) =>
    set({ ...patch, pagina: '' })

  const sortBy = (field: string, descending: boolean) =>
    filter({ orden: field === DEFAULT_SORT ? '' : field, dir: descending ? '' : 'asc' })

  const { items, total, totalPages, isPending, isError, error, isFetching } = useList({
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    sort: sortField,
    order: desc ? 'desc' : 'asc',
    contactId: values.contacto || undefined,
    status: values.estado || undefined,
  })

  const { contacts } = useContacts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const contactName = (id: string) => contacts.find((c) => c.id === id)?.displayName ?? '—'

  const statusChoices = [{ value: '', label: 'Todos' }, ...RECURRING_FREQUENT_STATUSES]
  // Si el estado activo salió del cajón, se muestra igualmente: si no, el usuario
  // vería la lista filtrada y ninguna ficha marcada.
  if (values.estado && !statusChoices.some((c) => c.value === values.estado)) {
    statusChoices.push({ value: values.estado, label: statusOf(values.estado).label })
  }

  const columns = column.columns([
    column.display({
      id: 'party',
      header: copy.party,
      meta: { card: 'title' },
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{contactName(row.original.contactId)}</p>
          {/* En la tarjeta el subtítulo va en su línea de contexto; `lg:block`
              lo deja solo para la tabla. */}
          <p className="text-muted-foreground hidden truncate text-xs lg:block">
            {row.original.subtitle}
          </p>
        </div>
      ),
    }),
    column.display({
      id: 'subtitle',
      header: 'Concepto',
      meta: { hideOnTable: true, card: 'meta' },
      cell: ({ row }) => row.original.subtitle,
    }),
    column.display({
      id: 'recurrence',
      header: 'Recurrencia',
      meta: { card: 'meta' },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {recurrenceLabels[row.original.recurrenceType] ?? row.original.recurrenceType} · día{' '}
          {row.original.dueDay}
        </span>
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
      cell: ({ row }) => formatAmount(row.original.agreedAmount, row.original.currency),
    }),
    column.display({
      id: 'chevron',
      header: '',
      meta: { hideOnStack: true },
      cell: () => <RowChevron />,
    }),
  ])

  const advancedCount = RECURRING_ADVANCED_KEYS.filter((k) => values[k]).length
  const hasFilters = Boolean(q) || RECURRING_FILTER_KEYS.some((k) => k !== 'pagina' && values[k])
  const clearAll = () => {
    setSearch('')
    clear()
  }

  const newButton = (
    <Button asChild size="sm" aria-label={copy.action}>
      <Link to={newTo}>
        <Plus aria-hidden className="size-4" />
        <span className="hidden sm:inline">{copy.action}</span>
      </Link>
    </Button>
  )

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} description={copy.description}>
        {canManage && newButton}
      </PageHeader>

      <SectionSwitch options={sections} />

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
              options: RECURRING_STATUSES.map((value) => ({
                value,
                label: statusOf(value).label,
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
            getRowId={(row) => row.id}
            onRowClick={(row) => navigate(detailTo(row.id))}
            rowIcon={() => ({ Icon: FileText })}
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
                <NoResults entity={copy.entity[1]} onClear={clearAll} />
              ) : (
                <EmptyState
                  Icon={FileText}
                  title={copy.emptyTitle}
                  description={copy.emptyDescription}
                  action={canManage && newButton}
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
        resultLabel={`Ver ${plural(total, copy.entity[0], copy.entity[1])}`}
      >
        <FilterField label="Estado" hint="Aquí están también los finalizados y cancelados.">
          <NativeSelect
            value={values.estado}
            onChange={(e) => filter({ estado: e.target.value })}
            aria-label="Estado"
          >
            <option value="">Todos los estados</option>
            {RECURRING_STATUSES.map((value) => (
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

        <FilterSortField choices={SORT_CHOICES} field={sortField} desc={desc} onChange={sortBy} />
      </FilterSheet>

      {/* Ficha, alta y edición en cajón: rutas hijas, la lista se queda detrás. */}
      <Outlet />
    </div>
  )
}
