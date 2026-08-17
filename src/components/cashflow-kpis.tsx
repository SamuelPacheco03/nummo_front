import { KpiStrip, KpiTile } from '@/components/kpi-tile'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { defaultPeriod, useCashflow } from '@/features/reports/hooks'
import { formatMoney, pctChange } from '@/lib/format'

/**
 * Las cifras de cabecera de una lista de dinero registrado: cuánto va en el mes
 * y cuánto fue el mes pasado.
 *
 * Sirve a **pagos y egresos**, que son la misma pantalla desde los dos lados.
 *
 * **Es flujo, no saldo**, y por eso no reutiliza `BalanceKpis`: una cartera se
 * resume por lo que queda vivo (total, vencido, al día) y una lista de pagos por
 * lo que se movió en un período. Copiar ahí las cifras de cartera habría sido
 * poner un número que no responde a la pregunta de la pantalla (§16).
 *
 * Sale de `/reports/cashflow`, que el backend firma con su período anterior
 * incluido — la comparación no se calcula aquí (§88.4).
 */
export function CashflowKpis({
  kind,
  label,
  previousLabel,
  currency,
}: {
  /** `income` en pagos, `expense` en egresos. */
  kind: 'income' | 'expense'
  /** «Cobrado este mes» / «Pagado este mes». */
  label: string
  /** «El mes pasado». */
  previousLabel: string
  currency?: string
}) {
  const { orgId } = useCurrentOrg()
  const { report, isPending } = useCashflow(orgId, defaultPeriod())

  if (isPending && !report) return <Skeleton className="h-[6.5rem]" />

  /*
    Encadenado hasta la propiedad, no solo hasta `report`: si el informe llega
    sin `current` —un error de red servido como 200, un backend a medio
    desplegar— `report?.current[kind]` revienta y se lleva por delante la lista
    entera. Una cifra que falta se calla; una pantalla en blanco, no.
  */
  const current = report?.current?.[kind]
  const previous = report?.previous?.[kind]

  return (
    <KpiStrip
      featured={
        <KpiTile
          featured
          label={label}
          value={formatMoney(current ?? '0', currency)}
          // Cobrar más es bueno; gastar más, no. La flecha acompaña al color:
          // nunca se informa solo con color (§43).
          delta={{ pct: pctChange(current, previous), higherIsGood: kind === 'income' }}
        />
      }
    >
      <KpiTile label={previousLabel} value={formatMoney(previous ?? '0', currency)} />
    </KpiStrip>
  )
}
