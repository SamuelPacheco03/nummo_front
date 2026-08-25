import { useEffect, useState } from 'react'
import { ArrowUpDown, Tags } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { toastApiError } from '@/features/platform/errors'
import type { ListResult } from '@/lib/list-result'
import type { ExpenseCategory } from '@/api/generated/model'
import { MasterCrud, type Column } from './master-crud'
import { CatalogIcon } from './catalog-icon'
import {
  catalogRowIcon,
  CATALOG_DEFAULT_SORT,
  CATALOG_SORT_CHOICES,
  type CatalogIdentity,
} from './catalogs'
import { IdentityField } from './identity-field'
import { CatalogOrderDrawer } from './order-drawer'
import { useCreateExpenseCategory, useExpenseCategories, useUpdateExpenseCategory } from './hooks'
import type { MasterParams } from './hooks'

const schema = z.object({
  code: z.string().trim().max(40).optional(),
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  description: z.string().trim().max(500).optional(),
  scope: z.enum(['BUSINESS', 'PERSONAL']),
  isActive: z.boolean().optional(),
})
type Values = z.infer<typeof schema>

const SCOPES = ['BUSINESS', 'PERSONAL'] as const
const SCOPE_LABELS: Record<Values['scope'], string> = {
  BUSINESS: 'Negocio',
  PERSONAL: 'Personal',
}

const nn = (v?: string) => (v ? v : null)

const COLUMNS: Column<ExpenseCategory>[] = [
  {
    header: 'Código',
    cell: (r) => <span className="nums text-muted-foreground">{r.code ?? '—'}</span>,
    hideOnCard: true,
  },
  {
    header: 'Nombre',
    /*
      El icono va pegado al nombre: aquí es la identidad de lo que se edita, no
      el adorno de una fila densa. Solo en la tabla: en la tarjeta ya es la
      pastilla de la izquierda (§11.1.3b, regla 2).
    */
    cell: (r) => (
      <span className="flex items-center gap-2">
        <CatalogIcon icon={r.icon} color={r.color} fallback={Tags} className="hidden lg:block" />
        {r.name}
      </span>
    ),
    card: 'title',
    sortField: 'name',
  },
  {
    header: 'Ámbito',
    cell: (r) => <span className="text-muted-foreground">{SCOPE_LABELS[r.scope] ?? r.scope}</span>,
    card: 'meta',
  },
  {
    header: 'Descripción',
    cell: (r) => (
      <span className="text-muted-foreground block max-w-xs truncate">{r.description ?? '—'}</span>
    ),
    hideOnCard: true,
  },
]

function CategoryDialog({
  orgId,
  open,
  onOpenChange,
  editing,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ExpenseCategory | null
}) {
  const create = useCreateExpenseCategory(orgId)
  const update = useUpdateExpenseCategory(orgId)
  const isEdit = !!editing
  const busy = create.isPending || update.isPending
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  // Fuera del formulario: no son campos de texto y pasarlos por RHF pediría dos
  // controles ocultos para no ganar nada.
  const [identity, setIdentity] = useState<CatalogIdentity>({ icon: null, color: null })

  useEffect(() => {
    if (open) {
      reset({
        code: editing?.code ?? '',
        name: editing?.name ?? '',
        description: editing?.description ?? '',
        scope: editing?.scope ?? 'BUSINESS',
        isActive: editing?.isActive ?? true,
      })
      setIdentity({ icon: editing?.icon ?? null, color: editing?.color ?? null })
    }
  }, [open, editing, reset])

  const onSubmit = handleSubmit(async (v) => {
    const data = {
      code: nn(v.code),
      name: v.name,
      description: nn(v.description),
      scope: v.scope,
      ...identity,
    }
    try {
      if (isEdit && editing) {
        await update.mutateAsync({ orgId, id: editing.id, data: { ...data, isActive: v.isActive } })
        toast.success('Categoría actualizada')
      } else {
        await create.mutateAsync({ orgId, data })
        toast.success('Categoría creada')
      }
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'No se pudo guardar')
    }
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar categoría' : 'Nueva categoría'}
      submitLabel={isEdit ? 'Guardar' : 'Crear'}
      loading={busy}
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <Field label="Código" htmlFor="ec-code" error={errors.code?.message}>
          <Input id="ec-code" {...register('code')} />
        </Field>
        <Field label="Nombre" htmlFor="ec-name" required error={errors.name?.message}>
          <Input id="ec-name" placeholder="Servicios públicos" {...register('name')} />
        </Field>
      </div>
      <Field
        label="Ámbito"
        htmlFor="ec-scope"
        info="Negocio: gastos de la operación. Personal: gastos personales del titular (para separarlos en informes)."
        error={errors.scope?.message}
      >
        <NativeSelect id="ec-scope" {...register('scope')}>
          {SCOPES.map((s) => (
            <option key={s} value={s}>
              {SCOPE_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Descripción" htmlFor="ec-desc" error={errors.description?.message}>
        <Textarea id="ec-desc" rows={2} {...register('description')} />
      </Field>
      <IdentityField value={identity} onChange={setIdentity} fallback={Tags} />
      {isEdit && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" {...register('isActive')} />
          Activo
        </label>
      )}
    </FormDialog>
  )
}

/** Consulta este maestro; vive aquí porque el endpoint es de esta feature. */
function useExpenseCategoryRows(params: MasterParams): ListResult<ExpenseCategory> {
  const { orgId } = useCurrentOrg()
  return useExpenseCategories(orgId, params)
}

export function ExpenseCategoriesPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canManage = can('expense_categories.manage')
  const [open, setOpen] = useState(false)
  const [ordering, setOrdering] = useState(false)
  const [editing, setEditing] = useState<ExpenseCategory | null>(null)
  const update = useUpdateExpenseCategory(orgId ?? '')

  return (
    <>
      <MasterCrud
        Icon={Tags}
        title="Categorías de gasto"
        description="Clasifica los egresos de la organización."
        canManage={canManage}
        newLabel="Nueva categoría"
        searchPlaceholder="Buscar categoría…"
        storageKey="nummo:categorias:filtros"
        entity={['categoría', 'categorías']}
        useList={useExpenseCategoryRows}
        columns={COLUMNS}
        sortChoices={CATALOG_SORT_CHOICES}
        defaultSort={CATALOG_DEFAULT_SORT}
        rowIcon={(row) => catalogRowIcon(row, Tags)}
        actions={
          canManage && (
            <Button
              variant="outline"
              size="sm"
              aria-label="Ordenar"
              onClick={() => setOrdering(true)}
            >
              <ArrowUpDown aria-hidden className="size-4" />
              <span className="hidden sm:inline">Ordenar</span>
            </Button>
          )
        }
        onNew={() => {
          setEditing(null)
          setOpen(true)
        }}
        onEdit={(r) => {
          setEditing(r)
          setOpen(true)
        }}
      />
      {orgId && <CategoryDialog orgId={orgId} open={open} onOpenChange={setOpen} editing={editing} />}
      {orgId && (
        <CatalogOrderDrawer
          open={ordering}
          onOpenChange={setOrdering}
          title="Ordenar categorías"
          fallback={Tags}
          useList={useExpenseCategoryRows}
          onSave={async (moves) => {
            for (const move of moves) {
              await update.mutateAsync({ orgId, id: move.id, data: { position: move.position } })
            }
          }}
        />
      )}
    </>
  )
}
