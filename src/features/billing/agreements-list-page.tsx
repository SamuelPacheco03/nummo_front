import { useMemo, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { FileText, Plus } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { DataList, RowChevron } from '@/components/ui/data-list'
import {
  FilterField,
  FilterSheet,
  FilterSortField,
  type SortChoice,
} from '@/components/ui/filter-sheet'
import { listColumns } from '@/components/ui/list-columns'
import { ListToolbar } from '@/components/ui/list-toolbar'
import { NativeSelect } from '@/components/ui/native-select'
import { StatusBadge } from '@/components/ui/status-badge'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { useContacts } from '@/features/contacts/hooks'
import { useBillingConcepts } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageAgreements } from '@/features/organizations/roles'
import { formatAmount, plural } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useListFilters } from '@/lib/use-list-filters'
import type {
  BillingAgreement,
  GetApiV1OrganizationsOrgIdBillingAgreementsParams,
  GetApiV1OrganizationsOrgIdBillingAgreementsSort,
} from '@/api/generated/model'
import { RECURRENCE_LABELS, agreementStatus } from './labels'
import { useAgreements } from './hooks'

/** Diez, como el resto de listados. */
const PAGE_SIZE = 10

/** Criterios que viven en la URL, en español como las rutas (§87.5). */
const FILTER_KEYS = ['estado', 'orden', 'dir', 'pagina'] as const
type FilterKey = (typeof FILTER_KEYS)[number]

/** Todos los del contrato, para el desplegable. */
const STATUSES = ['ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED']

/**
 * Solo los del trabajo diario van a la vista. Un acuerdo finalizado o cancelado
 * es consulta ocasional —como una cuenta ya pagada— y vive en el cajón: sacarlo
 * de aquí es lo que deja las fichas en una línea en vez de dejar una suelta
 * abajo (§21).
 */
const FREQUENT_STATUSES = [
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'PAUSED', label: 'Pausados' },
]

/** Columnas ordenables que acepta el endpoint (contrato: NamedListQuery). */
const SORT_CHOICES: SortChoice[] = [
  { field: 'createdAt', label: 'Creación', asc: 'Más antiguos', desc: 'Más recientes' },
  { field: 'name', label: 'Nombre', asc: 'De la A a la Z', desc: 'De la Z a la A' },
]

const DEFAULT_SORT = 'createdAt'

const column = listColumns<BillingAgreement>()

/**
 * Listado de acuerdos, con el mismo patrón de filtros que el resto (§21.1).
 *
 * **Sin cifras de cabecera:** el contrato no publica un resumen de acuerdos, y
 * sumar los de la página visible daría un número que el backend no firma (§70).
 *
 * El cajón guarda los estados de archivo y el orden. El contador del botón se
 * queda en cero a propósito: el estado se ve siempre —en fichas o en el
 * desplegable—, así que no hay filtro fantasma que avisar.
 */
export function AgreementsListPage() {
  const { orgId, role } = useCurrentOrg()
  const canManage = canManageAgreements(role)
  const navigate = useNavigate()

  const { values, set, clear } = useListFilters<FilterKey>('nummo:acuerdos:filtros', FILTER_KEYS)
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sheetOpen, setSheetOpen] = useState(false)

  const page = Number(values.pagina) || 1
  const sortField = values.orden || DEFAULT_SORT
  // Lo último creado primero: se calla `desc` en la URL y se escribe `asc`.
  const desc = values.dir !== 'asc'

  /** Cambiar cualquier criterio devuelve a la primera página. */
  const filter = (patch: Partial<Record<FilterKey, string>>) => set({ ...patch, pagina: '' })

  const sortBy = (field: string, descending: boolean) =>
    filter({ orden: field === DEFAULT_SORT ? '' : field, dir: descending ? '' : 'asc' })

  const params: GetApiV1OrganizationsOrgIdBillingAgreementsParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    status: (values.estado ||
      undefined) as GetApiV1OrganizationsOrgIdBillingAgreementsParams['status'],
    sort: sortField as GetApiV1OrganizationsOrgIdBillingAgreementsSort,
    order: desc ? 'desc' : 'asc',
  }
  const { items, total, totalPages, isPending, isError, error, isFetching } = useAgreements(
    orgId,
    params,
  )

  // El API devuelve ids; resolvemos nombres con mapas (suficiente para el catálogo
  // de una org; a gran escala el backend debería denormalizar en el listado).
  const { contacts } = useContacts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const { items: concepts } = useBillingConcepts(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'name',
    order: 'asc',
  })
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c.displayName])), [contacts])
  const conceptMap = useMemo(() => new Map(concepts.map((c) => [c.id, c.name])), [concepts])

  const statusChoices = [{ value: '', label: 'Todos' }, ...FREQUENT_STATUSES]
  // Si el estado activo salió del cajón, se muestra igualmente: si no, el usuario
  // vería la lista filtrada y ninguna ficha marcada.
  if (values.estado && !statusChoices.some((c) => c.value === values.estado)) {
    statusChoices.push({ value: values.estado, label: agreementStatus(values.estado).label })
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
                {row.original.name ?? conceptMap.get(row.original.billingConceptId) ?? '—'}
              </p>
            </div>
          ),
        }),
        column.display({
          id: 'recurrence',
          header: 'Recurrencia',
          cell: ({ row }) => (
            <span className="text-muted-foreground">
              {RECURRENCE_LABELS[row.original.recurrenceType] ?? row.original.recurrenceType} · día{' '}
              {row.original.dueDay}
            </span>
          ),
        }),
        column.display({
          id: 'status',
          header: 'Estado',
          cell: ({ row }) => <StatusBadge {...agreementStatus(row.original.status)} />,
        }),
        column.display({
          id: 'amount',
          header: 'Monto',
          meta: { align: 'right' },
          cell: ({ row }) => formatAmount(row.original.agreedAmount, row.original.currency),
        }),
        column.display({
          id: 'chevron',
          header: '',
          meta: { hideOnStack: true },
          cell: () => <RowChevron />,
        }),
      ]),
    [contactMap, conceptMap],
  )

  const hasFilters = Boolean(q) || FILTER_KEYS.some((k) => k !== 'pagina' && values[k])
  const clearAll = () => {
    setSearch('')
    clear()
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Acuerdos" description="Cobros recurrentes por concepto y pagador.">
        {canManage && (
          <Button asChild size="sm" aria-label="Nuevo acuerdo">
            <Link to="/cartera/acuerdos/nuevo">
              <Plus aria-hidden className="size-4" />
              <span className="hidden sm:inline">Nuevo acuerdo</span>
            </Link>
          </Button>
        )}
      </PageHeader>

      {isError ? (
        <ErrorState error={error} fallback="No se pudieron cargar los acuerdos." />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Buscar acuerdo…"
            main={{
              label: 'Estado',
              allLabel: 'Todos los estados',
              choices: statusChoices,
              options: STATUSES.map((value) => ({
                value,
                label: agreementStatus(value).label,
              })),
              value: values.estado,
              onChange: (estado) => filter({ estado }),
            }}
            // El estado ya está a la vista: el cajón solo guarda el orden, así
            // que nunca lleva contador.
            filterCount={0}
            onOpenFilters={() => setSheetOpen(true)}
          />

          <DataList
            columns={columns}
            rows={items}
            getRowId={(a) => a.id}
            onRowClick={(a) => navigate(`/cartera/acuerdos/${a.id}`)}
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
                <NoResults entity="acuerdos" onClear={clearAll} />
              ) : (
                <EmptyState
                  Icon={FileText}
                  title="Todavía no tienes acuerdos"
                  description="Un acuerdo es una plantilla de cobro recurrente: Nummo genera solo la cuenta por cobrar de cada período."
                  action={
                    canManage && (
                      <Button asChild size="sm">
                        <Link to="/cartera/acuerdos/nuevo">
                          <Plus className="size-4" />
                          Nuevo acuerdo
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
        resultLabel={`Ver ${plural(total, 'acuerdo', 'acuerdos')}`}
      >
        <FilterField label="Estado">
          <NativeSelect
            value={values.estado}
            onChange={(e) => filter({ estado: e.target.value })}
            aria-label="Estado"
          >
            <option value="">Todos los estados</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {agreementStatus(value).label}
              </option>
            ))}
          </NativeSelect>
        </FilterField>

        <FilterSortField choices={SORT_CHOICES} field={sortField} desc={desc} onChange={sortBy} />
      </FilterSheet>

      {/* Alta y edición en cajón: rutas hijas, la lista se queda detrás. */}
      <Outlet />
    </div>
  )
}
