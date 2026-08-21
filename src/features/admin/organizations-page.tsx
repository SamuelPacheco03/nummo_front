import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { Building2 } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { PlatformPage } from './platform-page'
import { Pagination } from '@/components/pagination'
import { DataList, RowChevron } from '@/components/ui/data-list'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { FilterField, FilterSheet } from '@/components/ui/filter-sheet'
import { listColumns } from '@/components/ui/list-columns'
import { ListToolbar } from '@/components/ui/list-toolbar'
import { NativeSelect } from '@/components/ui/native-select'
import { StatusBadge } from '@/components/ui/status-badge'
import { orgStatus } from '@/features/organizations/labels'
import { planLabel } from '@/features/platform/labels'
import { formatDateHuman } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useKeepFilters, useListFilters } from '@/lib/use-list-filters'
import type {
  AdminOrganizationDto,
  GetApiV1AdminOrganizationsParams,
} from '@/api/generated/model'
import { useAdminOrganizations } from './hooks'

/** Diez, como el resto de listados. */
const PAGE_SIZE = 10

/** Criterios que viven en la URL, en español como las rutas (§87.5). */
const FILTER_KEYS = ['plan', 'estado', 'pagina'] as const
type FilterKey = (typeof FILTER_KEYS)[number]

const PLAN_CHOICES = [
  { value: '', label: 'Todos' },
  { value: 'FREE', label: 'Free' },
  { value: 'BASIC', label: 'Básico' },
  { value: 'PRO', label: 'Pro' },
  { value: 'ENTERPRISE', label: 'Empresa' },
]

const STATUS_CHOICES = [
  { value: '', label: 'Todos los estados' },
  { value: 'ACTIVE', label: 'Activas' },
  { value: 'SUSPENDED', label: 'Suspendidas' },
  { value: 'ARCHIVED', label: 'Archivadas' },
]

const column = listColumns<AdminOrganizationDto>()

const columns = column.columns([
  column.display({
    id: 'name',
    header: 'Organización',
    meta: { card: 'title' },
    cell: ({ row }) => <span className="truncate font-medium">{row.original.name}</span>,
  }),
  column.display({
    id: 'plan',
    header: 'Plan',
    meta: { card: 'meta' },
    cell: ({ row }) => planLabel(row.original.planCode),
  }),
  column.display({
    id: 'status',
    header: 'Estado',
    meta: { card: 'status' },
    cell: ({ row }) => <StatusBadge {...orgStatus(row.original.status)} />,
  }),
  column.display({
    id: 'members',
    header: 'Miembros',
    meta: { align: 'right', label: 'Miembros' },
    cell: ({ row }) => <span className="nums">{row.original.members}</span>,
  }),
  column.display({
    id: 'contacts',
    header: 'Contactos',
    meta: { align: 'right', card: 'amount' },
    cell: ({ row }) => <span className="nums">{row.original.contacts.toLocaleString('es-CO')}</span>,
  }),
  /*
    Consumo del período en una sola columna: los dos contadores se leen juntos
    —«¿esta organización está usando la IA?»— y por separado serían dos columnas
    estrechas de números sin contexto.
  */
  column.display({
    id: 'usage',
    header: 'Numi · voz',
    meta: { align: 'right', label: 'Consumo del mes' },
    cell: ({ row }) => (
      <span className="nums text-muted-foreground">
        {row.original.usage.ai_messages_monthly ?? 0} · {row.original.usage.voice_minutes_monthly ?? 0} min
      </span>
    ),
  }),
  column.display({
    id: 'createdAt',
    header: 'Creada',
    meta: { hideOnStack: true },
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDateHuman(row.original.createdAt)}</span>
    ),
  }),
  column.display({
    id: 'chevron',
    header: '',
    meta: { hideOnStack: true },
    cell: () => <RowChevron />,
  }),
])

/**
 * **Todas las organizaciones de Nummo**, con su plan y su consumo del período.
 *
 * El endpoint no acepta `sort`, así que la lista no ofrece orden: una cabecera
 * clicable que reordenara solo la página visible daría un orden global falso
 * (§21.1).
 *
 * La ficha cuelga de aquí como ruta hija y abre en cajón sobre la lista, igual
 * que en el resto de la app (§87.5).
 */
export function AdminOrganizationsPage() {
  const navigate = useNavigate()
  const { values, set, clear } = useListFilters<FilterKey>('nummo:plataforma:orgs', FILTER_KEYS)
  const keepFilters = useKeepFilters()
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sheetOpen, setSheetOpen] = useState(false)

  const page = Number(values.pagina) || 1
  const filter = (patch: Partial<Record<FilterKey, string>>) => set({ ...patch, pagina: '' })

  const params: GetApiV1AdminOrganizationsParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    planCode: (values.plan || undefined) as GetApiV1AdminOrganizationsParams['planCode'],
    status: (values.estado || undefined) as GetApiV1AdminOrganizationsParams['status'],
  }
  const { organizations, total, totalPages, isPending, isError, error } =
    useAdminOrganizations(params)

  const hasFilters = Boolean(q) || Boolean(values.plan) || Boolean(values.estado)
  const clearAll = () => {
    setSearch('')
    clear()
  }

  return (
    <PlatformPage>
      <PageHeader
        title="Organizaciones"
        description="Todas las de la plataforma, con su plan, su estado y lo que llevan consumido."
      />

      {isError ? (
        <ErrorState error={error} fallback="No se pudieron cargar las organizaciones." />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Buscar por nombre…"
            main={{
              label: 'Plan',
              allLabel: 'Todos los planes',
              choices: PLAN_CHOICES,
              value: values.plan,
              onChange: (plan) => filter({ plan }),
            }}
            filterCount={values.estado ? 1 : 0}
            onOpenFilters={() => setSheetOpen(true)}
          />

          <DataList
            columns={columns}
            rows={organizations}
            getRowId={(o) => o.id}
            // Con los criterios puestos: la lista se queda montada detrás del
            // cajón y sin ellos volvería a «Todas» (§21.1).
            onRowClick={(o) => navigate(keepFilters(`/plataforma/organizaciones/${o.id}`))}
            isLoading={isPending}
            skeletonRows={PAGE_SIZE}
            emptyText={
              hasFilters ? (
                <NoResults entity="organizaciones" onClear={clearAll} />
              ) : (
                <EmptyState
                  Icon={Building2}
                  title="Todavía no hay organizaciones"
                  description="Aparecerán aquí en cuanto alguien cree la suya."
                />
              )
            }
          />

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            totalPages={totalPages}
            onPage={(next) => set({ pagina: String(next) })}
          />
        </>
      )}

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onClear={clearAll}
        canClear={hasFilters}
        resultLabel={`${total} ${total === 1 ? 'organización' : 'organizaciones'}`}
      >
        <FilterField label="Estado">
          <NativeSelect
            value={values.estado}
            onChange={(e) => filter({ estado: e.target.value })}
          >
            {STATUS_CHOICES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
      </FilterSheet>

      {/* La ficha, como ruta hija: la lista sigue montada detrás del cajón. */}
      <Outlet />
    </PlatformPage>
  )
}