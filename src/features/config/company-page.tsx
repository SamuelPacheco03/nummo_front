import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageOrg } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatDateHuman } from '@/lib/format'
import type { Organization, ProvisionSummary } from '@/api/generated/model'
import { useApplyTemplate, useOrgDetail, useUpdateOrg } from './hooks'

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  legalName: z.string().trim().max(200).optional(),
  taxId: z.string().trim().max(80).optional(),
  type: z.enum(['SCHOOL', 'SHOP', 'PERSONAL', 'GENERIC']),
  timezone: z.string().trim().max(80).optional(),
  locale: z.string().trim().max(20).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']),
})
type Values = z.infer<typeof schema>

const STATUS_LABELS: Record<Values['status'], string> = {
  ACTIVE: 'Activa',
  SUSPENDED: 'Suspendida',
  ARCHIVED: 'Archivada',
}

const ORG_TYPES = ['SCHOOL', 'SHOP', 'PERSONAL', 'GENERIC'] as const
const ORG_TYPE_LABELS: Record<Values['type'], string> = {
  SCHOOL: 'Colegio / Jardín',
  SHOP: 'Comercio / Tienda',
  PERSONAL: 'Personal',
  GENERIC: 'Genérico',
}

function toForm(org: Organization): Values {
  return {
    name: org.name,
    legalName: org.legalName ?? '',
    taxId: org.taxId ?? '',
    type: org.type,
    timezone: org.timezone,
    locale: org.locale,
    status: org.status,
  }
}

/** Aprovisiona la organización con una plantilla de datos según su tipo (rubro). */
function ProvisionCard({ orgId, initialType }: { orgId: string; initialType: Values['type'] }) {
  const apply = useApplyTemplate()
  const [type, setType] = useState<Values['type']>(initialType)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [summary, setSummary] = useState<ProvisionSummary | null>(null)

  const onConfirm = async () => {
    try {
      const res = await apply.mutateAsync({ orgId, data: { type } })
      setSummary(res.data as ProvisionSummary)
      setConfirmOpen(false)
      toast.success('Plantilla aplicada')
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo aplicar la plantilla'))
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-1">
          <h2 className="font-medium">Provisionar con plantilla</h2>
          <p className="text-sm text-muted-foreground">
            Crea de una vez un set inicial de conceptos de cobro, categorías de gasto, métodos de pago y
            cuentas según el tipo de organización. Puedes editarlos o borrarlos después.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="tpl-type">Plantilla</Label>
            <NativeSelect
              id="tpl-type"
              className="w-56"
              value={type}
              onChange={(e) => setType(e.target.value as Values['type'])}
            >
              {ORG_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ORG_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button type="button" variant="outline" onClick={() => setConfirmOpen(true)} disabled={apply.isPending}>
            {apply.isPending && <Loader2 className="size-4 animate-spin" />}
            Provisionar
          </Button>
        </div>
        {summary && (
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Listo: <span className="font-medium text-foreground">{summary.billingConcepts}</span> conceptos ·{' '}
            <span className="font-medium text-foreground">{summary.expenseCategories}</span> categorías ·{' '}
            <span className="font-medium text-foreground">{summary.paymentMethods}</span> métodos ·{' '}
            <span className="font-medium text-foreground">{summary.financialAccounts}</span> cuentas.
          </p>
        )}
      </CardContent>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Provisionar con plantilla"
        description={`Se crearán conceptos, categorías, métodos y cuentas de ejemplo para "${ORG_TYPE_LABELS[type]}". Puedes ajustarlos luego.`}
        confirmLabel="Provisionar"
        loading={apply.isPending}
        onConfirm={onConfirm}
      />
    </Card>
  )
}

export function CompanyPage() {
  const { orgId, role } = useCurrentOrg()
  const { organization, isPending, isError, error } = useOrgDetail(orgId)
  const update = useUpdateOrg(orgId ?? '')
  const canManage = canManageOrg(role)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (organization) reset(toForm(organization))
  }, [organization, reset])

  if (isPending) {
    return <Skeleton className="h-96 w-full max-w-2xl" />
  }
  if (isError || !organization) {
    return (
      <p className="text-sm text-destructive">{getErrorMessage(error, 'No se pudo cargar la empresa.')}</p>
    )
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        orgId: orgId ?? '',
        data: {
          name: values.name,
          legalName: values.legalName ? values.legalName : null,
          taxId: values.taxId ? values.taxId : null,
          type: values.type,
          timezone: values.timezone || undefined,
          locale: values.locale || undefined,
          status: values.status,
        },
      })
      toast.success('Empresa actualizada')
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar'))
    }
  })

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Empresa" description="Datos y estado de la organización." />
      <Card>
        <form onSubmit={onSubmit} noValidate>
        <CardContent className="space-y-4">
          <Field label="Nombre" htmlFor="c-name" required error={errors.name?.message}>
            <Input id="c-name" disabled={!canManage} {...register('name')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Razón social" htmlFor="c-legal" error={errors.legalName?.message}>
              <Input id="c-legal" disabled={!canManage} {...register('legalName')} />
            </Field>
            <Field label="NIT / Tax ID" htmlFor="c-tax" error={errors.taxId?.message}>
              <Input id="c-tax" disabled={!canManage} {...register('taxId')} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Tipo de organización"
              htmlFor="c-type"
              info="Define el rubro y la plantilla de datos iniciales (colegio, comercio, personal…)."
              error={errors.type?.message}
            >
              <NativeSelect id="c-type" disabled={!canManage} {...register('type')}>
                {ORG_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ORG_TYPE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Estado" htmlFor="c-status" error={errors.status?.message}>
              <NativeSelect id="c-status" disabled={!canManage} {...register('status')}>
                {(Object.keys(STATUS_LABELS) as Values['status'][]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Zona horaria" htmlFor="c-tz" error={errors.timezone?.message}>
              <Input id="c-tz" placeholder="America/Bogota" disabled={!canManage} {...register('timezone')} />
            </Field>
            <Field label="Locale" htmlFor="c-locale" error={errors.locale?.message}>
              <Input id="c-locale" placeholder="es-CO" disabled={!canManage} {...register('locale')} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Moneda: <span className="font-medium text-foreground">{organization.defaultCurrency}</span>{' '}
            · Creada: {formatDateHuman(organization.createdAt)}
          </p>
        </CardContent>
        {canManage && (
          <CardFooter className="justify-end border-t pt-6">
            <Button type="submit" disabled={update.isPending || !isDirty}>
              {update.isPending && <Loader2 className="size-4 animate-spin" />}
              Guardar cambios
            </Button>
          </CardFooter>
        )}
        </form>
      </Card>
      {canManage && <ProvisionCard orgId={orgId ?? ''} initialType={organization.type} />}
    </div>
  )
}
