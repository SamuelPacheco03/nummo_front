import { type ReactNode } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Field } from '@/components/ui/field'
import { MoneyInput } from '@/components/ui/money-input'

interface MoneyFieldProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  id?: string
  required?: boolean
  error?: string
  hint?: string
  info?: ReactNode
  placeholder?: string
  disabled?: boolean
  allowNegative?: boolean
  className?: string
  /**
   * Se llama **además** de avisar a RHF, con el valor crudo.
   *
   * Existe para el campo que otro sitio puede rellenar solo: el monto de
   * registrar un pago se calcula con las cuentas que se marcan, y necesita
   * saber que quien escribió fue una persona para dejar de recalcularlo.
   * `Controller` se queda el `onChange`, así que sin esto habría que
   * reimplementar el campo entero para enterarse (§«nada por duplicado»).
   */
  onValueChange?: (raw: string) => void
}

/**
 * Campo de dinero listo para RHF: `Field` (label + error + ⓘ) + `MoneyInput`
 * (formatea miles en vivo, guarda crudo). Reemplaza al patrón
 * `<Field><Input {...register('amount')} /></Field>`.
 */
export function MoneyField<T extends FieldValues>({
  control,
  name,
  label,
  id,
  required,
  error,
  hint,
  info,
  placeholder,
  disabled,
  allowNegative,
  className,
  onValueChange,
}: MoneyFieldProps<T>) {
  return (
    <Field label={label} htmlFor={id} required={required} error={error} hint={hint} info={info}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <MoneyInput
            id={id}
            placeholder={placeholder}
            disabled={disabled}
            allowNegative={allowNegative}
            className={className}
            value={(field.value as string | undefined) ?? ''}
            onChange={(raw) => {
              field.onChange(raw)
              onValueChange?.(raw)
            }}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />
    </Field>
  )
}
