import { useState } from 'react'
import { useParams } from 'react-router'
import { PauseCircle, PlayCircle, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import type { ChangePlanInputPlanCode } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import {
  DetailDrawer,
  DetailRow,
  DetailRows,
  DetailSection,
} from '@/components/ui/detail-drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { NativeSelect } from '@/components/ui/native-select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { orgStatus } from '@/features/organizations/labels'
import { toastApiError } from '@/features/platform/errors'
import {
  FEATURE_KEYS,
  featureTitle,
  LIMIT_KEYS,
  limitLabel,
  planLabel,
} from '@/features/platform/labels'
import { getErrorMessage } from '@/lib/errors'
import { formatDateHuman, formatMonthLabel } from '@/lib/format'
import { useAdminOrganization, useChangePlan, useSetOrgStatus } from './hooks'
import { OverridesDialog } from './overrides-dialog'

const LIST = '/plataforma/organizaciones'

const PLAN_CODES: ChangePlanInputPlanCode[] = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE']

/** «200» · «Sin límite» — igual que en la cara del cliente: `null` es ilimitado. */
function maxLabel(max: number | null | undefined): string {
  if (max === undefined) return '—'
  return max === null ? 'Sin límite' : max.toLocaleString('es-CO')
}

/**
 * Cambiar de plan cierra la suscripción anterior y abre otra, así que el
 * histórico queda consultable. No es un campo más de un formulario largo: va en
 * su propio diálogo para que sea un acto deliberado.
 */
function ChangePlanDialog({
  orgId,
  current,
  open,
  onOpenChange,
}: {
  orgId: string
  current: ChangePlanInputPlanCode
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const change = useChangePlan()
  const [planCode, setPlanCode] = useState<ChangePlanInputPlanCode>(current)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      await change.mutateAsync({ orgId, data: { planCode } })
      toast.success(`Plan cambiado a ${planLabel(planCode)}`)
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'No se pudo cambiar el plan')
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cambiar de plan"
      description="Se cierra la suscripción actual y se abre otra; los topes se recalculan al momento. Las condiciones negociadas se conservan."
      submitLabel="Cambiar plan"
      loading={change.isPending}
      onSubmit={onSubmit}
    >
      <Field label="Plan" htmlFor="plan-code">
        <NativeSelect
          id="plan-code"
          value={planCode}
          onChange={(e) => setPlanCode(e.target.value as ChangePlanInputPlanCode)}
        >
          {PLAN_CODES.map((code) => (
            <option key={code} value={code}>
              {planLabel(code)}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </FormDialog>
  )
}

/**
 * Suspender y reactivar son **el mismo diálogo**, y no dos: cambia el estado de
 * destino y una frase. Dos formularios calcados es justo lo que CLAUDE.md pide
 * no escribir.
 *
 * Suspender no borra nada: la organización sigue viendo y exportando su historia
 * y deja de poder registrar. Es una medida comercial, no un castigo.
 */
function StatusDialog({
  orgId,
  target,
  open,
  onOpenChange,
}: {
  orgId: string
  target: 'SUSPENDED' | 'ACTIVE'
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const setStatus = useSetOrgStatus()
  const [reason, setReason] = useState('')
  const suspending = target === 'SUSPENDED'

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      await setStatus.mutateAsync({
        orgId,
        data: { status: target, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      })
      toast.success(suspending ? 'Organización suspendida' : 'Organización reactivada')
      setReason('')
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'No se pudo cambiar el estado')
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={suspending ? 'Suspender organización' : 'Reactivar organización'}
      description={
        suspending
          ? 'Queda en solo lectura: sigue consultando y exportando su historia, y deja de poder registrar. No se borra nada.'
          : 'Vuelve a poder registrar y modificar, con todo lo que tenía.'
      }
      submitLabel={suspending ? 'Suspender' : 'Reactivar'}
      loading={setStatus.isPending}
      onSubmit={onSubmit}
    >
      <Field label="Motivo" htmlFor="status-reason" hint="Queda en la auditoría. Opcional.">
        <Textarea
          id="status-reason"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
    </FormDialog>
  )
}

/**
 * **La ficha de una organización vista desde la plataforma**: su plan, sus topes
 * efectivos, lo que lleva consumido y lo que se le ha negociado.
 *
 * Cuelga de la lista como ruta hija y abre en cajón sobre ella, igual que
 * cualquier otra ficha de la app (§87.5).
 */
export function AdminOrganizationDetailPage() {
  const { orgId } = useParams()
  const { detail, isPending, isError, error } = useAdminOrganization(orgId)
  const errorText = isError ? getErrorMessage(error, 'No se pudo cargar la organización.') : null
  const [planOpen, setPlanOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [overridesOpen, setOverridesOpen] = useState(false)

  const suspended = detail ? detail.status !== 'ACTIVE' : false
  const overriddenLimits = detail?.overrides.limits ?? {}
  const overriddenFeatures = detail?.overrides.features ?? {}
  const negotiated =
    Object.keys(overriddenLimits).length + Object.keys(overriddenFeatures).length

  return (
    <>
      <DetailDrawer
        closeTo={LIST}
        title={detail?.name}
        loading={isPending}
        error={errorText}
        meta={
          detail && (
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge {...orgStatus(detail.status)} />
              <span className="text-muted-foreground">Plan {planLabel(detail.planCode)}</span>
            </span>
          )
        }
        actions={
          detail && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Acciones
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onClick={() => setPlanOpen(true)}>
                  <SlidersHorizontal className="size-4" />
                  Cambiar de plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOverridesOpen(true)}>
                  <SlidersHorizontal className="size-4" />
                  Negociar condiciones
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusOpen(true)}>
                  {suspended ? <PlayCircle className="size-4" /> : <PauseCircle className="size-4" />}
                  {suspended ? 'Reactivar' : 'Suspender'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      >
        {detail && (
          <div className="space-y-5">
            <DetailSection title="La organización">
              <DetailRows>
                <DetailRow label="Tipo">{detail.type}</DetailRow>
                <DetailRow label="Creada">{formatDateHuman(detail.createdAt)}</DetailRow>
                <DetailRow label="Miembros">{detail.members}</DetailRow>
                <DetailRow label="Contactos">{detail.contacts.toLocaleString('es-CO')}</DetailRow>
              </DetailRows>
            </DetailSection>

            <DetailSection title={`Consumo de ${formatMonthLabel(detail.period)}`}>
              <DetailRows>
                <DetailRow label="Mensajes de Numi">
                  {detail.usage.ai_messages_monthly ?? 0}
                </DetailRow>
                <DetailRow label="Minutos de voz">
                  {detail.usage.voice_minutes_monthly ?? 0}
                </DetailRow>
              </DetailRows>
            </DetailSection>

            {/*
              Topes y features **efectivos**: el plan con las condiciones
              negociadas ya aplicadas. Es lo que aplican los guards, así que es lo
              que hay que poder leer de un vistazo — con la marca de lo que está
              negociado, para no confundir «lo da su plan» con «se lo dimos».
            */}
            <DetailSection title="Topes efectivos">
              <DetailRows>
                {LIMIT_KEYS.map((key) => (
                  <DetailRow
                    key={key}
                    label={limitLabel(key).charAt(0).toUpperCase() + limitLabel(key).slice(1)}
                  >
                    {maxLabel(detail.limits[key])}
                    {Object.hasOwn(overriddenLimits, key) && (
                      <span className="text-brand ml-2 text-xs">negociado</span>
                    )}
                  </DetailRow>
                ))}
              </DetailRows>
            </DetailSection>

            <DetailSection title="Features">
              <DetailRows>
                {FEATURE_KEYS.map((key) => (
                  <DetailRow key={key} label={featureTitle(key)}>
                    {detail.features[key] ? 'Incluida' : 'No incluida'}
                    {Object.hasOwn(overriddenFeatures, key) && (
                      <span className="text-brand ml-2 text-xs">negociado</span>
                    )}
                  </DetailRow>
                ))}
              </DetailRows>
            </DetailSection>

            {negotiated === 0 && (
              <p className="text-muted-foreground text-xs">
                Sin condiciones negociadas: todo sale de su plan.
              </p>
            )}
          </div>
        )}
      </DetailDrawer>

      {detail && (
        <>
          <ChangePlanDialog
            orgId={detail.id}
            current={detail.planCode}
            open={planOpen}
            onOpenChange={setPlanOpen}
          />
          <StatusDialog
            orgId={detail.id}
            target={suspended ? 'ACTIVE' : 'SUSPENDED'}
            open={statusOpen}
            onOpenChange={setStatusOpen}
          />
          <OverridesDialog detail={detail} open={overridesOpen} onOpenChange={setOverridesOpen} />
        </>
      )}
    </>
  )
}
