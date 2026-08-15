import { type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Stat tile de KPI: etiqueta + número protagonista + delta vs período anterior.
 * El número va en tinta (token de texto); el delta usa color de estado CON flecha
 * (nunca color solo). higherIsGood define si subir es bueno (ingresos) o malo (gastos).
 */
export function KpiTile({
  label,
  value,
  sub,
  delta,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  delta?: { pct: number | null; higherIsGood: boolean }
}) {
  const showDelta = delta && delta.pct !== null && Number.isFinite(delta.pct)
  const up = showDelta ? (delta.pct as number) >= 0 : false
  const good = showDelta ? up === delta.higherIsGood : false
  const Icon = up ? ArrowUpRight : ArrowDownRight

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold nums">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {showDelta && (
          <span className={cn('inline-flex items-center gap-0.5', good ? 'text-success' : 'text-destructive')}>
            <Icon className="size-3.5" />
            {Math.abs(delta.pct as number).toFixed(1)}%
          </span>
        )}
        {sub && <span className="nums text-muted-foreground">{sub}</span>}
      </div>
    </div>
  )
}
