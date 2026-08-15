import { formatAmount } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Lista de barras horizontales de UN solo tono (magnitud, no identidad → sin
 * problema de daltonismo). Valores directos, cifras tabulares, pista detrás.
 */
export function BarList({
  items,
  tone = 'bg-chart-1',
  currency,
  emptyLabel = 'Sin datos en el período.',
}: {
  items: { id: string; name: string; amount: string }[]
  tone?: string
  currency?: string
  emptyLabel?: string
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  }
  const max = Math.max(...items.map((i) => Number(i.amount) || 0), 1)

  return (
    <ul className="space-y-3">
      {items.map((i) => {
        const pct = ((Number(i.amount) || 0) / max) * 100
        return (
          <li key={i.id} className="space-y-1.5" title={`${i.name}: ${formatAmount(i.amount, currency)}`}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{i.name}</span>
              <span className="nums shrink-0 font-medium">{formatAmount(i.amount, currency)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn('h-2 rounded-full transition-[width]', tone)} style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
