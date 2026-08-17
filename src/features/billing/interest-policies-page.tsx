import { useEffect, useState } from 'react'
import { Percent } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { MoneyField } from '@/components/money-field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageOrg } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import type { ListResult } from '@/lib/list-result'
import type { MasterParams } from '@/features/masters/hooks'
import { MasterCrud, type Column } from '@/features/masters/master-crud'
import type { InterestPolicy } from '@/api/generated/model'
import {
  BASE_TYPES,
  BASE_TYPE_LABELS,
  CALC_METHODS,
  CALC_METHOD_LABELS,
} from './labels'
import { useCreateInterestPolicy, useInterestPolicies, useUpdateInterestPolicy } from './hooks'

const RATE_RE = /^\d+(\.\d{1,6})?$/
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  calculationMethod: z.enum(['DAILY_SIMPLE_PERCENT', 'MONTHLY_SIMPLE_PRORATED', 'FIXED_ONCE', 'FIXED_AMOUNT']),
  rateValue: z
    .string()
    .trim()
    .min(1, 'Obligatorio')
    .refine((v) => RATE_RE.test(v), 'Valor inválido'),
  graceDays: z.number().int().min(0).max(3650),
  baseType: z.enum(['ORIGINAL_AMOUNT', 'OUTSTANDING_NON_INTEREST']),
  capAmount: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || AMOUNT_RE.test(v), 'Monto inválido'),
  capPercentage: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || RATE_RE.test(v), 'Porcentaje inválido'),
  isActive: z.boolean().optional(),
})
type Values = z.infer<typeof schema>

const nn = (v?: string) => (v ? v : null)

const COLUMNS: Column<InterestPolicy>[] = [
  { header: 'Nombre', cell: (r) => r.name, className: 'font-medium', card: 'title' },
  {
    header: 'Método',
    cell: (r) => CALC_METHOD_LABELS[r.calculationMethod] ?? r.calculationMethod,
    card: 'meta',
  },
  { header: 'Tasa', cell: (r) => r.rateValue, className: 'nums text-right', headClassName: 'text-right' },
  {
    header: 'Gracia',
    cell: (r) => `${r.graceDays} d`,
    className: 'nums text-right',
    headClassName: 'text-right',
  },
]

function PolicyDialog({
  orgId,
  open,
  onOpenChange,
  editing,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: InterestPolicy | null
}) {
  const create = useCreateInterestPolicy(orgId)
  const update = useUpdateInterestPolicy(orgId)
  const isEdit = !!editing
  const busy = create.isPending || update.isPending
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open)
      reset({
        name: editing?.name ?? '',
        calculationMethod: editing?.calculationMethod ?? 'DAILY_SIMPLE_PERCENT',
        rateValue: editing?.rateValue ?? '',
        graceDays: editing?.graceDays ?? 0,
        baseType: editing?.baseType ?? 'ORIGINAL_AMOUNT',
        capAmount: editing?.capAmount ?? '',
        capPercentage: editing?.capPercentage ?? '',
        isActive: editing?.isActive ?? true,
      })
  }, [open, editing, reset])

  const onSubmit = handleSubmit(async (v) => {
    const data = {
      name: v.name,
      calculationMethod: v.calculationMethod,
      rateValue: v.rateValue,
      graceDays: v.graceDays,
      baseType: v.baseType,
      capAmount: nn(v.capAmount),
      capPercentage: nn(v.capPercentage),
    }
    try {
      if (isEdit && editing) {
        await update.mutateAsync({ orgId, id: editing.id, data: { ...data, isActive: v.isActive } })
        toast.success('Política actualizada')
      } else {
        await create.mutateAsync({ orgId, data })
        toast.success('Política creada')
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
          <DialogTitle>{isEdit ? 'Editar política' : 'Nueva política de interés'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Nombre" htmlFor="ip-name" required error={errors.name?.message}>
            <Input id="ip-name" placeholder="Mora estándar" {...register('name')} />
          </Field>
          <Field label="Método de cálculo" htmlFor="ip-method" error={errors.calculationMethod?.message}>
            <NativeSelect id="ip-method" {...register('calculationMethod')}>
              {CALC_METHODS.map((m) => (
                <option key={m} value={m}>
                  {CALC_METHOD_LABELS[m]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Tasa"
              htmlFor="ip-rate"
              required
              hint="% o valor"
              info="El valor del interés según el método. Ej.: en 'Diario simple', 0,05 = 0,05% por día de retraso. En 'Monto fijo', es un valor en dinero (ej. 10000 = recargo de $10.000)."
              error={errors.rateValue?.message}
            >
              <Input id="ip-rate" className="nums" inputMode="decimal" {...register('rateValue')} />
            </Field>
            <Field
              label="Días de gracia"
              htmlFor="ip-grace"
              info="Días de tolerancia tras el vencimiento antes de empezar a cobrar mora."
              error={errors.graceDays?.message}
            >
              <Input
                id="ip-grace"
                className="nums"
                type="number"
                min={0}
                max={3650}
                {...register('graceDays', { valueAsNumber: true })}
              />
            </Field>
          </div>
          <Field label="Base de cálculo" htmlFor="ip-base" error={errors.baseType?.message}>
            <NativeSelect id="ip-base" {...register('baseType')}>
              {BASE_TYPES.map((b) => (
                <option key={b} value={b}>
                  {BASE_TYPE_LABELS[b]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <MoneyField
              control={control}
              name="capAmount"
              label="Tope monto"
              id="ip-capa"
              hint="Opcional"
              error={errors.capAmount?.message}
              info="Límite máximo de interés en dinero. Si se define, la mora acumulada nunca supera este monto."
            />
            <Field label="Tope %" htmlFor="ip-capp" hint="Opcional" error={errors.capPercentage?.message}>
              <Input id="ip-capp" className="nums" inputMode="decimal" {...register('capPercentage')} />
            </Field>
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" {...register('isActive')} />
              Activa
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader size="sm" />}
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Consulta este maestro; vive aquí porque el endpoint es de esta feature. */
function useInterestPolicyRows(params: MasterParams): ListResult<InterestPolicy> {
  const { orgId } = useCurrentOrg()
  return useInterestPolicies(orgId, params)
}

export function InterestPoliciesPage() {
  const { orgId, role } = useCurrentOrg()
  const canManage = canManageOrg(role)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<InterestPolicy | null>(null)

  return (
    <>
      <MasterCrud
        Icon={Percent}
        title="Políticas de interés"
        description="Reglas de mora aplicables a los acuerdos."
        canManage={canManage}
        newLabel="Nueva política"
        searchPlaceholder="Buscar política…"
        storageKey="nummo:politicas:filtros"
        entity={['política', 'políticas']}
        useList={useInterestPolicyRows}
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
      {orgId && <PolicyDialog orgId={orgId} open={open} onOpenChange={setOpen} editing={editing} />}
    </>
  )
}
