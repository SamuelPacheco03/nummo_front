import { useState } from 'react'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Chart, type ChartSeries } from '@/components/ui/chart'
import { formatMonthLabel } from '@/lib/format'
import type { MonthlyCashflow } from '@/api/generated/model'

type Shape = 'bars' | 'line'

/**
 * **Flujo de los últimos meses**: cuánto entró, cuánto salió y qué quedó.
 *
 * Vive aquí y no dentro de una página porque lo usan dos —el Panel y el
 * informe—, y una gráfica que dice lo mismo en dos sitios tiene que ser la
 * misma. Lo genérico (ejes, tooltip, colores, vacío) lo pone `Chart`; esto solo
 * traduce el reporte del API a series.
 *
 * **Las dos formas responden preguntas distintas** y por eso se conservan las
 * dos: en barras se comparan meses concretos —¿agosto fue mejor que julio?—; en
 * línea se ve la tendencia de un vistazo. El neto siempre va en línea: no es una
 * cantidad que entra ni que sale, es el resultado de las otras dos.
 */
export function MonthlyFlowChart({
  items,
  currency,
  height,
}: {
  items: MonthlyCashflow[]
  currency?: string
  height?: number
}) {
  const [shape, setShape] = useState<Shape>('bars')

  const data = items.map((m) => ({
    month: formatMonthLabel(m.month),
    income: Number(m.income) || 0,
    expense: Number(m.expense) || 0,
    net: Number(m.net) || 0,
  }))

  const series: ChartSeries[] = [
    { key: 'income', label: 'Ingresos', tone: 'chart-2', shape: shape === 'line' ? 'line' : 'bar' },
    { key: 'expense', label: 'Egresos', tone: 'chart-4', shape: shape === 'line' ? 'line' : 'bar' },
    { key: 'net', label: 'Neto', tone: 'chart-1', shape: 'line' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <SegmentedControl
          aria-label="Forma de la gráfica"
          value={shape}
          onChange={setShape}
          options={[
            { value: 'bars', label: 'Barras' },
            { value: 'line', label: 'Línea' },
          ]}
        />
      </div>
      <Chart
        data={data}
        x="month"
        series={series}
        currency={currency}
        height={height}
        empty="Todavía no hay movimientos que graficar."
      />
    </div>
  )
}
