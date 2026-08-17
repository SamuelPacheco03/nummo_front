import { useState } from 'react'
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from './hooks'
import { useOrgStore } from './org-store'
import { roleLabel } from './roles'
import { CreateOrgDialog } from './create-org-dialog'

export function OrgSwitcher() {
  const { organization, organizations, isLoading, hasNoOrgs } = useCurrentOrg()
  const setSelectedOrgId = useOrgStore((s) => s.setSelectedOrgId)
  const [createOpen, setCreateOpen] = useState(false)

  if (isLoading) return <Skeleton className="h-8 w-36" />

  if (hasNoOrgs) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Crear organización
        </Button>
        <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            // Hereda el color de su superficie: se monta en el sidebar (oscuro)
            // y en la cabecera de móvil (clara), así que no puede fijar ninguno.
            className="h-auto w-full justify-between gap-2 border border-current/15 bg-current/[0.04] px-3 py-2 text-current hover:bg-current/10 hover:text-current"
          >
            <Building2 className="size-4 shrink-0 opacity-60" />
            <span className="truncate font-medium">{organization?.name}</span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Organizaciones
          </DropdownMenuLabel>
          {organizations.map((o) => (
            <DropdownMenuItem
              key={o.organization.id}
              onSelect={() => setSelectedOrgId(o.organization.id)}
              className="gap-2"
            >
              <Building2 className="size-4" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate">{o.organization.name}</span>
                <span className="truncate text-xs text-muted-foreground">{roleLabel(o.role)}</span>
              </div>
              {o.organization.id === organization?.id && <Check className="ml-auto size-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Crear organización
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
