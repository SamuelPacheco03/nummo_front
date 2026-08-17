import { useEffect, useMemo, useState } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { Link, Outlet, useNavigate } from 'react-router'
import { Building2, Plus, User, Users } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { StatusDot } from '@/components/ui/status-badge'
import { DataList, listColumns, RowChevron } from '@/components/ui/data-list'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts } from '@/features/organizations/roles'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import type {
  Contact,
  GetApiV1OrganizationsOrgIdContactsParams,
  GetApiV1OrganizationsOrgIdContactsSort,
} from '@/api/generated/model'
import { contactText, documentText } from './utils'
import { useContacts } from './hooks'

type TypeFilter = '' | 'PERSON' | 'COMPANY'
type ActiveFilter = '' | 'true' | 'false'
const PAGE_SIZE = 20

/** Columnas ordenables que acepta el endpoint (contrato: ListContactsQuery). */
const SORT_OPTIONS = [
  { field: 'name', label: 'Nombre' },
  { field: 'createdAt', label: 'Creación' },
]

const column = listColumns<Contact>()

function ContactIcon({ contact }: { contact: Contact }) {
  const Icon = contact.contactType === 'COMPANY' ? Building2 : User
  return <Icon className="size-4 shrink-0 text-muted-foreground" />
}

export function ContactsListPage() {
  const { orgId, role } = useCurrentOrg()
  const canEdit = canEditContacts(role)
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }])
  const [contactType, setContactType] = useState<TypeFilter>('')
  const [active, setActive] = useState<ActiveFilter>('true')
  const [page, setPage] = useState(1)

  // Cualquier cambio de criterio devuelve a la primera página.
  useEffect(() => {
    setPage(1)
  }, [q, contactType, active, sorting])

  const activeSort = sorting[0]
  const params: GetApiV1OrganizationsOrgIdContactsParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    contactType: contactType || undefined,
    isActive: active || undefined,
    sort: activeSort?.id as GetApiV1OrganizationsOrgIdContactsSort | undefined,
    order: activeSort?.desc ? 'desc' : 'asc',
  }
  const { contacts, total, totalPages, isPending, isError, error, isFetching } = useContacts(
    orgId,
    params,
  )

  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'name',
          header: 'Nombre',
          cell: ({ row }) => (
            <div className="flex min-w-0 items-center gap-2">
              <ContactIcon contact={row.original} />
              <span className="truncate font-medium">{row.original.displayName}</span>
            </div>
          ),
        }),
        column.display({
          id: 'document',
          header: 'Documento',
          cell: ({ row }) => (
            <span className="nums text-muted-foreground">{documentText(row.original)}</span>
          ),
        }),
        column.display({
          id: 'contact',
          header: 'Contacto',
          cell: ({ row }) => (
            <span className="text-muted-foreground">{contactText(row.original)}</span>
          ),
        }),
        column.display({
          id: 'status',
          header: 'Estado',
          cell: ({ row }) => <StatusDot active={row.original.isActive} inactiveLabel="Archivado" />,
        }),
        column.display({
          id: 'chevron',
          header: '',
          meta: { hideOnStack: true },
          cell: () => <RowChevron />,
        }),
      ]),
    [],
  )

  const hasFilters = Boolean(q) || contactType !== '' || active !== 'true'
  const clearFilters = () => {
    setSearch('')
    setContactType('')
    setActive('true')
  }

  return (
    <div>
      <PageHeader title="Contactos" description="Personas y empresas de la organización.">
        {canEdit && (
          <Button asChild size="sm">
            <Link to="/contactos/nuevo">
              <Plus className="size-4" />
              Nuevo contacto
            </Link>
          </Button>
        )}
      </PageHeader>

      {isError ? (
        <ErrorState error={error} fallback="No se pudieron cargar los contactos." />
      ) : (
        <>
          <DataList
            columns={columns}
            rows={contacts}
            getRowId={(c) => c.id}
            onRowClick={(c) => navigate(`/contactos/${c.id}`)}
            isLoading={isPending}
            emptyText={
              hasFilters ? (
                <NoResults entity="contactos" onClear={clearFilters} />
              ) : (
                <EmptyState
                  Icon={Users}
                  title="Todavía no tienes contactos"
                  description="Los contactos son las personas y empresas con las que tienes movimientos: quienes te pagan y quienes te cobran."
                  action={
                    canEdit && (
                      <Button size="sm" onClick={() => navigate('/contactos/nuevo')}>
                        <Plus className="size-4" />
                        Nuevo contacto
                      </Button>
                    )
                  }
                />
              )
            }
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Buscar por nombre, documento…',
            }}
            sort={{ value: sorting, onChange: setSorting, options: SORT_OPTIONS }}
            filters={
              <>
                <NativeSelect
                  className="w-40"
                  value={contactType}
                  onChange={(e) => setContactType(e.target.value as TypeFilter)}
                  aria-label="Tipo de contacto"
                >
                  <option value="">Todos los tipos</option>
                  <option value="PERSON">Personas</option>
                  <option value="COMPANY">Empresas</option>
                </NativeSelect>
                <NativeSelect
                  className="w-32"
                  value={active}
                  onChange={(e) => setActive(e.target.value as ActiveFilter)}
                  aria-label="Estado"
                >
                  <option value="true">Activos</option>
                  <option value="false">Archivados</option>
                  <option value="">Todos</option>
                </NativeSelect>
              </>
            }
          />

          {!isPending && total > 0 && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              isFetching={isFetching}
              onPage={setPage}
            />
          )}
        </>
      )}

      {/* Alta y edición en cajón: rutas hijas, la lista se queda detrás. */}
      <Outlet />
    </div>
  )
}
