import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useHydrateOnce } from '@/lib/use-hydrate-once'
import { orgStatus } from '@/features/organizations/labels'
import { useCan } from '@/features/platform/permissions'
import { getErrorMessage } from '@/lib/errors'
import { toastApiError } from '@/features/platform/errors'
import { formatDateHuman } from '@/lib/format'
import type { Organization, ProvisionSummary } from '@/api/generated/model'
import { useApplyTemplate, useOrgDetail, useUpdateOrg } from './hooks'

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  legalName: z.string().trim().max(200).optional(),
  taxId: z.string().trim().max(80).optional(),
  type: z.enum(['SCHOOL', 'SHOP', 'PERSONAL', 'GENERIC']),
  /*
    **El contacto de la empresa hacia fuera**, no el del equipo por dentro: eso son
    los miembros, cada uno con el suyo.

    Hoy lo usa la cobranza —lo mete en el recordatorio y lo exige al encenderse,
    porque el número desde el que salen los mensajes no recibe respuestas—, pero el
    dato es de la organización y no de esa función. Nombrarlo por su único
    consumidor de hoy sería lo que obliga a renombrarlo mañana.
  */
  contactPhone: z.string().trim().max(40, 'Máximo 40 caracteres.').optional(),
  contactEmail: z
    .string()
    .trim()
    .max(200, 'Máximo 200 caracteres.')
    .email('No parece un correo válido.')
    .or(z.literal(''))
    .optional(),
})
type Values = z.infer<typeof schema>

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
    contactPhone: org.contactPhone ?? '',
    contactEmail: org.contactEmail ?? '',
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
      toastApiError(err, 'No se pudo aplicar la plantilla')
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
            {apply.isPending && <Loader size="sm" />}
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
  const { orgId } = useCurrentOrg()
  const { organization, isPending, isError, error } = useOrgDetail(orgId)
  const update = useUpdateOrg(orgId ?? '')
  const can = useCan()
  const canManage = can('organization.manage')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  useHydrateOnce(organization?.id, organization, (org) => reset(toForm(org)))

  if (isPending) {
    return <Skeleton className="h-96 w-full" />
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
          // Vacío es «no lo pongo», que en el contrato es `null`.
          contactPhone: values.contactPhone ? values.contactPhone : null,
          contactEmail: values.contactEmail ? values.contactEmail : null,
        },
      })
      // Esta pantalla se queda: hay que marcarla limpia a mano con lo que se
      // guardó, porque ya no se rellena sola al refrescar (y es lo que apaga el
      // botón de guardar).
      reset(values)
      toast.success('Empresa actualizada')
    } catch (err) {
      toastApiError(err, 'No se pudo guardar')
    }
  })

  return (
    <div className="space-y-6">
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
            <Field label="Estado" hint="Lo administra Nummo; no se cambia desde aquí.">
              <div className="flex h-9 items-center">
                <StatusBadge {...orgStatus(organization.status)} />
              </div>
            </Field>
          </div>

          {/*
            **El contacto de la empresa hacia fuera**, y por eso va aquí y no
            colgando de la pantalla que hoy lo necesita: no es un campo de
            cobranza. La cobranza es solo el primer sitio que lo usa —lo mete en
            el recordatorio, y por eso lo exige al encenderse—, pero el dato es de
            la organización y lo van a leer más cosas.
          */}
          <div className="space-y-3 border-t pt-4">
            <div>
              <p className="text-sm font-medium">Contacto de la empresa</p>
              <p className="text-muted-foreground text-xs">
                A dónde te escribe quien trata contigo desde fuera: clientes, proveedores, quien
                recibe un cobro. Con uno de los dos basta.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Teléfono" htmlFor="c-phone" error={errors.contactPhone?.message}>
                <Input
                  id="c-phone"
                  inputMode="tel"
                  maxLength={40}
                  placeholder="+57 310 594 8908"
                  disabled={!canManage}
                  {...register('contactPhone')}
                />
              </Field>
              <Field label="Correo" htmlFor="c-email" error={errors.contactEmail?.message}>
                <Input
                  id="c-email"
                  type="email"
                  maxLength={200}
                  placeholder="cartera@miempresa.co"
                  disabled={!canManage}
                  {...register('contactEmail')}
                />
              </Field>
            </div>
          </div>
          {/*
            Lo que administra Nummo se enseña, no se esconde: la zona horaria decide
            a qué hora del día salen los recordatorios y el locale de dónde salen
            los festivos que la cobranza salta. Quitarlos de la vista dejaría esas
            dos preguntas sin respuesta en ninguna pantalla.
          */}
          <p className="text-muted-foreground text-xs">
            Moneda: <span className="text-foreground font-medium">{organization.defaultCurrency}</span>{' '}
            · Zona horaria: <span className="text-foreground font-medium">{organization.timezone}</span>{' '}
            · Locale: <span className="text-foreground font-medium">{organization.locale}</span>{' '}
            · Creada: {formatDateHuman(organization.createdAt)}
          </p>
          <p className="text-muted-foreground text-xs">
            La moneda, la zona horaria y el locale los administra Nummo; no se cambian desde aquí.
          </p>
        </CardContent>
        {canManage && (
          <CardFooter className="justify-end border-t pt-6">
            <Button type="submit" disabled={update.isPending || !isDirty}>
              {update.isPending && <Loader size="sm" />}
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
