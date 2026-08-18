import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Lock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ContactPicker } from '@/components/contact-picker'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Loader } from '@/components/ui/loader'
import { DetailDrawer } from '@/components/ui/detail-drawer'
import { Field } from '@/components/ui/field'
import { MoneyField } from '@/components/money-field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useBranches } from '@/features/config/hooks'
import { useBillingConcepts } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { todayISODate } from '@/lib/format'
import type { BillingAgreement } from '@/api/generated/model'
import { useAgreement, useCreateAgreement, useInterestPolicies, useUpdateAgreement } from './hooks'

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

const schema = z.object({
  payerContactId: z.string().min(1, 'Selecciona el pagador'),
  beneficiaryContactId: z.string().optional(),
  billingConceptId: z.string().min(1, 'Selecciona el concepto'),
  interestPolicyId: z.string().optional(),
  branchId: z.string().optional(),
  name: z.string().trim().max(160).optional(),
  agreedAmount: z
    .string()
    .trim()
    .min(1, 'Obligatorio')
    .refine((v) => AMOUNT_RE.test(v), 'Monto inválido (ej. 550000.00)'),
  currency: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v.length === 3, '3 letras'),
  startDate: z.string().min(1, 'Obligatoria'),
  endDate: z.string().optional(),
  dueDay: z.number().int().min(1, 'Día 1–31').max(31, 'Día 1–31'),
  generateDaysBefore: z.number().int().min(0).max(60),
  notes: z.string().trim().max(2000).optional(),
})
type Values = z.infer<typeof schema>

function toForm(a: BillingAgreement): Values {
  return {
    payerContactId: a.payerContactId,
    beneficiaryContactId: a.beneficiaryContactId ?? '',
    billingConceptId: a.billingConceptId,
    interestPolicyId: a.interestPolicyId ?? '',
    branchId: a.branchId ?? '',
    name: a.name ?? '',
    agreedAmount: a.agreedAmount,
    currency: a.currency,
    startDate: a.startDate,
    endDate: a.endDate ?? '',
    dueDay: a.dueDay,
    generateDaysBefore: a.generateDaysBefore,
    notes: a.notes ?? '',
  }
}

const LIST = '/cartera/acuerdos'
/** El botón de guardar vive en el pie del cajón, fuera del <form>. */
const FORM_ID = 'agreement-form'

export function AgreementFormPage() {
  const { agreementId } = useParams()
  const isEdit = !!agreementId
  const navigate = useNavigate()
  const { orgId, role } = useCurrentOrg()
  const canManage = canManageAgreements(role)
  const oid = orgId ?? ''

  const { agreement, isPending: loadingAgreement } = useAgreement(orgId, agreementId)
  const create = useCreateAgreement(oid)
  const update = useUpdateAgreement(oid)
  const { items: concepts } = useBillingConcepts(orgId, {
    page: 1,
    pageSize: 100,
    isActive: 'true',
    sort: 'name',
    order: 'asc',
  })
  const { items: policies } = useInterestPolicies(orgId, {
    page: 1,
    pageSize: 100,
    isActive: 'true',
    sort: 'name',
    order: 'asc',
  })
  const { branches } = useBranches(orgId)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      payerContactId: '',
      beneficiaryContactId: '',
      billingConceptId: '',
      interestPolicyId: '',
      branchId: '',
      name: '',
      agreedAmount: '',
      currency: 'COP',
      startDate: todayISODate(),
      endDate: '',
      dueDay: 1,
      generateDaysBefore: 0,
      notes: '',
    },
  })

  useEffect(() => {
    if (isEdit && agreement) reset(toForm(agreement))
  }, [isEdit, agreement, reset])

  const payerId = watch('payerContactId')
  const beneficiaryId = watch('beneficiaryContactId')
  const busy = create.isPending || update.isPending

  const conceptReg = register('billingConceptId')

  const onSubmit = handleSubmit(async (v) => {
    const data = {
      payerContactId: v.payerContactId,
      beneficiaryContactId: v.beneficiaryContactId || null,
      billingConceptId: v.billingConceptId,
      interestPolicyId: v.interestPolicyId || null,
      branchId: v.branchId || null,
      name: v.name || null,
      agreedAmount: v.agreedAmount,
      currency: v.currency ? v.currency.toUpperCase() : undefined,
      startDate: v.startDate,
      endDate: v.endDate || null,
      dueDay: v.dueDay,
      generateDaysBefore: v.generateDaysBefore,
      notes: v.notes || null,
    }
    try {
      if (isEdit && agreementId) {
        await update.mutateAsync({ orgId: oid, id: agreementId, data })
        toast.success('Acuerdo actualizado')
        navigate(`/cartera/acuerdos/${agreementId}`)
      } else {
        const res = await create.mutateAsync({ orgId: oid, data })
        const created = res.data as BillingAgreement
        toast.success('Acuerdo creado')
        navigate(`/cartera/acuerdos/${created.id}`)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar el acuerdo'))
    }
  })

  const backTo = isEdit && agreementId ? `/cartera/acuerdos/${agreementId}` : LIST

  if (isEdit && loadingAgreement) {
    return <DetailDrawer closeTo={backTo} loading />
  }

  /*
    Un acuerdo lo firma quien lleva la cartera: fuera operadores y lectores.
    El formulario se abría por URL a cualquiera y el 403 llegaba al guardar
    (§45). Aquí se dice antes de escribir nada.
  */
  if (!canManage) {
    return (
      <DetailDrawer closeTo={backTo} title={isEdit ? 'Editar acuerdo' : 'Nuevo acuerdo'}>
        <EmptyState
          Icon={Lock}
          title="No puedes gestionar acuerdos"
          description="Los acuerdos los llevan el dueño, un administrador o el contador. Pídeles que lo creen, o que te cambien el rol."
        />
      </DetailDrawer>
    )
  }

  return (
    <DetailDrawer
      closeTo={backTo}
      title={isEdit ? 'Editar acuerdo' : 'Nuevo acuerdo'}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(backTo)}>
            Cancelar
          </Button>
          {/* Fuera del <form>, así que se ata por id para poder enviarlo igual. */}
          <Button type="submit" form={FORM_ID} disabled={busy}>
            {busy && <Loader size="sm" />}
            {isEdit ? 'Guardar cambios' : 'Crear acuerdo'}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pagador" required error={errors.payerContactId?.message}>
                <ContactPicker
                  label="Pagador"
                  orgId={oid}
                  value={payerId || null}
                  onChange={(id) => setValue('payerContactId', id ?? '', { shouldValidate: true })}
                  invalid={!!errors.payerContactId}
                />
              </Field>
              <Field label="Beneficiario" hint="Opcional (ej. el estudiante)">
                <ContactPicker
                  label="Beneficiario"
                  orgId={oid}
                  value={beneficiaryId || null}
                  onChange={(id) => setValue('beneficiaryContactId', id ?? '')}
                  allowClear
                />
              </Field>
            </div>

            <Field label="Concepto" htmlFor="ag-concept" required error={errors.billingConceptId?.message}>
              <NativeSelect
                id="ag-concept"
                {...conceptReg}
                onChange={(e) => {
                  void conceptReg.onChange(e)
                  const c = concepts.find((x) => x.id === e.target.value)
                  if (c?.defaultAmount && !getValues('agreedAmount')) {
                    setValue('agreedAmount', c.defaultAmount)
                  }
                }}
              >
                <option value="">Selecciona…</option>
                {concepts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <MoneyField
                control={control}
                name="agreedAmount"
                label="Monto acordado"
                id="ag-amount"
                required
                error={errors.agreedAmount?.message}
                info="Valor de cada mensualidad que se generará automáticamente por este acuerdo."
              />
              <Field label="Moneda" htmlFor="ag-currency" error={errors.currency?.message}>
                <Input id="ag-currency" maxLength={3} {...register('currency')} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Inicio" htmlFor="ag-start" required error={errors.startDate?.message}>
                <Input id="ag-start" type="date" {...register('startDate')} />
              </Field>
              <Field label="Fin" htmlFor="ag-end" hint="Opcional" error={errors.endDate?.message}>
                <Input id="ag-end" type="date" {...register('endDate')} />
              </Field>
              <Field
                label="Vencimiento"
                htmlFor="ag-dueday"
                required
                info="Día del mes (1–31) en que vence cada mensualidad."
                error={errors.dueDay?.message}
              >
                <Input
                  id="ag-dueday"
                  className="nums"
                  type="number"
                  min={1}
                  max={31}
                  {...register('dueDay', { valueAsNumber: true })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Generar días antes"
                htmlFor="ag-genbefore"
                hint="0–60"
                info="Cuántos días antes del vencimiento se crea sola la cuenta por cobrar del mes. 0 = el mismo día."
                error={errors.generateDaysBefore?.message}
              >
                <Input
                  id="ag-genbefore"
                  className="nums"
                  type="number"
                  min={0}
                  max={60}
                  {...register('generateDaysBefore', { valueAsNumber: true })}
                />
              </Field>
              <Field label="Política de interés" htmlFor="ag-policy" hint="Opcional">
                <NativeSelect id="ag-policy" {...register('interestPolicyId')}>
                  <option value="">Sin interés de mora</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sede" htmlFor="ag-branch" hint="Opcional">
                <NativeSelect id="ag-branch" {...register('branchId')}>
                  <option value="">Sin sede</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Nombre / referencia" htmlFor="ag-name" hint="Opcional">
                <Input id="ag-name" {...register('name')} />
              </Field>
            </div>

            <Field label="Notas" htmlFor="ag-notes">
              <Textarea id="ag-notes" rows={2} {...register('notes')} />
            </Field>
      </form>
    </DetailDrawer>
  )
}
