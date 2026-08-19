import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Loader } from '@/components/ui/loader'
import { MoneyInput } from '@/components/ui/money-input'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { toastApiError } from '@/features/platform/errors'
import { useCan, useFeature } from '@/features/platform/permissions'
import { formatAmount } from '@/lib/format'
import { useHydrateOnce } from '@/lib/use-hydrate-once'
import { useOrgSettings, useUpdateApprovalPolicy } from './hooks'

/**
 * **El umbral por encima del cual un egreso necesita aprobación.**
 *
 * Vive aquí y no en «Empresa» porque es una política de gastos, hermana de las
 * políticas de interés en cartera — y porque su endpoint es propio: se audita
 * aparte y va detrás de la feature `approvals`.
 *
 * Lo que hay que entender antes de ponerlo, y por eso se dice en la pantalla:
 * por encima del umbral **no se mueve un peso** hasta que alguien firma. Un
 * egreso pendiente no es un egreso a medias, es una solicitud.
 */
export function ApprovalPolicyPage() {
  const { orgId, organization } = useCurrentOrg()
  const { settings, isPending, isError, error } = useOrgSettings(orgId)
  const save = useUpdateApprovalPolicy(orgId ?? '')
  const can = useCan()
  const hasFeature = useFeature('approvals')
  const canManage = can('organization.manage') && hasFeature

  const [threshold, setThreshold] = useState('')

  useHydrateOnce(settings?.organizationId, settings, (s) =>
    setThreshold(s.disbursementApprovalThreshold ?? ''),
  )

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      await save.mutateAsync({
        orgId: orgId ?? '',
        // Vacío apaga la política: es «sin umbral», no «umbral cero» —que haría
        // pasar por aprobación hasta el café—.
        data: { disbursementApprovalThreshold: threshold.trim() || null },
      })
      toast.success(threshold.trim() ? 'Umbral guardado' : 'Aprobaciones desactivadas')
    } catch (err) {
      toastApiError(err, 'No se pudo guardar el umbral')
    }
  }

  const activo = Boolean(settings?.disbursementApprovalThreshold)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Aprobación de egresos"
        description="Por encima de cierto monto, un egreso espera una firma antes de salir."
      />

      {!hasFeature && (
        <Note tone="info" title="Las aprobaciones son de un plan superior">
          Si ya tenías un umbral puesto, sigue aplicándose.{' '}
          <Link className="underline underline-offset-4" to="/config/plan">
            Mira los planes
          </Link>
          .
        </Note>
      )}

      {isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : isError ? (
        <ErrorState error={error} fallback="No se pudo cargar la política." />
      ) : (
        <form onSubmit={onSubmit}>
          <Card>
            <CardContent className="space-y-4">
              <Field
                label="Monto a partir del cual se pide aprobación"
                htmlFor="threshold"
                hint="Déjalo vacío para que ningún egreso necesite aprobación."
              >
                <MoneyInput
                  id="threshold"
                  value={threshold}
                  onChange={setThreshold}
                  disabled={!canManage}
                  placeholder="5.000.000"
                />
              </Field>

              <Note tone="warning" title="Qué cambia al ponerlo">
                Un egreso por encima del umbral se registra como <strong>solicitud</strong>: no
                sale dinero hasta que alguien con permiso de aprobar lo firma, y{' '}
                <strong>quien lo registró no puede aprobarlo</strong>. Se encuentran filtrando la
                lista de egresos por «Espera aprobación».
              </Note>

              {activo && settings?.disbursementApprovalThreshold && (
                <p className="text-muted-foreground text-sm">
                  Ahora mismo se pide aprobación desde{' '}
                  <span className="nums font-medium">
                    {formatAmount(
                      settings.disbursementApprovalThreshold,
                      organization?.defaultCurrency,
                    )}
                  </span>
                  .
                </p>
              )}
            </CardContent>
            {canManage && (
              <CardFooter className="justify-end">
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending && <Loader size="sm" />}
                  Guardar
                </Button>
              </CardFooter>
            )}
          </Card>
        </form>
      )}
    </div>
  )
}
