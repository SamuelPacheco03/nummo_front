import { formatMoney, formatCompactAmount, formatMonthLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MonthlyCashflow } from '@/api/generated/model'

/** Altura de barra como % del máximo, con mínimo visible para valores > 0. */
function barHeight(value: string, max: number): string {
  const n = Number(value) || 0
  if (n <= 0) return '0%'
  return `${Math.max((n / max) * 100, 3)}%`
}

/**
 * Flujo mensual: barras pareadas ingresos/egresos por mes con el neto debajo.
 * Sin librería de gráficos (barras CSS, como `BarList`) y con la paleta de la app
 * (ingresos = chart-2 verde, egresos = chart-4 ámbar).
 */
export function MonthlyFlowChart({
  items,
  currency,
  emptyLabel = 'Sin movimientos en el período.',
}: {
  items: MonthlyCashflow[]
  currency?: string
  emptyLabel?: string
}) {
  const hasData = items.some((m) => Number(m.income) || Number(m.expense))
  if (!hasData) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  }
  const max = Math.max(...items.flatMap((m) => [Number(m.income) || 0, Number(m.expense) || 0]), 1)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-2" /> Ingresos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-4" /> Egresos
        </span>
      </div>

      <div className="flex items-end gap-2 sm:gap-3">
        {items.map((m) => {
          const net = Number(m.net) || 0
          return (
            <div
              key={m.month}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              title={`${formatMonthLabel(m.month)} · Ingresos ${formatMoney(m.income, currency)} · Egresos ${formatMoney(m.expense, currency)} · Neto ${formatMoney(m.net, currency)}`}
            >
              <div className="flex h-28 w-full items-end justify-center gap-1">
                <div className="w-1/2 max-w-4 rounded-t bg-chart-2" style={{ height: barHeight(m.income, max) }} />
                <div className="w-1/2 max-w-4 rounded-t bg-chart-4" style={{ height: barHeight(m.expense, max) }} />
              </div>
              <span className="text-[11px] text-muted-foreground">{formatMonthLabel(m.month)}</span>
              <span className={cn('nums text-[11px] font-medium', net < 0 ? 'text-destructive' : 'text-foreground')}>
                {formatCompactAmount(m.net)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
