import { useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { toastApiError } from '@/features/platform/errors'
import type { ListResult } from '@/lib/list-result'
import type { PaymentMethod } from '@/api/generated/model'
import { MasterCrud, type Column } from './master-crud'
import { METHOD_TYPES, METHOD_TYPE_LABELS } from './labels'
import { useCreatePaymentMethod, usePaymentMethods, useUpdatePaymentMethod } from './hooks'
import type { MasterParams } from './hooks'

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  /*
    Cadena y no enumerado, para que un tipo retirado que siga guardado pueda
    cargarse en el formulario sin fallar. Lo constriñe el `<select>`: no hay forma
    de elegir algo que no esté entre sus opciones, y la retirada va deshabilitada.
  */
  methodType: z.string().min(1),
  isActive: z.boolean().optional(),
})
type Values = z.infer<typeof schema>

/** ¿Es un tipo que el catálogo todavía ofrece? Estrecha para el contrato. */
function enCatalogo(tipo: string): tipo is (typeof METHOD_TYPES)[number] {
  return (METHOD_TYPES as readonly string[]).includes(tipo)
}

const COLUMNS: Column<PaymentMethod>[] = [
  { header: 'Nombre', cell: (r) => r.name, card: 'title', sortField: 'name' },
  {
    header: 'Tipo',
    cell: (r) => METHOD_TYPE_LABELS[r.methodType] ?? r.methodType,
    card: 'meta',
  },
]

function MethodDialog({
  orgId,
  open,
  onOpenChange,
  editing,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: PaymentMethod | null
}) {
  const create = useCreatePaymentMethod(orgId)
  const update = useUpdatePaymentMethod(orgId)
  const isEdit = !!editing
  const busy = create.isPending || update.isPending
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  /** Lo guardado, cuando el catálogo ya no lo ofrece. */
  const tipoRetirado = editing && !enCatalogo(editing.methodType) ? editing.methodType : null

  useEffect(() => {
    if (open)
      reset({
        name: editing?.name ?? '',
        methodType: editing?.methodType ?? 'CASH',
        isActive: editing?.isActive ?? true,
      })
  }, [open, editing, reset])

  const onSubmit = handleSubmit(async (v) => {
    /*
      Un tipo retirado **no se reenvía**: el `PATCH` es parcial, así que omitirlo
      deja el que hay guardado. Es lo que permite corregirle el nombre a un método
      antiguo sin reclasificarlo de paso, que era el único camino por el que se
      podía perder ese dato sin querer.
    */
    const tipo = enCatalogo(v.methodType) ? v.methodType : null
    try {
      if (isEdit && editing) {
        await update.mutateAsync({
          orgId,
          id: editing.id,
          data: { name: v.name, isActive: v.isActive, ...(tipo ? { methodType: tipo } : {}) },
        })
        toast.success('Método actualizado')
      } else {
        // Al crear no hay opción retirada que elegir, así que siempre hay tipo.
        await create.mutateAsync({ orgId, data: { name: v.name, methodType: tipo ?? 'CASH' } })
        toast.success('Método creado')
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
      title={isEdit ? 'Editar método' : 'Nuevo método de pago'}
      submitLabel={isEdit ? 'Guardar' : 'Crear'}
      loading={busy}
      onSubmit={onSubmit}
    >
      <Field label="Nombre" htmlFor="pm-name" required error={errors.name?.message}>
        <Input id="pm-name" placeholder="Nequi, Bancolombia…" {...register('name')} />
      </Field>
      <Field label="Tipo" htmlFor="pm-type" error={errors.methodType?.message}>
        <NativeSelect id="pm-type" {...register('methodType')}>
          {METHOD_TYPES.map((t) => (
            <option key={t} value={t}>
              {METHOD_TYPE_LABELS[t]}
            </option>
          ))}
          {/*
            Un tipo guardado que el catálogo ya no ofrece se enseña igual, y
            deshabilitado. Sin él, el desplegable se abre **en blanco** y el
            primer «Guardar» —aunque solo se viniera a corregir el nombre—
            reclasificaría el método sin decirlo. Deshabilitado deja verlo y
            obliga a elegir a propósito.
          */}
          {tipoRetirado && (
            <option value={tipoRetirado} disabled>
              {METHOD_TYPE_LABELS[tipoRetirado] ?? tipoRetirado} (ya no se usa)
            </option>
          )}
        </NativeSelect>
      </Field>
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
function usePaymentMethodRows(params: MasterParams): ListResult<PaymentMethod> {
  const { orgId } = useCurrentOrg()
  return usePaymentMethods(orgId, params)
}

export function PaymentMethodsPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canManage = can('payment_methods.manage')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentMethod | null>(null)

  return (
    <>
      <MasterCrud
        Icon={CreditCard}
        title="Métodos de pago"
        description="Formas en que la organización recibe o realiza pagos."
        canManage={canManage}
        newLabel="Nuevo método"
        searchPlaceholder="Buscar método…"
        storageKey="nummo:metodos:filtros"
        entity={['método', 'métodos']}
        useList={usePaymentMethodRows}
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
      {orgId && <MethodDialog orgId={orgId} open={open} onOpenChange={setOpen} editing={editing} />}
    </>
  )
}
