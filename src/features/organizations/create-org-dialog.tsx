import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/errors'
import { useCreateOrganization } from './hooks'

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  legalName: z.string().trim().max(200).optional(),
  taxId: z.string().trim().max(80).optional(),
  defaultCurrency: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v.length === 3, 'Usa 3 letras (ej. COP)'),
})

type Values = z.infer<typeof schema>

export function CreateOrgDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateOrganization()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', legalName: '', taxId: '', defaultCurrency: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        data: {
          name: values.name,
          legalName: values.legalName || undefined,
          taxId: values.taxId || undefined,
          defaultCurrency: values.defaultCurrency
            ? values.defaultCurrency.toUpperCase()
            : undefined,
        },
      })
      toast.success('Organización creada')
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo crear la organización'))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva organización</DialogTitle>
          <DialogDescription>Quedarás como propietario (OWNER).</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Nombre" htmlFor="org-name" required error={errors.name?.message}>
            <Input id="org-name" placeholder="Jardín Infantil Demo" {...register('name')} />
          </Field>
          <Field label="Razón social" htmlFor="org-legal" error={errors.legalName?.message}>
            <Input id="org-legal" {...register('legalName')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="NIT / Tax ID" htmlFor="org-tax" error={errors.taxId?.message}>
              <Input id="org-tax" {...register('taxId')} />
            </Field>
            <Field
              label="Moneda"
              htmlFor="org-currency"
              hint="3 letras"
              error={errors.defaultCurrency?.message}
            >
              <Input id="org-currency" placeholder="COP" maxLength={3} {...register('defaultCurrency')} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="size-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
