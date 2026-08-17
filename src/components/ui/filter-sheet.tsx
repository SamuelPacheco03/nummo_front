import { type ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/**
 * Botón que abre los filtros avanzados, con el número de criterios puestos.
 *
 * El contador es lo que evita el filtro fantasma: sin él, una lista filtrada por
 * algo que está dentro de una hoja cerrada parece una lista vacía sin motivo.
 */
export function FilterSheetTrigger({
  count,
  onClick,
  className,
}: {
  count: number
  onClick: () => void
  className?: string
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn('shrink-0 gap-2', count > 0 && 'border-brand/50 text-brand', className)}
    >
      <SlidersHorizontal aria-hidden className="size-4" />
      Filtros
      {count > 0 && (
        <span className="bg-brand text-brand-foreground nums grid size-5 place-items-center rounded-full text-[0.7rem] font-semibold">
          {count}
        </span>
      )}
    </Button>
  )
}

/**
 * Filtros avanzados: hoja inferior en móvil, cajón por la derecha en escritorio
 * (§2.3, §44).
 *
 * El eje cambia con el breakpoint a propósito: abajo es el gesto natural del
 * pulgar, y en una pantalla ancha un panel que ocupa el borde inferior deja la
 * tabla tapada justo donde se está mirando el resultado.
 *
 * Lo frecuente —buscar y el estado— se queda fuera, siempre a la vista. Aquí
 * dentro va lo que se usa de vez en cuando: pagador, concepto, rango de fechas y
 * orden.
 *
 * Los cambios se aplican **al instante**, no al pulsar «Aplicar»: la lista de
 * detrás ya se actualiza, y el botón de cierre dice cuántos registros vas a
 * encontrar. Un botón «Aplicar» obligaría a mantener un borrador y a decidir qué
 * pasa si cierras sin pulsarlo — complejidad que aquí no compra nada.
 */
export function FilterSheet({
  open,
  onOpenChange,
  children,
  resultLabel,
  onClear,
  canClear,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  /** Lo que se va a ver al cerrar: «Ver 8 cuentas». */
  resultLabel: string
  onClear: () => void
  canClear: boolean
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="drawer" className="gap-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <SheetTitle className="pb-3 text-base">Filtros</SheetTitle>

        <div className="scrollbar-slim -mx-1 flex flex-col gap-4 overflow-y-auto px-1 pb-4">
          {children}
        </div>

        <div className="flex gap-2 border-t pt-3">
          <Button variant="ghost" onClick={onClear} disabled={!canClear} className="flex-1">
            Limpiar todo
          </Button>
          <Button onClick={() => onOpenChange(false)} className="flex-1">
            {resultLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Un criterio dentro de la hoja: etiqueta arriba, control debajo.
 *
 * La etiqueta va en frase, del color del texto normal. En versaditas y gris
 * quedaba por debajo del control que nombra —se leía antes el desplegable que su
 * propio título— y es justo el tic de plantilla que §11.1 prohíbe.
 */
export function FilterField({
  label,
  hint,
  className,
  children,
}: {
  label: string
  /** Una línea de ayuda cuando el control no se explica solo. */
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

/** Una columna ordenable, con las dos direcciones dichas en cristiano. */
export interface SortChoice {
  /** Valor de `sort` que acepta el endpoint. */
  field: string
  /** Cómo se llama la columna en la tabla. */
  label: string
  /** Qué queda primero de menor a mayor: «Las que vencen antes». */
  asc: string
  /** Y de mayor a menor: «Mayor saldo primero». */
  desc: string
}

/**
 * El orden de la lista, dentro de la hoja de filtros.
 *
 * Una sola opción por combinación de columna y dirección. «Ascendente» y
 * «descendente» no dicen nada de una fecha de vencimiento ni de un saldo: hay
 * que traducirlas mentalmente cada vez, y antes vivían en un botón suelto sin
 * etiqueta que no se sabía si era un estado o una acción. Aquí cada opción dice
 * el resultado, y las dos direcciones van agrupadas bajo el nombre de la
 * columna para que se vea que son la misma decisión.
 */
export function FilterSortField({
  choices,
  field,
  desc,
  onChange,
}: {
  choices: SortChoice[]
  field: string
  desc: boolean
  onChange: (field: string, desc: boolean) => void
}) {
  return (
    <FilterField label="Ordenar" className="border-t pt-4">
      <NativeSelect
        value={`${field}:${desc ? 'desc' : 'asc'}`}
        onChange={(e) => {
          const [next = '', dir = ''] = e.target.value.split(':')
          onChange(next, dir === 'desc')
        }}
        aria-label="Ordenar la lista"
      >
        {choices.map((choice) => (
          <optgroup key={choice.field} label={choice.label}>
            <option value={`${choice.field}:asc`}>{choice.asc}</option>
            <option value={`${choice.field}:desc`}>{choice.desc}</option>
          </optgroup>
        ))}
      </NativeSelect>
    </FilterField>
  )
}
