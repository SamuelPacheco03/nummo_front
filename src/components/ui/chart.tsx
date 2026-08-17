import { useMemo, type ReactNode } from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { formatCompactAmount, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * **Las gráficas de la app.** Dos componentes —`Chart` para series en el tiempo,
 * `DonutChart` para composición— y ninguna gráfica suelta en una página.
 *
 * Hasta aquí se dibujaban a mano en SVG. Funcionaba para una línea de seis
 * meses, pero cada gráfica nueva era empezar de cero: ejes, escalas, tooltips y
 * responsive otra vez. Con el módulo de informes por delante eso no escala, así
 * que entra **Recharts** (§63: la dependencia se justifica por lo que viene, no
 * por lo que hay).
 *
 * Lo que envuelve, y por lo que existe este archivo en vez de usar Recharts
 * directamente en cada página:
 *
 * - **Color por token** (§57): las series piden `chart-1…5`, `success` o
 *   `destructive`, nunca un hex. Así siguen el tema claro/oscuro solas.
 * - **Dinero en los dos idiomas** (§62): compacto en el eje —«$1,5 M»— y exacto
 *   en el tooltip, que es lo que pide §58.
 * - **Un solo tooltip** para todas: cabecera y filas etiqueta-valor alineadas.
 * - **Vacío explícito** (§45) en vez de unos ejes sin nada dentro.
 * - **Sin animación** si el sistema pide menos movimiento.
 */

/** Tonos permitidos. Semánticos o de la paleta de gráficas; nunca un color suelto. */
export type ChartTone = 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5' | 'success' | 'destructive'

/*
  Los tokens crudos (`--chart-1`), no los de Tailwind (`--color-chart-1`): el
  bloque `@theme inline` **no emite** esas variables a CSS —eso es lo que
  significa `inline`, que el valor se incrusta en la utilidad— así que dentro de
  un SVG resolverían a nada y Recharts pintaría todo en negro.
*/
const color = (tone: ChartTone) => `var(--${tone})`

export interface ChartSeries {
  /** Clave del dato en cada fila. */
  key: string
  label: string
  tone: ChartTone
  /** Cómo se dibuja. Por defecto, barra. */
  shape?: 'bar' | 'line' | 'area'
  /** Barras apiladas: mismo `stack` = misma pila. */
  stack?: string
}

type Row = Record<string, string | number | null | undefined>

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Tooltip único: cifras exactas y alineadas, como pide §58. */
function ChartTooltip({
  active,
  payload,
  label,
  currency,
  labelOf,
}: TooltipContentProps & {
  currency?: string
  labelOf: (key: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card min-w-40 rounded-lg border p-2.5 text-sm shadow-lg">
      <p className="mb-1.5 font-medium">{label}</p>
      <dl className="space-y-1">
        {payload.map((item) => (
          <div key={String(item.dataKey)} className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: item.color }}
              />
              {labelOf(String(item.dataKey))}
            </dt>
            <dd className="nums font-medium">{formatMoney(Number(item.value) || 0, currency)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** Ejes y rejilla: los mismos en todas, para que dos gráficas se comparen. */
const AXIS = {
  tick: { fontSize: 11 },
  tickLine: false,
  axisLine: false,
  stroke: 'var(--muted-foreground)',
} as const

export function Chart({
  data,
  x,
  series,
  currency,
  height = 260,
  empty = 'Sin datos en el período.',
  className,
}: {
  data: Row[]
  /** Clave del eje horizontal. */
  x: string
  series: ChartSeries[]
  currency?: string
  height?: number
  empty?: ReactNode
  className?: string
}) {
  const labelOf = useMemo(() => {
    const map = new Map(series.map((s) => [s.key, s.label]))
    return (key: string) => map.get(key) ?? key
  }, [series])

  const hasData = data.length > 0 && data.some((row) => series.some((s) => Number(row[s.key]) !== 0))
  if (!hasData) {
    return (
      <div
        className={cn(
          'text-muted-foreground grid place-items-center rounded-lg border border-dashed text-sm',
          className,
        )}
        style={{ height }}
      >
        {empty}
      </div>
    )
  }

  const animate = !prefersReducedMotion()

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey={x} {...AXIS} />
          <YAxis
            {...AXIS}
            width={64}
            tickFormatter={(value: number) => formatCompactAmount(value, currency)}
          />
          <Tooltip
            cursor={{ fill: 'var(--secondary)', opacity: 0.5 }}
            content={(props) => (
              <ChartTooltip {...props} currency={currency} labelOf={labelOf} />
            )}
          />
          {series.map((s) =>
            s.shape === 'line' ? (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={color(s.tone)}
                strokeWidth={2}
                dot={false}
                isAnimationActive={animate}
              />
            ) : s.shape === 'area' ? (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={color(s.tone)}
                fill={color(s.tone)}
                fillOpacity={0.15}
                strokeWidth={2}
                isAnimationActive={animate}
              />
            ) : (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId={s.stack}
                fill={color(s.tone)}
                radius={[3, 3, 0, 0]}
                maxBarSize={44}
                isAnimationActive={animate}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Una porción del donut. El color se asigna por orden de la paleta. */
export interface DonutSlice {
  id: string
  label: string
  value: number
}

const DONUT_TONES: ChartTone[] = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5']

/**
 * Composición de un total: de dónde sale el dinero, en qué se va.
 *
 * Con leyenda al lado y no dentro: en una tarta las etiquetas encima se pisan en
 * cuanto hay más de cuatro porciones. Y **agrupa la cola en «Otros»**, porque
 * doce porciones de dos grados no son un dato, son ruido (§59).
 */
export function DonutChart({
  slices,
  currency,
  max = 5,
  height = 220,
  empty = 'Sin datos en el período.',
}: {
  slices: DonutSlice[]
  currency?: string
  /** Porciones antes de agrupar el resto en «Otros». */
  max?: number
  height?: number
  empty?: ReactNode
}) {
  const shown = useMemo(() => {
    const sorted = [...slices].filter((s) => s.value > 0).sort((a, b) => b.value - a.value)
    if (sorted.length <= max) return sorted
    const rest = sorted.slice(max - 1)
    return [
      ...sorted.slice(0, max - 1),
      { id: '__otros', label: `Otros (${rest.length})`, value: rest.reduce((s, r) => s + r.value, 0) },
    ]
  }, [slices, max])

  const total = shown.reduce((s, r) => s + r.value, 0)

  if (total === 0) {
    return (
      <div
        className="text-muted-foreground grid place-items-center rounded-lg border border-dashed text-sm"
        style={{ height }}
      >
        {empty}
      </div>
    )
  }

  const animate = !prefersReducedMotion()

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="w-full sm:w-44" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={shown}
              dataKey="value"
              nameKey="label"
              innerRadius="58%"
              outerRadius="86%"
              paddingAngle={2}
              isAnimationActive={animate}
            >
              {shown.map((slice, i) => (
                <Cell key={slice.id} fill={color(DONUT_TONES[i % DONUT_TONES.length])} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* La leyenda es también la tabla: etiqueta, importe y peso sobre el total. */}
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {shown.map((slice, i) => (
          <li key={slice.id} className="flex items-baseline gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 translate-y-0.5 rounded-[3px]"
              style={{ background: color(DONUT_TONES[i % DONUT_TONES.length]) }}
            />
            <span className="min-w-0 flex-1 truncate">{slice.label}</span>
            <span className="nums shrink-0 font-medium">{formatMoney(slice.value, currency)}</span>
            <span className="nums text-muted-foreground w-10 shrink-0 text-right text-xs">
              {Math.round((slice.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
