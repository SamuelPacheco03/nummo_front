import { KpiStrip, KpiTile } from '@/components/kpi-tile'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney, plural } from '@/lib/format'

/**
 * Las tres cifras de cabecera de una cartera: el total, lo vencido y lo que va
 * al día.
 *
 * Sirve a **cuentas por cobrar y por pagar**, que son la misma pantalla mirada
 * desde los dos lados. Solo cambian las etiquetas.
 *
 * «Al día» es `total − vencido`, calculado aquí. Son dos cifras que el API sí
 * devuelve, no un saldo inventado (§88.4), y responde la pregunta que las otras
 * dos dejan a medias: cuánto de esto va bien.
 *
 * `openCount` es opcional porque el resumen de cuentas por pagar no lo trae. Sin
 * él, el subtítulo se calla en vez de enseñar un cero que no significa «cero»
 * (§70).
 */
export function BalanceKpis({
  label,
  totalOutstanding,
  overdueAmount,
  overdueCount,
  openCount,
  currency,
  isLoading,
}: {
  /** «Por cobrar» o «Por pagar». */
  label: string
  totalOutstanding?: string
  overdueAmount?: string
  overdueCount: number
  /** Cuentas abiertas, cuando el resumen las devuelve. */
  openCount?: number
  currency?: string
  isLoading?: boolean
}) {
  if (isLoading) return <Skeleton className="h-[6.5rem]" />

  const total = Number(totalOutstanding ?? 0)
  const overdue = Number(overdueAmount ?? 0)
  const share = total > 0 ? Math.round((overdue / total) * 100) : null

  return (
    <KpiStrip
      featured={
        <KpiTile
          featured
          label={label}
          value={formatMoney(totalOutstanding ?? '0', currency)}
          sub={
            openCount === undefined
              ? undefined
              : plural(openCount, 'cuenta abierta', 'cuentas abiertas')
          }
        />
      }
    >
      <KpiTile
        label="Vencido"
        value={formatMoney(overdueAmount ?? '0', currency)}
        sub={
          share === null
            ? plural(overdueCount, 'cuenta', 'cuentas')
            : `${overdueCount} · ${share}% del total`
        }
      />
      <KpiTile
        label="Al día"
        value={formatMoney(total - overdue, currency)}
        sub={
          openCount === undefined
            ? undefined
            : plural(Math.max(openCount - overdueCount, 0), 'cuenta', 'cuentas')
        }
      />
    </KpiStrip>
  )
}
