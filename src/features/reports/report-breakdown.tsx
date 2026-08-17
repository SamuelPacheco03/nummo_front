import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { downloadCsv } from '@/lib/csv'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { NamedAmount } from '@/api/generated/model'

/**
 * Desglose de un total en filas nombre → monto, con barra de magnitud (un tono),
 * porcentaje del total, fila de total y exportación a CSV. Reutilizable para
 * "ingresos por concepto", "egresos por categoría", etc.
 */
export function ReportBreakdown({
  title,
  nameHeader,
  items,
  tone = 'bg-chart-1',
  currency,
  csvFile,
  emptyLabel = 'Sin datos en el período.',
}: {
  title: string
  nameHeader: string
  items: NamedAmount[]
  tone?: string
  currency?: string
  csvFile: string
  emptyLabel?: string
}) {
  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const max = Math.max(...items.map((i) => Number(i.amount) || 0), 1)

  const onExport = () =>
    downloadCsv(
      csvFile,
      [nameHeader, 'Monto'],
      items.map((i) => [i.name, i.amount]),
    )

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="font-display text-sm font-semibold">{title}</h2>
        <Button variant="outline" size="sm" onClick={onExport} disabled={items.length === 0}>
          <Download className="size-4" />
          CSV
        </Button>
      </div>
      <div className="p-4">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((i) => {
                const val = Number(i.amount) || 0
                const share = total > 0 ? (val / total) * 100 : 0
                return (
                  <li key={i.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{i.name}</span>
                      <span className="nums shrink-0 font-medium">{formatMoney(i.amount, currency)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-2 rounded-full', tone)}
                          style={{ width: `${Math.max((val / max) * 100, 2)}%` }}
                        />
                      </div>
                      <span className="nums w-9 shrink-0 text-right text-xs text-muted-foreground">
                        {share.toFixed(0)}%
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm font-medium">
              <span>Total</span>
              <span className="nums">{formatMoney(String(total), currency)}</span>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
