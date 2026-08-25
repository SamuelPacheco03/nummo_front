import { Link } from 'react-router'
import { useState } from 'react'
import { Lock, MessageSquareText, Plus, RefreshCw, Tag, Tags, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { EmptyState, NoResults } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { FilterChips } from '@/components/ui/filter-chips'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { Loader } from '@/components/ui/loader'
import { NativeSelect } from '@/components/ui/native-select'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { toastApiError } from '@/features/platform/errors'
import { useCan, useFeature } from '@/features/platform/permissions'
import type {
  SyncWhatsAppTemplatesResult,
  WhatsAppTemplate,
  WhatsAppTemplateCategory,
} from '@/api/generated/model'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  useCreateWhatsAppTemplate,
  useDeleteWhatsAppTemplate,
  useSetWhatsAppTemplateCategory,
  useSyncWhatsAppTemplates,
  useWhatsAppAccount,
  useWhatsAppTemplateCategories,
  useWhatsAppTemplates,
} from './hooks'
import { isPlatformTemplate, templateLabel } from './labels'
import { TemplateCard } from './template-card'
import { TemplateCategoriesDrawer } from './template-categories-drawer'
import { TemplateFormDialog } from './template-form-dialog'

/**
 * La ficha de «lo que todavía no tiene categoría». No es un id, así que no puede
 * chocar con ninguno.
 */
const UNCLASSIFIED = 'sin-clasificar'

/**
 * **Las plantillas con las que se cobra.**
 *
 * **Crear y borrar exigen cuenta propia de Meta**, y no es una regla nuestra: en
 * la cuenta compartida de Nummo una organización podría agotarle a las demás el
 * cupo de creación, o dejar un nombre bloqueado treinta días. Así que los dos
 * botones aparecen **solo con la cuenta conectada** — ofrecerlos sin ella sería
 * ofrecer algo que va a responder 403 (§70).
 *
 * Las de la plataforma no se borran desde aquí ni con cuenta propia: no son de
 * esta organización.
 *
 * Lo que sí hace falta ya es **entender por qué un mensaje no salió**: la
 * política puede nombrar una plantilla que Meta pausó o todavía no aprobó, y
 * esta pantalla es donde eso se ve.
 *
 * **Las categorías son nuestras, no las de Meta.** `metaCategory` decide el
 * precio y las reglas de aprobación y Meta la recategoriza por su cuenta; la
 * nuestra solo agrupa. Se filtran con fichas —el reparto se ve sin filtrar
 * nada— y se administran en su cajón. Los dos ejes conviven porque responden a
 * preguntas distintas: **de quién es** la plantilla decide qué se puede hacer
 * con ella, y **de qué va** decide dónde buscarla.
 */
export function WhatsAppTemplatesPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canRead = can('whatsapp.templates.read')
  const canManage = can('whatsapp.templates.manage')

  const { templates, isPending, isError, error, refetch } = useWhatsAppTemplates(
    canRead ? orgId : undefined,
  )
  const { categories, isPending: categoriesPending } = useWhatsAppTemplateCategories(
    canRead ? orgId : undefined,
  )
  const sync = useSyncWhatsAppTemplates(orgId ?? '')
  const create = useCreateWhatsAppTemplate(orgId ?? '')
  const remove = useDeleteWhatsAppTemplate(orgId ?? '')
  const classify = useSetWhatsAppTemplateCategory(orgId ?? '')
  // Crear y borrar cuelgan de tener número propio, así que hay que saberlo aquí.
  const hasByo = useFeature('whatsapp_byo')
  const { connected } = useWhatsAppAccount(
    canRead && can('whatsapp.settings.read') ? orgId : undefined,
    hasByo,
  )
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<WhatsAppTemplate | null>(null)
  const [classifying, setClassifying] = useState<WhatsAppTemplate | null>(null)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')

  if (!canRead) {
    return (
      <div className="space-y-4">
        <PageHeader title="Plantillas de WhatsApp" />
        <EmptyState
          Icon={Lock}
          title="No puedes ver esto"
          description="Tu rol no incluye las plantillas de mensajes de esta organización."
        />
      </div>
    )
  }

  const onSync = async () => {
    if (!orgId) return
    try {
      const response = await sync.mutateAsync({ orgId })
      const { reviewed, updated } = response.data as SyncWhatsAppTemplatesResult
      toast.success(
        updated === 0
          ? `Sin cambios: ${reviewed === 1 ? '1 plantilla' : `${reviewed} plantillas`} ya estaban al día`
          : `${updated === 1 ? '1 plantilla' : `${updated} plantillas`} de ${reviewed} cambiaron de estado`,
      )
    } catch (err) {
      toastApiError(err, 'No se pudo contrastar con Meta')
    }
  }

  /*
    El nombre se busca en **todas** las categorías, archivadas incluidas: archivar
    no desclasifica nada, así que una plantilla puede seguir colgada de una que ya
    no se ofrece. Pintar su id en bruto sería peor que decir cómo se llama.
  */
  const categoryName = (id: string | null) =>
    id ? categories.find((c) => c.id === id)?.name : undefined

  /*
    Los contadores salen de las plantillas que la pantalla tiene delante y no del
    `templateCount` del contrato, que cuenta lo mismo pero por otro camino: así
    las cifras de las fichas nunca pueden discrepar de las filas que se ven al
    pulsarlas.
  */
  const countIn = (id: string) => templates.filter((t) => t.categoryId === id).length
  const unclassified = templates.filter((t) => t.categoryId == null).length

  const active = categories.filter((c) => c.isActive)
  const chips = [
    { value: '', label: 'Todas', count: templates.length },
    ...active.map((c) => ({ value: c.id, label: c.name, count: countIn(c.id) })),
    { value: UNCLASSIFIED, label: 'Sin clasificar', count: unclassified },
  ]

  /*
    En cuántos montones están repartidas de verdad. Con uno solo las fichas no
    reparten nada —«Todas 8» y «Cobranza 8» son la misma frase dos veces—, así
    que no se enseñan hasta que hay algo que separar.
  */
  const groups =
    active.filter((c) => countIn(c.id) > 0).length + (unclassified > 0 ? 1 : 0)

  const shown = templates.filter((t) =>
    categoryFilter === ''
      ? true
      : categoryFilter === UNCLASSIFIED
        ? t.categoryId == null
        : t.categoryId === categoryFilter,
  )

  const platform = shown.filter(isPlatformTemplate)
  const own = shown.filter((t) => !isPlatformTemplate(t))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Plantillas de WhatsApp"
        description="Los mensajes con los que Nummo le escribe a quien te debe."
      >
        {/*
          El `aria-label` repite el texto que se esconde bajo `sm`, y no sobra:
          `hidden` es `display: none`, así que en un teléfono estos tres botones
          se quedaban **sin nombre** —tres iconos y nada que leer en voz alta—.
          Se descubrió intentando pulsarlos desde fuera: lo que no encuentra
          Playwright por su nombre tampoco lo encuentra un lector de pantalla.
        */}
        <Button variant="outline" aria-label="Categorías" onClick={() => setCategoriesOpen(true)}>
          <Tags aria-hidden className="size-4" />
          <span className="hidden sm:inline">Categorías</span>
        </Button>
        {canManage && (
          <Button
            variant="outline"
            aria-label="Actualizar estado"
            onClick={() => void onSync()}
            disabled={sync.isPending}
          >
            {sync.isPending ? <Loader className="size-4" /> : <RefreshCw className="size-4" />}
            <span className="hidden sm:inline">Actualizar estado</span>
          </Button>
        )}
        {canManage && connected && (
          <Button aria-label="Nueva plantilla" onClick={() => setFormOpen(true)}>
            <Plus aria-hidden className="size-4" />
            <span className="hidden sm:inline">Nueva plantilla</span>
          </Button>
        )}
      </PageHeader>

      {isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState
          error={error}
          fallback="No se pudieron cargar las plantillas."
          onRetry={() => void refetch()}
        />
      ) : templates.length === 0 ? (
        <EmptyState
          Icon={MessageSquareText}
          title="Todavía no hay plantillas"
          description="Sin al menos una plantilla aprobada, la cobranza por WhatsApp no puede enviar nada."
        />
      ) : (
        <div className="space-y-4">
          {groups > 1 && (
            <FilterChips
              label="Categoría"
              choices={chips}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          )}

          {shown.length === 0 ? (
            <NoResults entity="plantillas" onClear={() => setCategoryFilter('')} />
          ) : (
            <>
              {platform.length > 0 && (
                <Panel title="De Nummo">
                  <p className="text-muted-foreground mb-2 text-xs">
                    Vienen aprobadas y son las que nombra la política de cobranza.
                  </p>
                  <ul className="grid gap-2">
                    {platform.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        label={categoryName(template.categoryId)}
                      />
                    ))}
                  </ul>
                </Panel>
              )}

              {own.length > 0 && (
                <Panel title="De tu organización">
                  <ul className="grid gap-2">
                    {own.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        label={categoryName(template.categoryId)}
                        actions={
                          <>
                            {/* Clasificar no habla con Meta, así que no pide
                                número propio: basta con que la plantilla sea de
                                la casa. Borrar sí, y por eso van separados. */}
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => setClassifying(template)}
                                aria-label={`Clasificar ${templateLabel(template)}`}
                              >
                                <Tag aria-hidden className="size-4" />
                              </Button>
                            )}
                            {canManage && connected && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => setDeleting(template)}
                                aria-label={`Borrar ${templateLabel(template)}`}
                              >
                                <Trash2 aria-hidden className="size-4" />
                              </Button>
                            )}
                          </>
                        }
                      />
                    ))}
                  </ul>
                </Panel>
              )}
            </>
          )}
        </div>
      )}

      {/* Se dice aquí y no cuando alguien busque el botón que no está. La regla
          es del backend: en la cuenta compartida, una organización podría
          agotarle a las demás el cupo de creación. */}
      {!connected && (
        <Note tone="info" title="Para crear plantillas propias hace falta tu número">
          Con el número de Nummo se usan estas, que ya están aprobadas. Conectando el tuyo puedes
          escribir las tuyas.{' '}
          <Link to="/config/whatsapp" className="text-brand underline">
            Número de WhatsApp
          </Link>
        </Note>
      )}

      {/* Montado solo mientras está abierto: si no, `open={false}` no lo
          desmonta y el borrador sobrevive a cerrar y volver a abrir (§45.7). */}
      {formOpen && (
      <TemplateFormDialog
        open
        onOpenChange={setFormOpen}
        loading={create.isPending}
        onSubmit={async (data) => {
          if (!orgId) return
          try {
            await create.mutateAsync({ orgId, data })
            toast.success('Plantilla enviada a revisión', {
              description: 'Meta tiene que aprobarla antes de que se pueda usar.',
            })
            setFormOpen(false)
          } catch (err) {
            toastApiError(err, 'No se pudo crear la plantilla')
          }
        }}
      />
      )}

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Borrar la plantilla"
        description={
          deleting
            ? `«${templateLabel(deleting)}» se borra también en Meta. Si la política de cobranza la estaba usando, ese aviso se queda sin plantilla y deja de salir.`
            : undefined
        }
        confirmLabel="Borrar"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          if (!orgId || !deleting) return
          try {
            await remove.mutateAsync({ orgId, templateKey: deleting.templateKey })
            toast.success('Plantilla borrada')
            setDeleting(null)
          } catch (err) {
            toastApiError(err, 'No se pudo borrar la plantilla')
          }
        }}
      />

      <TemplateCategoriesDrawer
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        orgId={orgId}
        categories={categories}
        isPending={categoriesPending}
        canManage={canManage}
      />

      {/* Como el formulario: montado solo mientras está abierto, para que no
          conserve la elección de la plantilla anterior (§45.7). */}
      {classifying && (
        <ClassifyDialog
          template={classifying}
          categories={categories.filter((c) => c.isActive)}
          loading={classify.isPending}
          onOpenChange={(open) => !open && setClassifying(null)}
          onSubmit={async (categoryId) => {
            if (!orgId) return
            try {
              await classify.mutateAsync({
                orgId,
                templateKey: classifying.templateKey,
                data: { categoryId },
              })
              toast.success(
                categoryId ? 'Plantilla clasificada' : 'Plantilla sin clasificar',
              )
              setClassifying(null)
            } catch (err) {
              toastApiError(err, 'No se pudo clasificar la plantilla')
            }
          }}
        />
      )}
    </div>
  )
}

/**
 * **En qué categoría va esta plantilla.**
 *
 * Sin clasificar es una opción de verdad y va la primera: es el estado en el que
 * nacen todas y al que se vuelve, no un hueco por rellenar.
 *
 * Solo se ofrecen las **activas**: una archivada dejó de ofrecerse a propósito, y
 * el sitio para recuperarla es el cajón de categorías.
 */
function ClassifyDialog({
  template,
  categories,
  loading,
  onOpenChange,
  onSubmit,
}: {
  template: WhatsAppTemplate
  categories: WhatsAppTemplateCategory[]
  loading: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (categoryId: string | null) => void | Promise<void>
}) {
  const [value, setValue] = useState(template.categoryId ?? '')

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title="Clasificar la plantilla"
      description={`«${templateLabel(template)}» se agrupa con las demás de esa categoría. No cambia nada de lo que Meta ve.`}
      submitLabel="Guardar"
      loading={loading}
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit(value || null)
      }}
    >
      <Field label="Categoría" htmlFor="tpl-group">
        <NativeSelect
          id="tpl-group"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        >
          <option value="">Sin clasificar</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </FormDialog>
  )
}
