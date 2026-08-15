import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageOrg } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatDateHuman } from '@/lib/format'
import type { Organization } from '@/api/generated/model'
import { useOrgDetail, useUpdateOrg } from './hooks'

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  legalName: z.string().trim().max(200).optional(),
  taxId: z.string().trim().max(80).optional(),
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

function toForm(org: Organization): Values {
  return {
    name: org.name,
    legalName: org.legalName ?? '',
    taxId: org.taxId ?? '',
    timezone: org.timezone,
    locale: org.locale,
    status: org.status,
  }
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
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Zona horaria" htmlFor="c-tz" error={errors.timezone?.message}>
              <Input id="c-tz" placeholder="America/Bogota" disabled={!canManage} {...register('timezone')} />
            </Field>
            <Field label="Locale" htmlFor="c-locale" error={errors.locale?.message}>
              <Input id="c-locale" placeholder="es-CO" disabled={!canManage} {...register('locale')} />
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
    </div>
  )
}
