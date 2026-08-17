import { type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Celda de KPI: etiqueta + número protagonista + delta vs período anterior.
 *
 * No lleva superficie propia: se monta dentro de `KpiStrip`, que agrupa las
 * cuatro en una sola tarjeta con separadores. Cuatro tarjetas sueltas pesaban lo
 * mismo que las cifras que contienen, y el dinero es el protagonista (§2.1).
 * El número va en tinta (token de texto); el delta usa color de estado CON flecha
 * (nunca color solo). higherIsGood define si subir es bueno (ingresos) o malo (gastos).
 */
export function KpiTile({
  label,
  value,
  sub,
  delta,
  featured,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  delta?: { pct: number | null; higherIsGood: boolean }
  /** El primero de la fila: el saldo. Se distingue, no se decora. */
  featured?: boolean
}) {
  const showDelta = delta && delta.pct !== null && Number.isFinite(delta.pct)
  const up = showDelta ? (delta.pct as number) >= 0 : false
  const good = showDelta ? up === delta.higherIsGood : false
  const Icon = up ? ArrowUpRight : ArrowDownRight

  return (
    <div className="px-5 py-4">
      <div className="text-muted-foreground text-[0.8rem]">{label}</div>
      <div
        className={cn(
          'font-display nums mt-1.5 leading-none font-semibold tracking-tight',
          // El saldo es la primera pregunta de §16: se distingue por tamaño, que
          // es jerarquía de verdad, no por un borde de color alrededor.
          featured ? 'text-[2rem]' : 'text-[1.6rem]',
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        {showDelta && (
          <span className={cn('inline-flex items-center gap-0.5', good ? 'text-success-strong' : 'text-destructive')}>
            <Icon className="size-3.5" />
            {Math.abs(delta.pct as number).toFixed(1)}%
          </span>
        )}
        {sub && <span className="nums text-muted-foreground">{sub}</span>}
      </div>
    </div>
  )
}

/**
 * Las cuatro cifras de cabecera, en una sola superficie con separadores.
 *
 * Agrupar en vez de repetir tarjeta es lo que hace que se lean como un resumen
 * y no como cuatro widgets independientes.
 */
export function KpiStrip({ children }: { children: ReactNode }) {
  return (
    <div className="bg-card grid divide-y overflow-hidden rounded-lg border sm:grid-cols-2 sm:divide-x lg:grid-cols-4 [&>*:nth-child(-n+2)]:sm:border-b lg:[&>*]:border-b-0">
      {children}
    </div>
  )
}
