import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { ASSIGNABLE_ROLES, roleLabel } from '@/features/organizations/roles'
import { toastApiError } from '@/features/platform/errors'
import { toast } from 'sonner'
import type { PlaygroundCase, PlaygroundCaseRole } from '@/api/generated/model'
import { joinList, parseList } from './expectations'
import { usePlaygroundContext, useSaveCase, useUpdateCase } from './hooks'

const ROLES = ASSIGNABLE_ROLES as unknown as PlaygroundCaseRole[]

/** Lo que el formulario necesita saber para abrirse ya rellenado. */
export interface CaseDraft {
  organizationId: string
  message: string
}

interface FormState {
  label: string
  message: string
  role: PlaygroundCaseRole
  customRoleId: string
  expectedTools: string
  forbiddenTools: string
  mustMention: string
  mustNotMention: string
  mustBeGrounded: boolean
}

function fromCase(existing: PlaygroundCase | undefined, draft: CaseDraft | undefined): FormState {
  return {
    label: existing?.label ?? '',
    message: existing?.message ?? draft?.message ?? '',
    role: existing?.role ?? 'OWNER',
    customRoleId: existing?.customRoleId ?? '',
    expectedTools: joinList(existing?.expectations.expectedTools),
    forbiddenTools: joinList(existing?.expectations.forbiddenTools),
    mustMention: joinList(existing?.expectations.mustMention),
    mustNotMention: joinList(existing?.expectations.mustNotMention),
    // Por defecto, sí: una respuesta con cifras sin respaldo es el fallo que más caro sale.
    mustBeGrounded: existing?.expectations.mustBeGrounded ?? true,
  }
}

/**
 * **Un caso del conjunto de regresión**: qué se pregunta, con qué rol, y qué tiene que
 * pasar para darlo por bueno.
 *
 * Se abre desde la lista y también desde la traza de una corrida —«esto salió mal, que no
 * vuelva a pasar»—, que es el camino por el que de verdad crece un conjunto de pruebas.
 */
export function CaseFormDrawer({
  existing,
  draft,
  onArchive,
  onClose,
}: {
  existing?: PlaygroundCase
  draft?: CaseDraft
  /** Solo al editar: archivar vive con el caso, no suelto en la pantalla de atrás. */
  onArchive?: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState>(() => fromCase(existing, draft))
  const [errors, setErrors] = useState<{ label?: string; message?: string }>({})
  const organizationId = existing?.organizationId ?? draft?.organizationId ?? ''

  // Los roles propios son de una organización, así que se piden para la del caso.
  const { context } = usePlaygroundContext(organizationId)
  const customRoles = context?.customRoles ?? []

  const save = useSaveCase()
  const update = useUpdateCase()
  const busy = save.isPending || update.isPending

  const patch = (values: Partial<FormState>) => setForm((prev) => ({ ...prev, ...values }))

  const submit = () => {
    const next: typeof errors = {}
    if (!form.label.trim()) next.label = 'Ponle un nombre para reconocerlo en la lista.'
    if (!form.message.trim()) next.message = 'Sin pregunta no hay caso que correr.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const expectations = {
      expectedTools: parseList(form.expectedTools),
      forbiddenTools: parseList(form.forbiddenTools),
      mustMention: parseList(form.mustMention),
      mustNotMention: parseList(form.mustNotMention),
      mustBeGrounded: form.mustBeGrounded,
    }
    const common = {
      label: form.label.trim(),
      message: form.message.trim(),
      role: form.role,
      customRoleId: form.customRoleId || null,
      expectations,
    }

    const done = () => {
      toast.success(existing ? 'Caso actualizado.' : 'Caso guardado.')
      onClose()
    }
    const failed = (error: unknown) => toastApiError(error, 'No se pudo guardar el caso.')

    if (existing) {
      update.mutate({ id: existing.id, data: common }, { onSuccess: done, onError: failed })
    } else {
      save.mutate(
        { data: { organizationId, ...common } },
        { onSuccess: done, onError: failed },
      )
    }
  }

  return (
    <Drawer
      open
      onOpenChange={(open) => !open && onClose()}
      title={existing ? 'Editar el caso' : 'Nuevo caso'}
      meta={context?.organization.name}
      footer={
        <div className="flex items-center gap-2">
          {existing && onArchive && (
            <Button variant="ghost" onClick={onArchive}>
              <Trash2 aria-hidden />
              Archivar
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={busy || !organizationId}>
              {busy ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre" htmlFor="pg-caso-label" required error={errors.label}>
          <Input
            id="pg-caso-label"
            value={form.label}
            onChange={(e) => patch({ label: e.target.value })}
            placeholder="Saldo de cartera con mora"
          />
        </Field>

        <Field label="La pregunta" htmlFor="pg-caso-mensaje" required error={errors.message}>
          <Textarea
            id="pg-caso-mensaje"
            value={form.message}
            onChange={(e) => patch({ message: e.target.value })}
            rows={3}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rol" htmlFor="pg-caso-rol">
            <NativeSelect
              id="pg-caso-rol"
              value={form.role}
              onChange={(e) => patch({ role: e.target.value as PlaygroundCaseRole })}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {customRoles.length > 0 && (
            <Field label="Rol propio" htmlFor="pg-caso-rol-propio">
              <NativeSelect
                id="pg-caso-rol-propio"
                value={form.customRoleId}
                onChange={(e) => patch({ customRoleId: e.target.value })}
              >
                <option value="">Ninguno</option>
                {customRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
        </div>

        <div className="space-y-4 border-t pt-4">
          <p className="text-sm font-medium">Qué tiene que pasar</p>

          <Field
            label="Herramientas que debe llamar"
            htmlFor="pg-caso-expected"
            hint="Una por línea."
          >
            <Textarea
              id="pg-caso-expected"
              value={form.expectedTools}
              onChange={(e) => patch({ expectedTools: e.target.value })}
              rows={2}
              className="font-mono text-xs"
            />
          </Field>

          <Field label="Herramientas que no debe llamar" htmlFor="pg-caso-forbidden">
            <Textarea
              id="pg-caso-forbidden"
              value={form.forbiddenTools}
              onChange={(e) => patch({ forbiddenTools: e.target.value })}
              rows={2}
              className="font-mono text-xs"
            />
          </Field>

          <Field
            label="Frases que debe mencionar"
            htmlFor="pg-caso-mention"
            hint="Se comparan sin acentos ni mayúsculas."
          >
            <Textarea
              id="pg-caso-mention"
              value={form.mustMention}
              onChange={(e) => patch({ mustMention: e.target.value })}
              rows={2}
            />
          </Field>

          <Field label="Frases que no debe mencionar" htmlFor="pg-caso-not-mention">
            <Textarea
              id="pg-caso-not-mention"
              value={form.mustNotMention}
              onChange={(e) => patch({ mustNotMention: e.target.value })}
              rows={2}
            />
          </Field>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary mt-0.5 size-4"
              checked={form.mustBeGrounded}
              onChange={(e) => patch({ mustBeGrounded: e.target.checked })}
            />
            <span>
              Sin cifras inventadas
              <span className="text-muted-foreground block text-xs">
                Cada monto de la respuesta tiene que venir de una herramienta.
              </span>
            </span>
          </label>
        </div>
      </div>
    </Drawer>
  )
}
