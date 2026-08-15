import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Building2, ChevronRight, Plus, User } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Pagination } from '@/components/pagination'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusDot } from '@/components/ui/status-dot'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import type { Contact, GetApiV1OrganizationsOrgIdContactsParams } from '@/api/generated/model'
import { contactText, documentText } from './utils'
import { useContacts } from './hooks'

type TypeFilter = '' | 'PERSON' | 'COMPANY'
type ActiveFilter = '' | 'true' | 'false'
const PAGE_SIZE = 20

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
  const [contactType, setContactType] = useState<TypeFilter>('')
  const [active, setActive] = useState<ActiveFilter>('true')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [q, contactType, active])

  const params: GetApiV1OrganizationsOrgIdContactsParams = {
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    contactType: contactType || undefined,
    isActive: active || undefined,
    sort: 'name',
    order: 'asc',
  }
  const { contacts, total, totalPages, isPending, isError, error, isFetching } = useContacts(
    orgId,
    params,
  )

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

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, documento…"
          className="sm:max-w-xs"
        />
        <div className="flex gap-2 sm:ml-auto">
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
        </div>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {getErrorMessage(error, 'No se pudieron cargar los contactos.')}
        </div>
      ) : (
        <>
          {/* Desktop: tabla densa */}
          <div className="hidden rounded-lg border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      No hay contactos con estos filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/contactos/${c.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ContactIcon contact={c} />
                          <span className="font-medium">{c.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="nums text-muted-foreground">{documentText(c)}</TableCell>
                      <TableCell className="text-muted-foreground">{contactText(c)}</TableCell>
                      <TableCell>
                        <StatusDot active={c.isActive} inactiveLabel="Archivado" />
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Móvil: cards */}
          <div className="space-y-2 md:hidden">
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : contacts.length === 0 ? (
              <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                No hay contactos con estos filtros.
              </div>
            ) : (
              contacts.map((c) => (
                <Link
                  key={c.id}
                  to={`/contactos/${c.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3"
                >
                  <ContactIcon contact={c} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.displayName}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {documentText(c)} · {contactText(c)}
                    </div>
                  </div>
                  <StatusDot active={c.isActive} activeLabel="" inactiveLabel="" />
                </Link>
              ))
            )}
          </div>

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
    </div>
  )
}
