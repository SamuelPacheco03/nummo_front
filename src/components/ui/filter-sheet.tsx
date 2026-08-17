import { type ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { FilterChips } from '@/components/ui/filter-chips'
import { NativeSelect } from '@/components/ui/native-select'
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
 * Filtros avanzados, dentro del `Drawer` de la app (§94): hoja inferior en móvil
 * y cajón por la derecha en escritorio (§2.3, §44).
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
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Filtros"
      // Cuatro criterios no llenan una pantalla: en móvil se ajusta al alto de
      // lo que hay y deja ver la lista de detrás.
      fit
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClear} disabled={!canClear} className="flex-1">
            Limpiar todo
          </Button>
          <Button onClick={() => onOpenChange(false)} className="flex-1">
            {resultLabel}
          </Button>
        </div>
      }
    >
      {children}
    </Drawer>
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

/** Una columna ordenable, con sus dos direcciones dichas en cristiano. */
export interface SortChoice {
  /** Valor de `sort` que acepta el endpoint. */
  field: string
  /** Cómo se llama la columna en la tabla. */
  label: string
  /** Qué queda primero de menor a mayor: «Vencen antes», «Menor primero». */
  asc: string
  /** Y de mayor a menor: «Vencen después», «Mayor primero». */
  desc: string
}

/**
 * El orden de la lista, dentro de la hoja de filtros.
 *
 * **Dos decisiones, dos controles:** por qué columna y en qué dirección. Se
 * probó juntarlas en una sola lista de seis opciones y se descartó — obliga a
 * releer las seis para cambiar solo la dirección, y crece multiplicando en
 * cuanto aparece una columna más.
 *
 * Las palabras de la dirección **cambian con la columna** (`asc`/`desc` de cada
 * `SortChoice`): «ascendente» y «descendente» no dicen nada de una fecha de
 * vencimiento ni de un saldo, hay que traducirlas mentalmente cada vez.
 *
 * **Una sola columna a la vez, no varias.** El contrato v1.0.0 acepta un `sort`
 * y un `order`, no una lista, y la lista se pagina en el servidor: ordenar por
 * un segundo criterio en el front reordenaría solo la página visible y daría un
 * orden global falso (§88.4). Un editor de criterios encadenados necesita
 * primero que el API los acepte.
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
  const current = choices.find((c) => c.field === field) ?? choices[0]
  if (!current) return null

  return (
    <FilterField label="Ordenar" className="border-t pt-4">
      <div className="space-y-2">
        <NativeSelect
          value={current.field}
          // Cambiar de columna conserva la dirección: si venías mirando lo más
          // grande primero, sigues queriendo lo más grande primero.
          onChange={(e) => onChange(e.target.value, desc)}
          aria-label="Ordenar por"
        >
          {choices.map((choice) => (
            <option key={choice.field} value={choice.field}>
              {choice.label}
            </option>
          ))}
        </NativeSelect>
        <FilterChips
          label="Dirección del orden"
          choices={[
            { value: 'asc', label: current.asc },
            { value: 'desc', label: current.desc },
          ]}
          value={desc ? 'desc' : 'asc'}
          onChange={(value) => onChange(current.field, value === 'desc')}
        />
      </div>
    </FilterField>
  )
}
