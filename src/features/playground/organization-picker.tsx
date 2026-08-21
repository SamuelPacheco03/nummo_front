import { useState } from 'react'
import { Building2, ChevronDown } from 'lucide-react'
import { SearchInput } from '@/components/search-input'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { orgStatus } from '@/features/organizations/labels'
import { planLabel } from '@/features/platform/labels'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'
import type { PlaygroundOrganization } from '@/api/generated/model'
import { usePlaygroundOrganizations } from './hooks'

/** Cuántas caben en el cajón sin convertirlo en un listado paginado. */
const PAGE_SIZE = 20

/**
 * **Contra qué organización se prueba.**
 *
 * Es un buscador y no un desplegable porque la plataforma tiene todas las organizaciones
 * de Nummo: un `<select>` con cuatrocientas no se recorre, se sufre.
 *
 * Cada fila dice si la organización **admite escribir**. Una suspendida sigue siendo
 * probable —leer se puede— y esconderla obligaría a adivinar por qué no aparece; lo que
 * se marca es que ahí el modo de escritura no va a estar disponible.
 */
export function OrganizationPicker({
  organization,
  isLoading = false,
  onSelect,
}: {
  /** La elegida, tal como la describe `/context`. Sin ella, el botón invita a elegir. */
  organization: PlaygroundOrganization | undefined
  isLoading?: boolean
  onSelect: (organization: PlaygroundOrganization) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const { organizations, total, isPending, isError, error } = usePlaygroundOrganizations({
    page: 1,
    pageSize: PAGE_SIZE,
    q: q || undefined,
  })

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'border-input bg-background hover:bg-accent flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
          'pointer-coarse:min-h-11',
        )}
      >
        <Building2 aria-hidden className="text-muted-foreground size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          {isLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : organization ? (
            <>
              <span className="block truncate font-medium">{organization.name}</span>
              <span className="text-muted-foreground block truncate text-xs">
                {planLabel(organization.planCode)} ·{' '}
                {organization.writable ? 'Admite escribir' : 'Solo lectura'}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Elige una organización…</span>
          )}
        </span>
        <ChevronDown aria-hidden className="text-muted-foreground size-4 shrink-0" />
      </button>

      <Drawer open={open} onOpenChange={setOpen} title="Organización">
        <div className="space-y-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre…" />

          {isError ? (
            <ErrorState error={error} fallback="No se pudieron cargar las organizaciones." />
          ) : isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : organizations.length === 0 ? (
            q ? (
              <NoResults entity="organizaciones" onClear={() => setSearch('')} />
            ) : (
              <EmptyState
                Icon={Building2}
                title="Todavía no hay organizaciones"
                description="Aparecerán aquí en cuanto alguien cree la suya."
              />
            )
          ) : (
            <>
              <ul className="divide-y rounded-lg border">
                {organizations.map((org) => (
                  <li key={org.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(org)
                        setOpen(false)
                      }}
                      className={cn(
                        'hover:bg-accent flex w-full items-center gap-3 px-3.5 py-3 text-left text-sm transition-colors',
                        'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                        org.id === organization?.id && 'bg-secondary',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{org.name}</span>
                        <span className="text-muted-foreground block text-xs">
                          {planLabel(org.planCode)} · {org.members}{' '}
                          {org.members === 1 ? 'miembro' : 'miembros'}
                        </span>
                      </span>
                      <StatusBadge {...orgStatus(org.status)} />
                    </button>
                  </li>
                ))}
              </ul>

              {total > organizations.length && (
                <p className="text-muted-foreground text-xs">
                  Se muestran {organizations.length} de {total}. Afina la búsqueda para ver el
                  resto.
                </p>
              )}
            </>
          )}
        </div>
      </Drawer>
    </>
  )
}
