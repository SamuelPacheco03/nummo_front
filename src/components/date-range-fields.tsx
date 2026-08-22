import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

/**
 * El par «Desde / Hasta» de los paneles que miden una ventana.
 *
 * Existe porque son **dos** las pantallas que lo piden —el panel de actividad del
 * playground y la consola de marketing— y las dos lo escribían igual: dos `Field` con un
 * `Input type="date"`, el `max` de uno atado al valor del otro. Ese `max`/`min` cruzado es
 * justo lo que se olvida al copiar, y sin él se puede pedir un rango invertido que el
 * backend rechaza con un 422 que nadie sabe leer.
 *
 * No decide el rango por defecto: eso es de `lib/date-range`, y quién lo guarda —la URL,
 * el estado— es de cada pantalla.
 */
export function DateRangeFields({
  from,
  to,
  onChange,
  idPrefix,
}: {
  from: string
  to: string
  onChange: (range: { from?: string; to?: string }) => void
  /** Los `id` tienen que ser únicos en el documento: dos rangos en una página chocarían. */
  idPrefix: string
}) {
  return (
    <>
      <Field label="Desde" htmlFor={`${idPrefix}-desde`}>
        <Input
          id={`${idPrefix}-desde`}
          type="date"
          value={from}
          max={to}
          onChange={(e) => onChange({ from: e.target.value })}
        />
      </Field>
      <Field label="Hasta" htmlFor={`${idPrefix}-hasta`}>
        <Input
          id={`${idPrefix}-hasta`}
          type="date"
          value={to}
          min={from}
          onChange={(e) => onChange({ to: e.target.value })}
        />
      </Field>
    </>
  )
}
