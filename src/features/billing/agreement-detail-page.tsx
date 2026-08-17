import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Ban, Pause, Pencil, Play } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useContact } from '@/features/contacts/hooks'
import { useBranches } from '@/features/config/hooks'
import { useBillingConcepts } from '@/features/masters/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageAgreements } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import type { ReactNode } from 'react'
import { RECURRENCE_LABELS, agreementStatus } from './labels'
import {
  useAgreement,
  useEndAgreement,
  useInterestPolicies,
  usePauseAgreement,
  useResumeAgreement,
} from './hooks'


function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  if (children == null || children === '') return null
  return (
    <div className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words">{children}</dd>
    </div>
  )
}

export function AgreementDetailPage() {
  const { agreementId } = useParams()
  const { orgId, role } = useCurrentOrg()
  const canManage = canManageAgreements(role)

  const { agreement, isPending, isError, error } = useAgreement(orgId, agreementId)
  const pause = usePauseAgreement(orgId ?? '')
  const resume = useResumeAgreement(orgId ?? '')
  const end = useEndAgreement(orgId ?? '')
  const [endOpen, setEndOpen] = useState(false)

  const { contact: payer } = useContact(orgId, agreement?.payerContactId)
  const { contact: beneficiary } = useContact(orgId, agreement?.beneficiaryContactId ?? undefined)
  const { items: concepts } = useBillingConcepts(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
  const { items: policies } = useInterestPolicies(orgId, { page: 1, pageSize: 100, sort: 'name', order: 'asc' })
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

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (isError || !agreement) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cartera/acuerdos">
            <ArrowLeft className="size-4" />
            Acuerdos
          </Link>
        </Button>
        <p className="text-sm text-destructive">{getErrorMessage(error, 'No se encontró el acuerdo.')}</p>
      </div>
    )
  }

  const busy = pause.isPending || resume.isPending || end.isPending

  const runLifecycle = async (
    action: typeof pause | typeof resume | typeof end,
    okMsg: string,
  ) => {
    try {
      await action.mutateAsync({ orgId: orgId ?? '', id: agreement.id })
      toast.success(okMsg)
      setEndOpen(false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/cartera/acuerdos">
            <ArrowLeft className="size-4" />
            Acuerdos
          </Link>
        </Button>
        <PageHeader
          title={payer?.displayName ?? agreement.name ?? 'Acuerdo'}
          description={
            <StatusBadge {...agreementStatus(agreement.status)} />
          }
        >
          {canManage && (
            <>
              {agreement.status === 'ACTIVE' && (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => runLifecycle(pause, 'Acuerdo pausado')}>
                  <Pause className="size-4" />
                  Pausar
                </Button>
              )}
              {agreement.status === 'PAUSED' && (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => runLifecycle(resume, 'Acuerdo reanudado')}>
                  <Play className="size-4" />
                  Reanudar
                </Button>
              )}
              {(agreement.status === 'ACTIVE' || agreement.status === 'PAUSED') && (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/cartera/acuerdos/${agreement.id}/editar`}>
                      <Pencil className="size-4" />
                      Editar
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => setEndOpen(true)}>
                    <Ban className="size-4" />
                    Finalizar
                  </Button>
                </>
              )}
            </>
          )}
        </PageHeader>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium">Detalle</h2>
        <Card className="gap-0 py-0">
          <dl className="divide-y">
            <InfoRow label="Referencia">{agreement.name}</InfoRow>
            <InfoRow label="Pagador">
              {payer ? (
                <Link to={`/contactos/${payer.id}`} className="font-medium hover:underline">
                  {payer.displayName}
                </Link>
              ) : (
                '—'
              )}
            </InfoRow>
            <InfoRow label="Beneficiario">
              {beneficiary ? (
                <Link to={`/contactos/${beneficiary.id}`} className="hover:underline">
                  {beneficiary.displayName}
                </Link>
              ) : null}
            </InfoRow>
            <InfoRow label="Concepto">{conceptName ?? '—'}</InfoRow>
            <InfoRow label="Monto">
              <span className="nums font-medium">{formatAmount(agreement.agreedAmount, agreement.currency)}</span>
            </InfoRow>
            <InfoRow label="Recurrencia">
              {RECURRENCE_LABELS[agreement.recurrenceType] ?? agreement.recurrenceType} · día {agreement.dueDay}
            </InfoRow>
            <InfoRow label="Vigencia">
              {formatDateHuman(agreement.startDate)}
              {agreement.endDate ? ` → ${formatDateHuman(agreement.endDate)}` : ' → sin fin'}
            </InfoRow>
            <InfoRow label="Generar días antes">{`${agreement.generateDaysBefore} días`}</InfoRow>
            <InfoRow label="Política de interés">{policyName ?? 'Sin interés de mora'}</InfoRow>
            <InfoRow label="Sede">{branchName ?? null}</InfoRow>
            <InfoRow label="Notas">{agreement.notes ?? null}</InfoRow>
          </dl>
        </Card>
      </section>

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
    </div>
  )
}
