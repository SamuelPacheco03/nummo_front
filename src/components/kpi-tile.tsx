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
    <div className={cn(featured ? 'px-5 py-5' : 'px-3 py-4 sm:px-4')}>
      <div className={cn('text-muted-foreground', featured ? 'text-[0.85rem]' : 'text-xs')}>
        {label}
      </div>
      <div
        className={cn(
          'font-display nums leading-none font-semibold tracking-tight',
          // La jerarquía la hace el TAMAÑO, no un borde de color alrededor. El
          // saldo se lee de lejos; los otros tres, al posar la vista.
          featured
            ? 'mt-2 text-[1.9rem] sm:text-[2.25rem]'
            : 'mt-1.5 text-[1.05rem] sm:text-[1.35rem]',
        )}
      >
        {value}
      </div>
      <div
        className={cn(
          'flex items-center gap-2',
          featured ? 'mt-2 text-xs' : 'mt-1 text-[0.7rem] sm:text-xs',
        )}
      >
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
export function KpiStrip({
  featured,
  children,
}: {
  /** El saldo: la primera pregunta de §16 y la única que se lee de lejos. */
  featured: ReactNode
  /** Las otras tres, compactas y en fila. */
  children: ReactNode
}) {
  return (
    <div className="bg-card grid overflow-hidden rounded-lg border lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]">
      <div className="border-b lg:border-r lg:border-b-0">{featured}</div>
      {/*
        `auto-cols-fr` reparte el ancho entre los hijos que HAYA: dos secundarios
        ocupan media y media, tres un tercio cada uno. Fijar `grid-cols-3` dejaba
        una columna fantasma cuando solo venían dos.

        Y van en fila incluso a 360 px, sin carrusel: lo vencido es justo lo que
        no puede quedar fuera de la vista (§78). Reducir el cuerpo sí cabe.
      */}
      <div className="grid grid-flow-col auto-cols-fr divide-x">{children}</div>
    </div>
  )
}
