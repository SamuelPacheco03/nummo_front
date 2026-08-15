import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageOrg } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import type { ExpenseCategory } from '@/api/generated/model'
import { MasterCrud, useMasterListState, type Column } from './master-crud'
import { useCreateExpenseCategory, useExpenseCategories, useUpdateExpenseCategory } from './hooks'

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
  { header: 'Código', cell: (r) => r.code ?? '—', className: 'nums text-muted-foreground' },
  { header: 'Nombre', cell: (r) => r.name, className: 'font-medium' },
  { header: 'Ámbito', cell: (r) => SCOPE_LABELS[r.scope] ?? r.scope, className: 'text-muted-foreground' },
  {
    header: 'Descripción',
    cell: (r) => r.description ?? '—',
    className: 'max-w-xs truncate text-muted-foreground',
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

  useEffect(() => {
    if (open)
      reset({
        code: editing?.code ?? '',
        name: editing?.name ?? '',
        description: editing?.description ?? '',
        scope: editing?.scope ?? 'BUSINESS',
        isActive: editing?.isActive ?? true,
      })
  }, [open, editing, reset])

  const onSubmit = handleSubmit(async (v) => {
    const data = { code: nn(v.code), name: v.name, description: nn(v.description), scope: v.scope }
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
      toast.error(getErrorMessage(err, 'No se pudo guardar'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" {...register('isActive')} />
              Activo
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ExpenseCategoriesPage() {
  const { orgId, role } = useCurrentOrg()
  const canManage = canManageOrg(role)
  const state = useMasterListState()
  const list = useExpenseCategories(orgId, state.params)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseCategory | null>(null)

  return (
    <>
      <MasterCrud
        title="Categorías de gasto"
        description="Clasifica los egresos de la organización."
        canManage={canManage}
        newLabel="Nueva categoría"
        searchPlaceholder="Buscar categoría…"
        state={state}
        list={list}
        columns={COLUMNS}
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
    </>
  )
}
