import { formatAmount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AgingBucketBucket, type AgingBucket } from '@/api/generated/model'

/** Etiqueta y tono por tramo de antigüedad: verde (por vencer) → rojo (+60 días). */
const META: Record<AgingBucketBucket, { label: string; tone: string }> = {
  [AgingBucketBucket.not_due]: { label: 'Por vencer', tone: 'bg-success' },
  [AgingBucketBucket.d1_30]: { label: '1–30 días', tone: 'bg-warning' },
  [AgingBucketBucket.d31_60]: { label: '31–60 días', tone: 'bg-destructive/60' },
  [AgingBucketBucket.d60_plus]: { label: '+60 días', tone: 'bg-destructive' },
}

/**
 * Aging de saldos abiertos: barra apilada 100% + leyenda con monto y nº de
 * cuentas por tramo de antigüedad. Reutilizado por cartera (cobros) y pagos.
 */
export function AgingChart({
  buckets,
  currency,
  emptyLabel = 'Nada pendiente. 🎉',
}: {
  buckets: AgingBucket[]
  currency?: string
  emptyLabel?: string
}) {
  const total = buckets.reduce((s, b) => s + (Number(b.amount) || 0), 0)
  if (total <= 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {buckets.map((b) => {
          const pct = ((Number(b.amount) || 0) / total) * 100
          if (pct <= 0) return null
          return (
            <div
              key={b.bucket}
              className={cn('h-full', META[b.bucket].tone)}
              style={{ width: `${pct}%` }}
              title={`${META[b.bucket].label}: ${formatAmount(b.amount, currency)}`}
            />
          )
        })}
      </div>

      <ul className="space-y-2">
        {buckets.map((b) => (
          <li key={b.bucket} className="flex items-center gap-2.5 text-sm">
            <span className={cn('size-2.5 shrink-0 rounded-sm', META[b.bucket].tone)} />
            <span className="flex-1 truncate">{META[b.bucket].label}</span>
            <span className="nums shrink-0 text-xs text-muted-foreground">
              {b.count} {b.count === 1 ? 'cuenta' : 'cuentas'}
            </span>
            <span className="nums w-32 shrink-0 text-right font-medium">{formatAmount(b.amount, currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
