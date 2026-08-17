import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { Building2, Plus, User, Users } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { StatusDot } from '@/components/ui/status-badge'
import { DataList, RowChevron } from '@/components/ui/data-list'
import { listColumns } from '@/components/ui/list-columns'
import { ListToolbar } from '@/components/ui/list-toolbar'
import {
  FilterField,
  FilterSheet,
  FilterSortField,
  type SortChoice,
} from '@/components/ui/filter-sheet'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts } from '@/features/organizations/roles'
import { initials, plural } from '@/lib/format'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useListFilters } from '@/lib/use-list-filters'
import type {
  Contact,
  GetApiV1OrganizationsOrgIdContactsParams,
  GetApiV1OrganizationsOrgIdContactsSort,
} from '@/api/generated/model'
import { contactText, documentText } from './utils'
import { useContacts } from './hooks'

/** Diez, como el resto de listados. */
const PAGE_SIZE = 10

/** Criterios que viven en la URL, en español como las rutas (§87.5). */
const FILTER_KEYS = ['tipo', 'estado', 'orden', 'dir', 'pagina'] as const
type FilterKey = (typeof FILTER_KEYS)[number]

/** Los que cuentan para el contador del botón «Filtros». */
const ADVANCED_KEYS: FilterKey[] = ['estado']

const TYPE_CHOICES = [
  { value: '', label: 'Todos' },
  { value: 'PERSON', label: 'Personas' },
  { value: 'COMPANY', label: 'Empresas' },
]

/**
 * Qué contactos se ven. El vacío es «solo activos», que es lo que se quiere el
 * 99 % de las veces; archivar existe justo para quitarlos de en medio.
 */
const VISIBILITY = [
  { value: '', label: 'Solo activos', isActive: 'true' as const },
  { value: 'archivados', label: 'Solo archivados', isActive: 'false' as const },
  { value: 'todos', label: 'Activos y archivados', isActive: undefined },
]

/** Columnas ordenables que acepta el endpoint (contrato: ListContactsQuery). */
const SORT_CHOICES: SortChoice[] = [
  { field: 'name', label: 'Nombre', asc: 'De la A a la Z', desc: 'De la Z a la A' },
  { field: 'createdAt', label: 'Creación', asc: 'Más antiguos', desc: 'Más recientes' },
]

const DEFAULT_SORT = 'name'

const column = listColumns<Contact>()

function ContactIcon({ contact }: { contact: Contact }) {
  const Icon = contact.contactType === 'COMPANY' ? Building2 : User
  return <Icon className="text-muted-foreground size-4 shrink-0" />
}

const columns = column.columns([
  column.display({
    id: 'name',
    header: 'Nombre',
    meta: { card: 'title' },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2">
        {/* En la tarjeta el icono ya está a la izquierda, con las iniciales:
            aquí sería el mismo dato dos veces. */}
        <span className="hidden lg:inline-flex">
          <ContactIcon contact={row.original} />
        </span>
        <span className="truncate font-medium">{row.original.displayName}</span>
      </div>
    ),
  }),
  column.display({
    id: 'document',
    header: 'Documento',
    meta: { hideOnStack: true },
    cell: ({ row }) => (
      <span className="nums text-muted-foreground">{documentText(row.original)}</span>
    ),
  }),
  column.display({
    id: 'contact',
    header: 'Contacto',
    meta: { hideOnStack: true },
    cell: ({ row }) => <span className="text-muted-foreground">{contactText(row.original)}</span>,
  }),
  /*
    En la tabla, documento y contacto son dos columnas y un «—» mantiene la
    rejilla legible. En la línea de la tarjeta ese mismo «—» se lee como un dato
    que no existe: aquí se unen y lo vacío se cae, así que un contacto sin
    documento no arrastra un guion ni un separador suelto.
  */
  column.display({
    id: 'summary',
    header: 'Contacto',
    meta: { hideOnTable: true, card: 'meta' },
    cell: ({ row }) =>
      [documentText(row.original), contactText(row.original)]
        .filter((part) => part && part !== '—')
        .join(' · ') || 'Sin datos de contacto',
  }),
  column.display({
    id: 'status',
    header: 'Estado',
    meta: { card: 'status' },
    cell: ({ row }) => <StatusDot active={row.original.isActive} inactiveLabel="Archivado" />,
  }),
  column.display({
    id: 'chevron',
    header: '',
    meta: { hideOnStack: true },
    cell: () => <RowChevron />,
  }),
])

/**
 * Listado de contactos, con el mismo patrón de filtros que el resto (§21.1):
 * criterios en la URL, tipo a la vista y lo demás en el cajón.
 *
 * **Sin cifras de cabecera**, y no por olvido: el contrato no publica un resumen
 * de contactos, y contar los de la página visible daría un número que el backend
 * no firma (§70). Un KPI que miente es peor que ninguno.
 */
export function ContactsListPage() {
  const { orgId, role } = useCurrentOrg()
  const canEdit = canEditContacts(role)
  const navigate = useNavigate()

  const { values, set, clear } = useListFilters<FilterKey>('nummo:contactos:filtros', FILTER_KEYS)
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sheetOpen, setSheetOpen] = useState(false)

  const page = Number(values.pagina) || 1
  const sortField = values.orden || DEFAULT_SORT
  const desc = values.dir === 'desc'

  /** Cambiar cualquier criterio devuelve a la primera página. */
  const filter = (patch: Partial<Record<FilterKey, string>>) => set({ ...patch, pagina: '' })

  /** El orden por defecto se calla en la URL: solo estorba al compartirla. */
  const sortBy = (field: string, descending: boolean) =>
    filter({ orden: field === DEFAULT_SORT ? '' : field, dir: descending ? 'desc' : '' })

  const visibility = VISIBILITY.find((v) => v.value === values.estado) ?? VISIBILITY[0]

  const params: GetApiV1OrganizationsOrgIdContactsParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    contactType: (values.tipo ||
      undefined) as GetApiV1OrganizationsOrgIdContactsParams['contactType'],
    isActive: visibility.isActive,
    sort: sortField as GetApiV1OrganizationsOrgIdContactsSort,
    order: desc ? 'desc' : 'asc',
  }
  const { contacts, total, totalPages, isPending, isError, error, isFetching } = useContacts(
    orgId,
    params,
  )

  const advancedCount = ADVANCED_KEYS.filter((k) => values[k]).length
  const hasFilters = Boolean(q) || FILTER_KEYS.some((k) => k !== 'pagina' && values[k])
  const clearAll = () => {
    setSearch('')
    clear()
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Contactos" description="Personas y empresas de la organización.">
        {canEdit && (
          <Button asChild size="sm" aria-label="Nuevo contacto">
            <Link to="/contactos/nuevo">
              <Plus aria-hidden className="size-4" />
              <span className="hidden sm:inline">Nuevo contacto</span>
            </Link>
          </Button>
        )}
      </PageHeader>

      {isError ? (
        <ErrorState error={error} fallback="No se pudieron cargar los contactos." />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Buscar por nombre, documento…"
            main={{
              label: 'Tipo',
              allLabel: 'Todos los tipos',
              choices: TYPE_CHOICES,
              value: values.tipo,
              onChange: (tipo) => filter({ tipo }),
            }}
            filterCount={advancedCount}
            onOpenFilters={() => setSheetOpen(true)}
          />

          <DataList
            columns={columns}
            rows={contacts}
            getRowId={(c) => c.id}
            onRowClick={(c) => navigate(`/contactos/${c.id}`)}
            // Una persona se reconoce por su nombre, no por un icono de persona.
            rowIcon={(c) => ({ initials: initials(c.displayName), shape: 'round' })}
            sort={{
              value: [{ id: sortField, desc }],
              onChange: (next) => sortBy(next[0]?.id ?? DEFAULT_SORT, Boolean(next[0]?.desc)),
              options: SORT_CHOICES.map(({ field, label }) => ({ field, label })),
              // El orden ya vive en el cajón, que es la única vía en móvil.
              showSortControl: false,
            }}
            isLoading={isPending}
            skeletonRows={PAGE_SIZE}
            emptyText={
              hasFilters ? (
                <NoResults entity="contactos" onClear={clearAll} />
              ) : (
                <EmptyState
                  Icon={Users}
                  title="Todavía no tienes contactos"
                  description="Los contactos son las personas y empresas con las que tienes movimientos: quienes te pagan y quienes te cobran."
                  action={
                    canEdit && (
                      <Button asChild size="sm">
                        <Link to="/contactos/nuevo">
                          <Plus className="size-4" />
                          Nuevo contacto
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
        resultLabel={`Ver ${plural(total, 'contacto', 'contactos')}`}
      >
        <FilterField label="Tipo">
          <NativeSelect
            value={values.tipo}
            onChange={(e) => filter({ tipo: e.target.value })}
            aria-label="Tipo"
          >
            {TYPE_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.value ? choice.label : 'Todos los tipos'}
              </option>
            ))}
          </NativeSelect>
        </FilterField>

        <FilterField label="Archivados" hint="Archivar un contacto lo saca de las listas.">
          <NativeSelect
            value={values.estado}
            onChange={(e) => filter({ estado: e.target.value })}
            aria-label="Archivados"
          >
            {VISIBILITY.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
