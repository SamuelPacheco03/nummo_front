import { useId, useState } from 'react'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { formatCompactAmount, formatMoney, formatMonthLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MonthlyCashflow } from '@/api/generated/model'

type Shape = 'line' | 'bars'

/** Lienzo del SVG. Las coordenadas son de este sistema; el `viewBox` escala. */
const W = 600
const H = 180
const PAD_X = 8
const PAD_Y = 12

function num(value: string): number {
  return Number(value) || 0
}

/** Altura de barra como % del máximo, con mínimo visible para valores > 0. */
function barHeight(value: string, max: number): string {
  const n = num(value)
  if (n <= 0) return '0%'
  return `${Math.max((n / max) * 100, 3)}%`
}

/** Puntos de una serie en coordenadas del lienzo. */
function points(items: MonthlyCashflow[], pick: (m: MonthlyCashflow) => number, max: number) {
  const step = items.length > 1 ? (W - PAD_X * 2) / (items.length - 1) : 0
  return items.map((m, i) => ({
    x: PAD_X + step * i,
    y: H - PAD_Y - (pick(m) / max) * (H - PAD_Y * 2),
  }))
}

function path(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

function Legend() {
  return (
    <div className="text-muted-foreground flex items-center gap-4 text-xs">
      <span className="flex items-center gap-1.5">
        <span className="bg-chart-2 size-2.5 rounded-sm" /> Ingresos
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-chart-4 size-2.5 rounded-sm" /> Egresos
      </span>
    </div>
  )
}

/**
 * Flujo mensual: ingresos y egresos por mes, en línea o en barras.
 *
 * **La línea es la vista por defecto** porque la pregunta del Panel es de
 * tendencia —"¿cómo va la cosa?"— y una línea la responde de un vistazo. Las
 * barras siguen a un toque para cuando lo que interesa es comparar un mes
 * concreto contra otro, que es lo que una línea disimula.
 *
 * Sin librería de gráficos (§63): la línea es un `<path>` de SVG y las barras
 * son cajas con altura en porcentaje. Traer una dependencia de charting para dos
 * series de seis puntos sería justo lo que §61 y §63 piden evitar.
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
  const [shape, setShape] = useState<Shape>('line')
  const gradientId = useId()

  const hasData = items.some((m) => num(m.income) || num(m.expense))
  if (!hasData) {
    return <p className="text-muted-foreground py-6 text-center text-sm">{emptyLabel}</p>
  }

  const max = Math.max(...items.flatMap((m) => [num(m.income), num(m.expense)]), 1)
  const income = points(items, (m) => num(m.income), max)
  const expense = points(items, (m) => num(m.expense), max)

  const describe = (m: MonthlyCashflow) =>
    `${formatMonthLabel(m.month)} · Ingresos ${formatMoney(m.income, currency)} · Egresos ${formatMoney(m.expense, currency)} · Neto ${formatMoney(m.net, currency)}`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Legend />
        <SegmentedControl
          aria-label="Forma del gráfico"
          value={shape}
          onChange={setShape}
          className="text-xs"
          options={[
            { value: 'line', label: 'Línea' },
            { value: 'bars', label: 'Barras' },
          ]}
        />
      </div>

      {shape === 'line' ? (
        <div className="space-y-1.5">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label="Ingresos y egresos de los últimos meses"
            className="h-40 w-full"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Tres reglas de referencia: sitúan la altura sin cargar el fondo. */}
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={f}
                x1={0}
                x2={W}
                y1={PAD_Y + (H - PAD_Y * 2) * f}
                y2={PAD_Y + (H - PAD_Y * 2) * f}
                className="stroke-border"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}

            <path
              d={`${path(income)} L${income[income.length - 1].x},${H - PAD_Y} L${income[0].x},${H - PAD_Y} Z`}
              fill={`url(#${gradientId})`}
            />
            <path
              d={path(income)}
              fill="none"
              className="stroke-chart-2"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {/* Los egresos van punteados: se distinguen de los ingresos aunque
                se crucen, y sin depender solo del color (§7). */}
            <path
              d={path(expense)}
              fill="none"
              className="stroke-chart-4"
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Eje y cifras fuera del SVG: con `preserveAspectRatio="none"` el
              texto dentro se deformaría al estirarse el lienzo. */}
          <div className="flex">
            {items.map((m) => (
              <div
                key={m.month}
                title={describe(m)}
                className="flex min-w-0 flex-1 flex-col items-center gap-0.5"
              >
                <span className="text-muted-foreground text-[11px]">
                  {formatMonthLabel(m.month)}
                </span>
                <span
                  className={cn(
                    'nums text-[11px] font-medium',
                    num(m.net) < 0 ? 'text-destructive' : 'text-foreground',
                  )}
                >
                  {formatCompactAmount(m.net)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2 sm:gap-3">
          {items.map((m) => (
            <div
              key={m.month}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              title={describe(m)}
            >
              <div className="flex h-32 w-full items-end justify-center gap-1">
                <div
                  className="bg-chart-2 w-1/2 max-w-4 rounded-t"
                  style={{ height: barHeight(m.income, max) }}
                />
                <div
                  className="bg-chart-4 w-1/2 max-w-4 rounded-t"
                  style={{ height: barHeight(m.expense, max) }}
                />
              </div>
              <span className="text-muted-foreground text-[11px]">{formatMonthLabel(m.month)}</span>
              <span
                className={cn(
                  'nums text-[11px] font-medium',
                  num(m.net) < 0 ? 'text-destructive' : 'text-foreground',
                )}
              >
                {formatCompactAmount(m.net)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
