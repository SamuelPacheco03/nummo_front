import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Ban, MoreHorizontal, Pause, Pencil, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DetailDrawer, DetailRow, DetailRows, DetailSection } from '@/components/ui/detail-drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { AutoChargeSection } from '@/components/auto-charge-section'
import { CollectionRemindersSection } from '@/features/messaging/collection-reminders-section'
import { useContact } from '@/features/contacts/hooks'
import { useBranches } from '@/features/config/hooks'
import { useBillingConcepts } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { getErrorMessage } from '@/lib/errors'
import { toastApiError } from '@/features/platform/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { useKeepFilters } from '@/lib/use-list-filters'
import { RECURRENCE_LABELS, agreementStatus } from './labels'
import {
  useAgreement,
  useEndAgreement,
  useInterestPolicies,
  usePauseAgreement,
  useResumeAgreement,
  useSetAgreementAutoCharge,
  useUpdateAgreement,
} from './hooks'

const LIST = '/cartera/acuerdos'

/**
 * Lo propio de esta cara del espejo. Lo que hay que decir antes de encenderlo no
 * es un detalle de copy: marcar cobrado **apaga la mora, el interés y los
 * recordatorios** de ese cobro, así que un automático puesto sobre plata que no
 * entra deja de perseguirla.
 */
const COPY = {
  title: 'Cobro automático',
  description:
    'Cada cobro de este acuerdo se registra como pagado el día que vence, sin que nadie lo toque.',
  warning: {
    title: 'Solo para plata que sabes que entra',
    body:
      'Marcar un cobro como pagado apaga su mora, su interés y sus recordatorios. Si el pago no llega de verdad, la cuenta queda saldada y nadie vuelve a perseguirla.',
  },
  enableTitle: 'Activar el cobro automático',
  disableDescription:
    'Los próximos cobros de este acuerdo volverán a esperar que alguien registre el pago. Lo ya registrado se queda como está.',
}

/**
 * Ficha de un acuerdo de cobro. Abre como cajón sobre la lista (§11.1.3).
 *
 * La cifra de cabecera es el monto pactado: es el dato por el que se abre esta
 * ficha, igual que el saldo lo es en una cuenta por cobrar.
 */
export function AgreementDetailPage() {
  const { agreementId } = useParams()
  const keepFilters = useKeepFilters()
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canManage = can('agreements.manage')
  // El auto-registro pide el permiso de **registrar el pago** que va a
  // registrar solo, no el de gestionar el acuerdo: son dos cosas distintas.
  const canAutoCharge = can('payments.create')

  const { agreement, isPending, isError, error } = useAgreement(orgId, agreementId)
  const pause = usePauseAgreement(orgId ?? '')
  const resume = useResumeAgreement(orgId ?? '')
  const end = useEndAgreement(orgId ?? '')
  const autoCharge = useSetAgreementAutoCharge(orgId ?? '')
  const update = useUpdateAgreement(orgId ?? '')
  const [endOpen, setEndOpen] = useState(false)

  const { contact: payer } = useContact(orgId, agreement?.payerContactId)
  const { contact: beneficiary } = useContact(orgId, agreement?.beneficiaryContactId ?? undefined)
  const { items: concepts } = useBillingConcepts(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'position',
    order: 'asc',
  })
  const { items: policies } = useInterestPolicies(orgId, {
    page: 1,
    pageSize: 100,
    sort: 'name',
    order: 'asc',
  })
  const { branches } = useBranches(orgId)

  const conceptName = useMemo(
    () => concepts.find((c) => c.id === agreement?.billingConceptId)?.name,
    [concepts, agreement],
  )
  const policyName = useMemo(
    () => policies.find((p) => p.id === agreement?.interestPolicyId)?.name,
    [policies, agreement],
  )
  const branchName = useMemo(
    () => branches.find((b) => b.id === agreement?.branchId)?.name,
    [branches, agreement],
  )

  if (isPending) return <DetailDrawer closeTo={LIST} loading />
  if (isError || !agreement) {
    return (
      <DetailDrawer
        closeTo={LIST}
        title="Acuerdo"
        error={getErrorMessage(error, 'No se encontró el acuerdo.')}
      />
    )
  }

  const busy = pause.isPending || resume.isPending || end.isPending
  const isOpen = agreement.status === 'ACTIVE' || agreement.status === 'PAUSED'

  const runLifecycle = async (action: typeof pause | typeof resume | typeof end, okMsg: string) => {
    try {
      await action.mutateAsync({ orgId: orgId ?? '', id: agreement.id })
      toast.success(okMsg)
      setEndOpen(false)
    } catch (err) {
      toastApiError(err)
    }
  }

  return (
    <>
      <DetailDrawer
        closeTo={LIST}
        title={payer?.displayName ?? agreement.name ?? 'Acuerdo'}
        meta={
          <span className="flex items-center gap-2">
            {conceptName ?? '—'}
            <span className="text-border">·</span>
            <StatusBadge {...agreementStatus(agreement.status)} />
          </span>
        }
        amount={formatAmount(agreement.agreedAmount, agreement.currency)}
        actions={
          canManage &&
          isOpen && (
            <>
              {/*
                Pausar o reanudar es lo que se viene a hacer con un acuerdo
                vivo; editar y finalizar son excepciones y no comparten altura.
              */}
              {agreement.status === 'ACTIVE' ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => runLifecycle(pause, 'Acuerdo pausado')}
                >
                  <Pause aria-hidden className="size-4" />
                  Pausar
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => runLifecycle(resume, 'Acuerdo reanudado')}
                >
                  <Play aria-hidden className="size-4" />
                  Reanudar
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal aria-hidden className="size-4" />
                    Más
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to={keepFilters(`/cartera/acuerdos/${agreement.id}/editar`)}>
                      <Pencil className="size-4" />
                      Editar acuerdo
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={busy} onClick={() => setEndOpen(true)}>
                    <Ban className="size-4" />
                    Finalizar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )
        }
      >
        <DetailSection title="Cobro">
          <DetailRows>
            <DetailRow label="Concepto">{conceptName}</DetailRow>
            <DetailRow label="Monto" strong>
              {formatAmount(agreement.agreedAmount, agreement.currency)}
            </DetailRow>
            <DetailRow label="Recurrencia">
              {RECURRENCE_LABELS[agreement.recurrenceType] ?? agreement.recurrenceType} · día{' '}
              {agreement.dueDay}
            </DetailRow>
            <DetailRow label="Vigencia">
              {formatDateHuman(agreement.startDate)}
              {agreement.endDate ? ` → ${formatDateHuman(agreement.endDate)}` : ' → sin fin'}
            </DetailRow>
            <DetailRow label="Se genera">{`${agreement.generateDaysBefore} días antes`}</DetailRow>
            <DetailRow label="Interés de mora">{policyName ?? 'Sin interés de mora'}</DetailRow>
          </DetailRows>
        </DetailSection>

        <AutoChargeSection
          autoCharge={agreement.autoCharge}
          canManage={canAutoCharge}
          copy={COPY}
          onSave={(data) =>
            autoCharge.mutateAsync({ orgId: orgId ?? '', id: agreement.id, data })
          }
        />

        <CollectionRemindersSection
          orgId={orgId}
          value={agreement.collectionReminders}
          canManage={canManage}
          onSave={(collectionReminders) =>
            update.mutateAsync({
              orgId: orgId ?? '',
              id: agreement.id,
              data: { collectionReminders },
            })
          }
        />

        <DetailSection title="Quién">
          <DetailRows>
            <DetailRow label="Pagador">
              {payer ? (
                <Link to={`/contactos/${payer.id}`} className="font-medium hover:underline">
                  {payer.displayName}
                </Link>
              ) : null}
            </DetailRow>
            <DetailRow label="Beneficiario">
              {beneficiary ? (
                <Link to={`/contactos/${beneficiary.id}`} className="hover:underline">
                  {beneficiary.displayName}
                </Link>
              ) : null}
            </DetailRow>
            <DetailRow label="Sede">{branchName}</DetailRow>
            <DetailRow label="Referencia">{agreement.name}</DetailRow>
            <DetailRow label="Notas">{agreement.notes}</DetailRow>
          </DetailRows>
        </DetailSection>
      </DetailDrawer>

      <ConfirmDialog
        open={endOpen}
        onOpenChange={setEndOpen}
        title="Finalizar acuerdo"
        description="El acuerdo dejará de generar cobros. Esta acción no se puede deshacer."
        confirmLabel="Finalizar"
        destructive
        loading={end.isPending}
        onConfirm={() => runLifecycle(end, 'Acuerdo finalizado')}
      />
    </>
  )
}
