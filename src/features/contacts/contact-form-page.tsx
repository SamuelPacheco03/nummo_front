import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { Contact } from '@/api/generated/model'
import { useContact, useCreateContact, useUpdateContact } from './hooks'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const schema = z
  .object({
    contactType: z.enum(['PERSON', 'COMPANY']),
    firstName: z.string().trim().max(120).optional(),
    lastName: z.string().trim().max(120).optional(),
    companyName: z.string().trim().max(200).optional(),
    documentType: z.string().trim().max(40).optional(),
    documentNumber: z.string().trim().max(40).optional(),
    email: z
      .string()
      .trim()
      .max(320)
      .optional()
      .refine((v) => !v || EMAIL_RE.test(v), 'Email inválido'),
    phone: z.string().trim().max(40).optional(),
    address: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.contactType !== 'PERSON' || !!d.firstName, {
    path: ['firstName'],
    message: 'El nombre es obligatorio',
  })
  .refine((d) => d.contactType !== 'COMPANY' || !!d.companyName, {
    path: ['companyName'],
    message: 'La razón social es obligatoria',
  })

type Values = z.infer<typeof schema>

const EMPTY: Values = {
  contactType: 'PERSON',
  firstName: '',
  lastName: '',
  companyName: '',
  documentType: '',
  documentNumber: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
}

function toForm(c: Contact): Values {
  return {
    contactType: c.contactType,
    firstName: c.firstName ?? '',
    lastName: c.lastName ?? '',
    companyName: c.companyName ?? '',
    documentType: c.documentType ?? '',
    documentNumber: c.documentNumber ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    address: c.address ?? '',
    notes: c.notes ?? '',
  }
}

const nn = (v: string | undefined) => (v ? v : null)

export function ContactFormPage() {
  const { contactId } = useParams()
  const isEdit = !!contactId
  const navigate = useNavigate()
  const { orgId } = useCurrentOrg()
  const { contact, isPending: loadingContact } = useContact(orgId, contactId)
  const create = useCreateContact(orgId ?? '')
  const update = useUpdateContact(orgId ?? '')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  useEffect(() => {
    if (isEdit && contact) reset(toForm(contact))
  }, [isEdit, contact, reset])

  const contactType = watch('contactType')
  const busy = create.isPending || update.isPending

  const onSubmit = handleSubmit(async (values) => {
    const isPerson = values.contactType === 'PERSON'
    const data = {
      contactType: values.contactType,
      firstName: isPerson ? nn(values.firstName) : null,
      lastName: isPerson ? nn(values.lastName) : null,
      companyName: isPerson ? null : nn(values.companyName),
      documentType: nn(values.documentType),
      documentNumber: nn(values.documentNumber),
      email: nn(values.email),
      phone: nn(values.phone),
      address: nn(values.address),
      notes: nn(values.notes),
    }
    try {
      if (isEdit && contactId) {
        await update.mutateAsync({ orgId: orgId ?? '', contactId, data })
        toast.success('Contacto actualizado')
        navigate(`/contactos/${contactId}`)
      } else {
        const res = await create.mutateAsync({ orgId: orgId ?? '', data })
        const created = res.data as Contact
        toast.success('Contacto creado')
        navigate(`/contactos/${created.id}`)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar el contacto'))
    }
  })

  if (isEdit && loadingContact) {
    return <Skeleton className="h-96 w-full max-w-2xl" />
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title={isEdit ? 'Editar contacto' : 'Nuevo contacto'}>
        <Button asChild variant="ghost" size="sm">
          <Link to={isEdit && contactId ? `/contactos/${contactId}` : '/contactos'}>
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <form onSubmit={onSubmit} noValidate>
          <CardContent className="space-y-4">
            <div className="inline-flex rounded-md border p-0.5">
              {(['PERSON', 'COMPANY'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue('contactType', t, { shouldValidate: true })}
                  className={cn(
                    'rounded px-4 py-1.5 text-sm transition-colors',
                    contactType === t
                      ? 'bg-secondary font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t === 'PERSON' ? 'Persona' : 'Empresa'}
                </button>
              ))}
            </div>

            {contactType === 'PERSON' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombres" htmlFor="f-first" required error={errors.firstName?.message}>
                  <Input id="f-first" {...register('firstName')} />
                </Field>
                <Field label="Apellidos" htmlFor="f-last" error={errors.lastName?.message}>
                  <Input id="f-last" {...register('lastName')} />
                </Field>
              </div>
            ) : (
              <Field
                label="Razón social"
                htmlFor="f-company"
                required
                error={errors.companyName?.message}
              >
                <Input id="f-company" {...register('companyName')} />
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de documento" htmlFor="f-doctype" error={errors.documentType?.message}>
                <Input id="f-doctype" placeholder="CC, NIT, CE…" {...register('documentType')} />
              </Field>
              <Field label="Número de documento" htmlFor="f-docnum" error={errors.documentNumber?.message}>
                <Input id="f-docnum" className="nums" {...register('documentNumber')} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" htmlFor="f-email" error={errors.email?.message}>
                <Input id="f-email" type="email" {...register('email')} />
              </Field>
              <Field label="Teléfono" htmlFor="f-phone" error={errors.phone?.message}>
                <Input id="f-phone" {...register('phone')} />
              </Field>
            </div>

            <Field label="Dirección" htmlFor="f-address" error={errors.address?.message}>
              <Input id="f-address" {...register('address')} />
            </Field>

            <Field label="Notas" htmlFor="f-notes" error={errors.notes?.message}>
              <Textarea id="f-notes" rows={3} {...register('notes')} />
            </Field>
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isEdit && contactId ? `/contactos/${contactId}` : '/contactos')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear contacto'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
