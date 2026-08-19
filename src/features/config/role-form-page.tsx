import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DetailDrawer } from '@/components/ui/detail-drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { toastApiError } from '@/features/platform/errors'
import { groupPermissions, permissionAction } from '@/features/platform/permission-labels'
import { ALL_PERMISSIONS, type Permission } from '@/features/platform/permissions'
import { getErrorMessage } from '@/lib/errors'
import { useHydrateOnce } from '@/lib/use-hydrate-once'
import { plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCreateCustomRole, useCustomRole, useUpdateCustomRole } from './hooks'

const LIST = '/config/roles'

/**
 * Los 53 permisos, agrupados por área y por recurso. Se calcula una vez: el
 * catálogo es constante.
 */
const GROUPS = groupPermissions(ALL_PERMISSIONS)

/**
 * Una casilla por permiso, bajo el nombre de su recurso.
 *
 * El verbo solo —«Ver», «Reversar»— porque el recurso ya lo dice la fila de
 * arriba: repetir «Pagos» en cada casilla llena la pantalla de una palabra que
 * no distingue nada.
 */
function PermissionToggle({
  permission,
  checked,
  onToggle,
  disabled,
}: {
  permission: Permission
  checked: boolean
  onToggle: () => void
  disabled: boolean
}) {
  return (
    <label
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        !disabled && 'hover:bg-secondary cursor-pointer',
        disabled && 'opacity-60',
      )}
    >
      <input
        type="checkbox"
        className="accent-primary size-4 shrink-0"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
      />
      <span className="min-w-0">{permissionAction(permission)}</span>
      <span className="sr-only">{permission}</span>
    </label>
  )
}

/**
 * **El editor de un rol propio.**
 *
 * Va en cajón y no en diálogo centrado porque cuelga de la lista de roles y
 * porque no es un formulario corto: son 53 permisos. La regla de §11.1.3 mira
 * las dos cosas —de qué cuelga y cuánto ocupa—, y aquí las dos apuntan al mismo
 * sitio.
 *
 * **Ofrece el catálogo entero, incluidos los tres que el backend reserva al
 * propietario.** No se filtran aquí porque el contrato no publica cuáles son, y
 * escribir esa lista en el front sería una segunda fuente de verdad que se
 * desincroniza en silencio (§88.5). El backend los rechaza **nombrándolos**, así
 * que el error dice exactamente cuál sobra.
 */
export function RoleFormPage() {
  const { roleId } = useParams()
  const isEdit = Boolean(roleId)
  const { orgId } = useCurrentOrg()
  const navigate = useNavigate()

  const { role, isPending, isError, error } = useCustomRole(orgId, roleId)
  const create = useCreateCustomRole(orgId ?? '')
  const update = useUpdateCustomRole(orgId ?? '')
  const busy = create.isPending || update.isPending

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [granted, setGranted] = useState<Set<Permission>>(new Set())

  useHydrateOnce(role?.id, role, (r) => {
    setName(r.name)
    setDescription(r.description ?? '')
    setGranted(new Set(r.permissions))
  })

  const toggle = (permission: Permission) =>
    setGranted((prev) => {
      const next = new Set(prev)
      if (next.has(permission)) next.delete(permission)
      else next.add(permission)
      return next
    })

  /**
   * Marcar o desmarcar un área entera: es como se piensa un rol —«lleva la
   * cartera»—, no casilla por casilla.
   */
  const toggleAll = (permissions: Permission[]) =>
    setGranted((prev) => {
      const next = new Set(prev)
      const todos = permissions.every((p) => next.has(p))
      for (const p of permissions) {
        if (todos) next.delete(p)
        else next.add(p)
      }
      return next
    })

  const total = granted.size

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      toast.error('El rol necesita un nombre.')
      return
    }
    if (total === 0) {
      // Un rol sin permisos no deja hacer nada: casi siempre es un olvido, no
      // una intención.
      toast.error('Elige al menos un permiso.')
      return
    }

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      permissions: [...granted],
    }

    try {
      if (isEdit && roleId) {
        await update.mutateAsync({ orgId: orgId ?? '', roleId, data })
        toast.success('Rol actualizado')
      } else {
        await create.mutateAsync({ orgId: orgId ?? '', data })
        toast.success('Rol creado')
      }
      navigate(LIST)
    } catch (err) {
      toastApiError(err, 'No se pudo guardar el rol')
    }
  }

  const loading = isEdit && isPending

  return (
    <DetailDrawer
      closeTo={LIST}
      title={isEdit ? role?.name ?? 'Rol' : 'Nuevo rol'}
      meta={
        <span className="text-muted-foreground">
          {plural(total, 'permiso elegido', 'permisos elegidos')}
        </span>
      }
      loading={loading}
      error={isError ? getErrorMessage(error, 'No se encontró el rol.') : null}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => navigate(LIST)}>
            Cancelar
          </Button>
          <Button type="submit" form="role-form" disabled={busy}>
            {busy && <Loader size="sm" />}
            {isEdit ? 'Guardar' : 'Crear rol'}
          </Button>
        </>
      }
    >
      {!loading && (
        <form id="role-form" onSubmit={onSubmit} className="space-y-5" noValidate>
          <Field label="Nombre" htmlFor="role-name" required>
            <Input
              id="role-name"
              value={name}
              maxLength={80}
              placeholder="Cajero, Auxiliar de cartera…"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field label="Descripción" htmlFor="role-desc" hint="Para qué es este rol. Opcional.">
            <Textarea
              id="role-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          {GROUPS.map((group) => {
            const delArea = group.resources.flatMap((r) => r.permissions)
            const elegidos = delArea.filter((p) => granted.has(p)).length
            const todos = elegidos === delArea.length

            return (
              <section key={group.area} className="space-y-2">
                {/*
                  El contador por área es lo que deja ver la cobertura sin abrir
                  nada: «Cartera 3 de 12» responde «¿este rol lleva la cartera?».
                */}
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-medium">{group.area}</h3>
                  <div className="flex items-baseline gap-3">
                    <span className="nums text-muted-foreground text-xs">
                      {elegidos} de {delArea.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleAll(delArea)}
                      className="text-brand focus-visible:ring-ring/50 rounded text-xs underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
                    >
                      {todos ? 'Quitar todo' : 'Todo'}
                    </button>
                  </div>
                </div>

                {/*
                  **Una caja por área, no una por recurso.** Veinticuatro
                  rectángulos con borde apilados son la sopa de tarjetas que
                  §11.1 prohíbe: separan sin jerarquizar. Dentro, los recursos se
                  separan con una línea, que es lo que ya hace `DetailRows`.
                */}
                <div className="divide-y rounded-lg border">
                  {group.resources.map((resource) => (
                    // Apilado y no en dos columnas: el cajón mide 30rem en
                    // escritorio, así que una columna de etiqueta dejaría a los
                    // cuatro verbos de «Egresos» sin sitio y los partiría igual.
                    <div key={resource.resource} className="space-y-1 px-3 py-2.5">
                      <p className="text-muted-foreground text-sm">{resource.label}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                        {resource.permissions.map((permission) => (
                          <PermissionToggle
                            key={permission}
                            permission={permission}
                            checked={granted.has(permission)}
                            onToggle={() => toggle(permission)}
                            disabled={busy}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </form>
      )}
    </DetailDrawer>
  )
}
