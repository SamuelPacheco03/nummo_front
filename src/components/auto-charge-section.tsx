import { useState } from 'react'
import { Link } from 'react-router'
import { Zap, ZapOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DetailRow, DetailRows, DetailSection } from '@/components/ui/detail-drawer'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { NativeSelect } from '@/components/ui/native-select'
import { Note } from '@/components/ui/note'
import { StatusBadge } from '@/components/ui/status-badge'
import { useFinancialAccounts, usePaymentMethods } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { toastApiError } from '@/features/platform/errors'
import { formatDateHuman } from '@/lib/format'
import type { AutoCharge, SetAutoCharge } from '@/api/generated/model'

/** Todos los activos: son catálogos cortos y aquí se elige uno. */
const CATALOG = { page: 1, pageSize: 100, isActive: 'true', sort: 'name', order: 'asc' } as const

/** Lo que cambia entre las dos caras del espejo: palabras, no comportamiento. */
export interface AutoChargeCopy {
  /** «Cobro automático» · «Pago automático». */
  title: string
  /** Qué hace, en una frase. */
  description: string
  /** Lo que hay que saber **antes** de encenderlo. Es distinto en cada lado. */
  warning: { title: string; body: string }
  /** «Activar el cobro automático». */
  enableTitle: string
  /** Lo que se pierde al apagarlo. */
  disableDescription: string
}

/**
 * **El auto-registro de un recurrente**, en las dos caras del dinero.
 *
 * Un acuerdo de cobro y un gasto recurrente son la misma plantilla mirada desde
 * cada lado (§94.0), así que esto es **un componente y no dos**: lo que cambia
 * son una docena de palabras y a qué endpoint escribe.
 *
 * **Es un interruptor con su propia confirmación, no un campo del formulario.**
 * Encenderlo le da a un trabajo automático la autoridad de mover dinero todos
 * los meses, y eso no puede ser un efecto colateral de corregir un importe — por
 * eso el contrato le da endpoint propio y aquí tiene su propio diálogo (§54).
 *
 * **«Encendido sin cuenta de dónde sacar» no se puede expresar**, ni en el
 * contrato —que es una unión discriminada— ni aquí: la cuenta y el método se
 * eligen en el mismo acto de encenderlo.
 *
 * El permiso llega **como prop**: es distinto en cada cara —`payments.create` de
 * un lado, `disbursements.create` del otro— y un componente compartido no decide
 * autorización (§87.2).
 */
export function AutoChargeSection({
  autoCharge,
  canManage,
  copy,
  onSave,
}: {
  autoCharge: AutoCharge | null | undefined
  canManage: boolean
  copy: AutoChargeCopy
  onSave: (body: SetAutoCharge) => Promise<unknown>
}) {
  const { orgId } = useCurrentOrg()
  const { items: accounts } = useFinancialAccounts(orgId, CATALOG)
  const { items: methods } = usePaymentMethods(orgId, CATALOG)

  const [enableOpen, setEnableOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)
  const [accountId, setAccountId] = useState('')
  const [methodId, setMethodId] = useState('')
  const [saving, setSaving] = useState(false)

  const on = autoCharge?.mode === 'AUTO_RECORD'
  const accountName = accounts.find((a) => a.id === autoCharge?.financialAccountId)?.name
  const methodName = methods.find((m) => m.id === autoCharge?.paymentMethodId)?.name

  const save = async (body: SetAutoCharge, okMsg: string) => {
    setSaving(true)
    try {
      await onSave(body)
      toast.success(okMsg)
      setEnableOpen(false)
      setDisableOpen(false)
    } catch (err) {
      toastApiError(err, 'No se pudo cambiar el registro automático')
    } finally {
      setSaving(false)
    }
  }

  const enable = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!accountId || !methodId) return
    void save(
      { mode: 'AUTO_RECORD', financialAccountId: accountId, paymentMethodId: methodId },
      'Registro automático activado',
    )
  }

  return (
    <>
      <DetailSection
        title={copy.title}
        action={
          canManage &&
          (on ? (
            <Button variant="outline" size="sm" onClick={() => setDisableOpen(true)}>
              <ZapOff aria-hidden className="size-4" />
              Desactivar
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Se abre en blanco a propósito: elegir de dónde sale el dinero
                // es la mitad de la decisión, no un valor que se hereda.
                setAccountId('')
                setMethodId('')
                setEnableOpen(true)
              }}
            >
              <Zap aria-hidden className="size-4" />
              Activar
            </Button>
          ))
        }
      >
        <DetailRows>
          <DetailRow label="Estado">
            <StatusBadge
              tone={on ? 'success' : 'muted'}
              label={on ? 'Se registra solo' : 'Apagado'}
            />
          </DetailRow>
          {on && (
            <>
              <DetailRow label="Desde">{accountName}</DetailRow>
              <DetailRow label="Método">{methodName}</DetailRow>
              <DetailRow label="Activo desde">
                {autoCharge?.startDate ? formatDateHuman(autoCharge.startDate) : null}
              </DetailRow>
            </>
          )}
        </DetailRows>

        {!on && <p className="text-muted-foreground text-sm">{copy.description}</p>}

        {on && (
          <p className="text-muted-foreground text-sm">
            Si algún día no se puede registrar, te llega un aviso — puedes elegir por dónde en{' '}
            <Link className="text-brand underline underline-offset-4" to="/config/notificaciones">
              tus notificaciones
            </Link>
            .
          </p>
        )}
      </DetailSection>

      <FormDialog
        open={enableOpen}
        onOpenChange={setEnableOpen}
        title={copy.enableTitle}
        submitLabel="Activar"
        loading={saving}
        onSubmit={enable}
      >
        <Note tone="warning" title={copy.warning.title}>
          {copy.warning.body}
        </Note>

        <Field label="Cuenta de dinero" htmlFor="ac-account" required>
          <NativeSelect
            id="ac-account"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          >
            <option value="">Elige una cuenta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="Método de pago" htmlFor="ac-method" required>
          <NativeSelect
            id="ac-method"
            value={methodId}
            onChange={(event) => setMethodId(event.target.value)}
          >
            <option value="">Elige un método</option>
            {methods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        title="Desactivar el registro automático"
        description={copy.disableDescription}
        confirmLabel="Desactivar"
        loading={saving}
        onConfirm={() => void save({ mode: 'OFF' }, 'Registro automático desactivado')}
      />
    </>
  )
}
