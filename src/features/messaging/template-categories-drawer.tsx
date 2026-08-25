import { useState } from 'react'
import { Archive, Pencil, Plus, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { toastApiError } from '@/features/platform/errors'
import { plural } from '@/lib/format'
import type { WhatsAppTemplateCategory } from '@/api/generated/model'
import { templateCategoryInUse, templateCategoryNameTaken } from './errors'
import {
  useArchiveWhatsAppTemplateCategory,
  useCreateWhatsAppTemplateCategory,
  useUpdateWhatsAppTemplateCategory,
} from './hooks'

/** Lo que acepta el contrato; el `maxLength` del campo evita el 422. */
const MAX_NAME = 80
const MAX_DESCRIPTION = 300

/**
 * **Las categorías con las que se agrupan las plantillas.**
 *
 * No son las de Meta. `metaCategory` —`UTILITY`, `MARKETING`,
 * `AUTHENTICATION`— decide el precio y las reglas de aprobación, se declara al
 * crear la plantilla y Meta la confirma o la cambia por su cuenta. Éstas son
 * nuestras y solo responden a «¿de qué va esta plantilla?», que es la pregunta
 * que hace falta cuando la lista deja de tener ocho entradas.
 *
 * Va en cajón y no en diálogo porque **es una lista**: se mira entera, se toca
 * una fila y se sigue mirando (§11.1.3). El formulario ocupa su sitio mientras
 * dura, en vez de abrir un segundo diálogo encima.
 *
 * Tres reglas del backend que se ven aquí, y ninguna es de permisos:
 *
 * - **Las de Nummo se usan pero no se editan.** La fila es una y la comparten
 *   todas las organizaciones, así que renombrarla se la renombraría a las demás.
 *   El backend responde `422` —un `OWNER` tampoco puede—, y por eso el botón se
 *   apaga con `editable`, que llega fila a fila, y no con el rol.
 * - **Con plantillas dentro no se archiva.** Son dos decisiones —archivar y
 *   desclasificar— y solo se pidió una, así que el conteo se enseña antes de que
 *   nadie pulse.
 * - **Archivar es baja lógica.** La fila se conserva, deja de ofrecerse y vuelve
 *   con Reactivar. Por eso el cajón enseña también las archivadas: el contrato
 *   las devuelve, y esconderlas las dejaría sin forma de volver.
 */
export function TemplateCategoriesDrawer({
  open,
  onOpenChange,
  orgId,
  categories,
  isPending,
  canManage,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string | undefined
  /** Ya vienen de la consulta de la pantalla: aquí solo se escriben. */
  categories: WhatsAppTemplateCategory[]
  isPending: boolean
  canManage: boolean
}) {
  const create = useCreateWhatsAppTemplateCategory(orgId ?? '')
  const update = useUpdateWhatsAppTemplateCategory(orgId ?? '')
  const archive = useArchiveWhatsAppTemplateCategory(orgId ?? '')

  /** `'new'` es el alta; una categoría es la edición; `null` es la lista. */
  const [editing, setEditing] = useState<WhatsAppTemplateCategory | 'new' | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | undefined>()

  const openForm = (target: WhatsAppTemplateCategory | 'new') => {
    setEditing(target)
    setName(target === 'new' ? '' : target.name)
    setDescription(target === 'new' ? '' : (target.description ?? ''))
    setError(undefined)
  }

  const closeForm = () => {
    setEditing(null)
    setError(undefined)
  }

  const saving = create.isPending || update.isPending

  const save = async () => {
    if (!orgId || !editing) return
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Ponle un nombre para poder reconocerla.')
      return
    }
    // El backend deriva la clave del nombre y rechaza el que no deja ninguna.
    if (!/[\p{L}\p{N}]/u.test(trimmed)) {
      setError('Necesita al menos una letra o un número.')
      return
    }
    const data = { name: trimmed, description: description.trim() || null }
    try {
      if (editing === 'new') {
        await create.mutateAsync({ orgId, data })
        toast.success('Categoría creada')
      } else {
        await update.mutateAsync({ orgId, categoryId: editing.id, data })
        toast.success('Categoría guardada')
      }
      closeForm()
    } catch (err) {
      const taken = templateCategoryNameTaken(err)
      if (taken) {
        setError(
          taken.scope === 'PLATFORM'
            ? 'Ya hay una categoría de Nummo con ese nombre.'
            : 'Ya tienes una categoría con ese nombre.',
        )
        return
      }
      toastApiError(err, 'No se pudo guardar la categoría')
    }
  }

  const onArchive = async (category: WhatsAppTemplateCategory) => {
    if (!orgId) return
    try {
      await archive.mutateAsync({ orgId, categoryId: category.id })
      toast.success(`«${category.name}» archivada`, {
        description: 'Deja de ofrecerse al clasificar. Puedes reactivarla aquí mismo.',
      })
    } catch (err) {
      // Otro pudo clasificar una plantilla mientras este cajón estaba abierto,
      // así que el conteo local puede haber envejecido: el 409 lo dice al día.
      const inUse = templateCategoryInUse(err)
      if (inUse !== null) {
        toast.error('Todavía tiene plantillas dentro', {
          description: `Saca ${plural(inUse, 'la plantilla', 'las plantillas')} de la categoría antes de archivarla.`,
        })
        return
      }
      toastApiError(err, 'No se pudo archivar la categoría')
    }
  }

  const onReactivate = async (category: WhatsAppTemplateCategory) => {
    if (!orgId) return
    try {
      await update.mutateAsync({ orgId, categoryId: category.id, data: { isActive: true } })
      toast.success(`«${category.name}» vuelve a ofrecerse`)
    } catch (err) {
      toastApiError(err, 'No se pudo reactivar la categoría')
    }
  }

  const active = categories.filter((c) => c.isActive)
  const archived = categories.filter((c) => !c.isActive)

  return (
    <Drawer
      /*
        `fit`: en un teléfono el alto lo pone el contenido. Son dos categorías y
        un botón, o dos campos: subir hasta el borde superior dejaba media
        pantalla en blanco, que se lee como que falta algo por cargar. Con muchas
        categorías crece hasta el 88 % del alto y la lista hace su propio scroll.
      */
      fit
      open={open}
      onOpenChange={(next) => {
        if (!next) closeForm()
        onOpenChange(next)
      }}
      title={
        editing === null ? 'Categorías' : editing === 'new' ? 'Nueva categoría' : 'Editar categoría'
      }
      meta={
        editing === null ? 'Con qué se agrupan las plantillas de esta organización.' : undefined
      }
      footer={
        editing !== null ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeForm}>
              Cancelar
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving && <Loader size="sm" />}
              Guardar
            </Button>
          </div>
        ) : canManage ? (
          <Button className="w-full" onClick={() => openForm('new')}>
            <Plus aria-hidden className="size-4" />
            Nueva categoría
          </Button>
        ) : undefined
      }
    >
      {editing !== null ? (
        <div className="space-y-4">
          <Field label="Nombre" htmlFor="cat-name" required error={error}>
            <Input
              id="cat-name"
              value={name}
              maxLength={MAX_NAME}
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field
            label="Descripción"
            htmlFor="cat-description"
            hint="Para quien la elija dentro de un año."
          >
            <Input
              id="cat-description"
              value={description}
              maxLength={MAX_DESCRIPTION}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </div>
      ) : isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="space-y-4">
          <ul className="divide-y">
            {active.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                onEdit={canManage && category.editable ? () => openForm(category) : undefined}
                onArchive={
                  canManage && category.editable ? () => void onArchive(category) : undefined
                }
              />
            ))}
          </ul>

          {archived.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium">Archivadas</p>
              <ul className="divide-y">
                {archived.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    onReactivate={
                      canManage && category.editable ? () => void onReactivate(category) : undefined
                    }
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Se dice una vez arriba y no en cada fila: es la misma regla para
              todas, y repetirla siete veces la convierte en ruido. */}
          <Note tone="info" title="Las de Nummo no se editan">
            Las comparten todas las organizaciones, así que renombrarlas se las renombraría a las
            demás. Y una categoría con plantillas dentro no se archiva: primero se sacan.
          </Note>
        </div>
      )}
    </Drawer>
  )
}

function CategoryRow({
  category,
  onEdit,
  onArchive,
  onReactivate,
}: {
  category: WhatsAppTemplateCategory
  onEdit?: () => void
  onArchive?: () => void
  onReactivate?: () => void
}) {
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium">{category.name}</p>
        {category.description && (
          <p className="text-muted-foreground text-xs">{category.description}</p>
        )}
        <p className="text-muted-foreground text-xs">
          {category.scope === 'PLATFORM' && 'De Nummo · '}
          {plural(category.templateCount, 'plantilla', 'plantillas')}
        </p>
      </div>

      <div className="flex shrink-0 gap-1">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onEdit}
            aria-label={`Editar ${category.name}`}
          >
            <Pencil aria-hidden className="size-4" />
          </Button>
        )}
        {onArchive && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={category.templateCount > 0}
            onClick={onArchive}
            aria-label={
              category.templateCount > 0
                ? `No se puede archivar ${category.name}: tiene ${plural(category.templateCount, 'plantilla', 'plantillas')}`
                : `Archivar ${category.name}`
            }
          >
            <Archive aria-hidden className="size-4" />
          </Button>
        )}
        {onReactivate && (
          <Button variant="outline" size="sm" onClick={onReactivate}>
            <RotateCcw aria-hidden className="size-4" />
            Reactivar
          </Button>
        )}
      </div>
    </li>
  )
}
