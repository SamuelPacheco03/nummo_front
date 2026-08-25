import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CustomRole } from '@/api/generated/model'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { toastApiError } from '@/features/platform/errors'
import { useCan, useFeature } from '@/features/platform/permissions'
import { groupPermissions } from '@/features/platform/permission-labels'
import { plural } from '@/lib/format'
import { useCustomRoles, useDeleteCustomRole } from './hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'

/**
 * **Las áreas que toca un rol**, no sus recursos.
 *
 * Con recursos salían siete etiquetas que se desbordaban a dos renglones y había
 * que leerlas todas para saber de qué iba el rol. Las áreas son tres o cuatro y
 * responden la pregunta de un vistazo: «lleva la cartera», «solo mira».
 */
function roleAreas(role: CustomRole): string[] {
  return groupPermissions(role.permissions).map((group) => group.area)
}

/**
 * Una ficha por rol: el nombre manda, y debajo lo que hace y a quién alcanza.
 *
 * Las áreas van en fichas y no en una línea unida por `·`: siete nombres
 * seguidos se desbordan y se leen como un párrafo, no como una lista de sitios.
 */
function RoleCard({
  role,
  canManage,
  onEdit,
  onArchive,
}: {
  role: CustomRole
  canManage: boolean
  onEdit: () => void
  onArchive: () => void
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="space-y-2 px-4 py-3.5 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium">{role.name}</h3>
              {/*
                Un rol que no lleva nadie no se lee igual que uno con tres: es el
                que se puede archivar sin mover a nadie antes.
              */}
              {role.membersCount > 0 ? (
                <Badge variant="secondary">
                  {plural(role.membersCount, 'miembro', 'miembros')}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-xs">Sin miembros</span>
              )}
            </div>
            {role.description && (
              <p className="text-muted-foreground text-sm">{role.description}</p>
            )}
          </div>

          {canManage && (
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" aria-label={`Editar ${role.name}`} onClick={onEdit}>
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Archivar ${role.name}`}
                onClick={onArchive}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <KeyRound aria-hidden className="size-3.5" />
            {plural(role.permissions.length, 'permiso', 'permisos')}
          </span>
          <span className="bg-border h-3 w-px" aria-hidden />
          {roleAreas(role).map((area) => (
            <span
              key={area}
              className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs"
            >
              {area}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * **Los roles propios de la organización.**
 *
 * Un rol propio **reemplaza** los permisos del rol base, no se suma a ellos:
 * «qué puede hacer esta persona» tiene que tener una sola respuesta. El rol base
 * se conserva como etiqueta —y es lo que sigue contando propietarios activos—,
 * así que un miembro tiene rol y, opcionalmente, rol propio.
 *
 * **Leerlos no se vende con el plan; escribirlos sí.** Quien baja de plan
 * conserva los que definió y sus miembros siguen trabajando: se bloquea crear,
 * nunca se borra. Por eso la lista se enseña igual y lo que desaparece es el
 * botón.
 */
export function RolesPage() {
  const { orgId } = useCurrentOrg()
  const { roles, isPending, isError, error } = useCustomRoles(orgId)
  const can = useCan()
  const hasFeature = useFeature('custom_roles')
  const canManage = can('organization.roles.manage')
  const canCreate = canManage && hasFeature

  const remove = useDeleteCustomRole(orgId ?? '')
  const [deleting, setDeleting] = useState<CustomRole | null>(null)
  const navigate = useNavigate()

  const onDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync({ orgId: orgId ?? '', roleId: deleting.id })
      toast.success('Rol archivado')
      setDeleting(null)
    } catch (err) {
      // El backend rechaza archivar un rol que todavía tiene miembros, y lo dice.
      toastApiError(err, 'No se pudo archivar el rol')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles"
        description="Paquetes de permisos propios de esta organización, además de los cinco de siempre."
      >
        {canCreate && (
          <Button size="sm" onClick={() => navigate('/config/roles/nuevo')} aria-label="Nuevo rol">
            <Plus aria-hidden className="size-4" />
            <span className="hidden sm:inline">Nuevo rol</span>
          </Button>
        )}
      </PageHeader>

      {canManage && !hasFeature && (
        <Note tone="info" title="Crear roles propios es de un plan superior">
          Los que ya tienes siguen funcionando y tu equipo trabaja igual. Con este plan no
          puedes crear más, pero no se borra ninguno.{' '}
          <Link className="underline underline-offset-4" to="/config/plan">
            Mira los planes
          </Link>
          .
        </Note>
      )}

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isError ? (
        <ErrorState error={error} fallback="No se pudieron cargar los roles." />
      ) : roles.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              Icon={KeyRound}
              title="Todavía no hay roles propios"
              description="Los cinco de siempre —propietario, administrador, contador, operador y lector— siguen disponibles. Un rol propio sirve cuando ninguno encaja: «solo registra pagos», «ve la cartera y nada más»."
              action={
                canCreate ? (
                  <Button size="sm" variant="outline" onClick={() => navigate('/config/roles/nuevo')}>
                    <Plus aria-hidden className="size-4" />
                    Crear el primero
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              canManage={canCreate}
              onEdit={() => navigate(`/config/roles/${role.id}`)}
              onArchive={() => setDeleting(role)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Archivar ${deleting?.name ?? 'el rol'}`}
        description="Deja de poder asignarse. Si todavía lo lleva alguien, hay que moverlo antes."
        confirmLabel="Archivar"
        destructive
        loading={remove.isPending}
        onConfirm={() => void onDelete()}
      />

      {/* El editor cuelga de aquí y abre en cajón sobre la lista (§87.5). */}
      <Outlet />
    </div>
  )
}
