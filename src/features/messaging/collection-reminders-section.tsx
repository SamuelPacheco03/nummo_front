import { Link } from 'react-router'
import { toast } from 'sonner'
import { DetailSection } from '@/components/ui/detail-drawer'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { toastApiError } from '@/features/platform/errors'
import { useCan } from '@/features/platform/permissions'
import type { BillingAgreementCollectionReminders } from '@/api/generated/model'
import { useCollectionPolicy } from './hooks'
import { describeQuietWindow } from './quiet-hours'

type Mode = BillingAgreementCollectionReminders

const OPTIONS: { value: Mode; label: string }[] = [
  { value: 'INHERIT', label: 'Según la política' },
  { value: 'ON', label: 'Sí' },
  { value: 'OFF', label: 'No' },
]

/**
 * **¿Se le escribe por WhatsApp a quien debe *este* cobro?**
 *
 * Tri-estado y no un interruptor, y ahí está toda la gracia: `INHERIT` —el valor
 * por defecto— delega en la política de la organización, mientras que `ON` y
 * `OFF` son decisiones sobre **este** cobro.
 *
 * Con un booleano no habría forma de distinguir «este cliente pidió silencio» de
 * «nadie lo ha decidido», y al cambiar la política de la empresa se arrastraría a
 * quien había pedido que no. Por eso son tres opciones visibles y no un switch
 * con un tercer estado escondido.
 *
 * **Y el valor por defecto dice de qué está heredando.** «Según la política» a
 * secas obliga a irse a otra pantalla para saber qué significa; con la política
 * delante se lee de un vistazo si hoy eso es un sí o un no.
 */
export function CollectionRemindersSection({
  orgId,
  value,
  canManage,
  onSave,
}: {
  orgId: string | undefined
  value: Mode
  /** El permiso de gestionar el acuerdo: es el acuerdo lo que se está cambiando. */
  canManage: boolean
  onSave: (mode: Mode) => Promise<unknown>
}) {
  const can = useCan()
  // La política pide su propio permiso. Sin él el control sigue sirviendo: lo
  // que se pierde es poder decir qué significa heredar (§70).
  const { policy } = useCollectionPolicy(can('messaging.read') ? orgId : undefined)

  const change = async (mode: Mode) => {
    if (mode === value) return
    try {
      await onSave(mode)
      toast.success('Recordatorios actualizados')
    } catch (err) {
      toastApiError(err, 'No se pudieron actualizar los recordatorios')
    }
  }

  return (
    <DetailSection
      title="Recordatorios de cobro"
      action={
        canManage ? (
          <SegmentedControl
            aria-label="Recordatorios de cobro por WhatsApp"
            options={OPTIONS}
            value={value}
            onChange={(mode) => void change(mode)}
          />
        ) : (
          <span className="text-muted-foreground text-sm">{currentLabel(value)}</span>
        )
      }
    >
      <p className="text-muted-foreground text-sm">
        <Explanation mode={value} policy={policy} />
      </p>
    </DetailSection>
  )
}

function currentLabel(mode: Mode): string {
  return OPTIONS.find((o) => o.value === mode)?.label ?? mode
}

/**
 * Qué va a pasar de verdad con este cobro, en una frase.
 *
 * El caso que hay que contar bien es `INHERIT`, que es el default: decir «según
 * la política» y callarse qué dice la política deja la pregunta sin responder
 * justo en la opción que tiene casi todo el mundo.
 */
function Explanation({
  mode,
  policy,
}: {
  mode: Mode
  policy: ReturnType<typeof useCollectionPolicy>['policy']
}) {
  if (mode === 'OFF') {
    return <>A quien debe este cobro no se le escribe, aunque la organización tenga la cobranza encendida.</>
  }

  if (mode === 'ON') {
    return (
      <>
        A quien debe este cobro se le escribe, y sigue respetando las horas de silencio de la
        organización.
      </>
    )
  }

  if (!policy) {
    return <>Hace lo que diga la política de cobranza de la organización.</>
  }

  const window = describeQuietWindow(policy.quietStart, policy.quietEnd)
  return (
    <>
      Según la política de la organización:{' '}
      <strong className={policy.enabled ? 'text-success-strong' : 'text-foreground'}>
        {policy.enabled ? 'se le escribe' : 'no se le escribe'}
      </strong>
      {policy.enabled && !window.isEmpty && <> · en silencio {window.text.toLowerCase()}</>}.{' '}
      <Link to="/config/cobranza" className="text-brand underline">
        Cambiar la política
      </Link>
    </>
  )
}
