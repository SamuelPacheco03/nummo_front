import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DonutChart } from '@/components/ui/chart'
import { downloadCsv } from '@/lib/csv'
import { formatMoney } from '@/lib/format'
import type { NamedAmount } from '@/api/generated/model'

/**
 * Desglose de un total: en qué se reparte y cuánto pesa cada parte.
 *
 * Antes era una lista de barras horizontales. La pregunta que responde este
 * panel no es «¿cuál es mayor?» —eso ya lo dice el orden— sino **«cómo se
 * reparte el total»**, y para eso una composición se lee de un vistazo. La
 * leyenda sigue llevando el importe exacto y el porcentaje, así que no se pierde
 * nada por el camino.
 *
 * El CSV exporta **todas** las filas, también las que el donut agrupa en
 * «Otros»: la gráfica resume, el archivo no (§59).
 */
export function ReportBreakdown({
  title,
  nameHeader,
  items,
  currency,
  csvFile,
  emptyLabel = 'Sin datos en el período.',
}: {
  title: string
  nameHeader: string
  items: NamedAmount[]
  currency?: string
  csvFile: string
  emptyLabel?: string
}) {
  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)

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
      <div className="space-y-4 p-4">
        <DonutChart
          slices={items.map((i) => ({ id: i.id, label: i.name, value: Number(i.amount) || 0 }))}
          currency={currency}
          empty={emptyLabel}
        />
        {total > 0 && (
          <div className="flex items-center justify-between border-t pt-3 text-sm font-medium">
            <span>Total</span>
            <span className="nums">{formatMoney(String(total), currency)}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
