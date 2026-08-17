import {
  forwardRef,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type ComponentProps,
  type FocusEvent,
  type MutableRefObject,
} from 'react'
import { Input } from '@/components/ui/input'
import { groupAmountDisplay, parseAmountInput } from '@/lib/format'
import { cn } from '@/lib/utils'

type BaseProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type' | 'inputMode'>

interface MoneyInputProps extends BaseProps {
  /** Valor CRUDO (string decimal con punto, como lo espera el API). */
  value?: string
  /** Recibe el valor CRUDO ya normalizado. */
  onChange?: (raw: string) => void
  allowNegative?: boolean
}

function countDigits(s: string): number {
  let n = 0
  for (const ch of s) if (ch >= '0' && ch <= '9') n++
  return n
}

/** Posición del cursor tras `digits` dígitos del texto formateado. */
function caretAfterDigits(display: string, digits: number): number {
  if (digits <= 0) return display.startsWith('-') ? 1 : 0
  let seen = 0
  for (let i = 0; i < display.length; i++) {
    const ch = display[i]
    if (ch >= '0' && ch <= '9' && ++seen === digits) return i + 1
  }
  return display.length
}

/**
 * Input de dinero que formatea los miles EN VIVO (1.465.775,50) pero guarda y
 * emite siempre el valor crudo con punto decimal. Preserva el cursor por conteo
 * de dígitos y limpia una coma "en curso" al salir del campo.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value = '', onChange, allowNegative = false, className, onBlur, ...props },
  forwardedRef,
) {
  const innerRef = useRef<HTMLInputElement | null>(null)
  const caret = useRef<number | null>(null)

  const setRef = (el: HTMLInputElement | null) => {
    innerRef.current = el
    if (typeof forwardedRef === 'function') forwardedRef(el)
    else if (forwardedRef) (forwardedRef as MutableRefObject<HTMLInputElement | null>).current = el
  }

  const display = groupAmountDisplay(value)

  useLayoutEffect(() => {
    const el = innerRef.current
    if (el && caret.current != null && document.activeElement === el) {
      el.setSelectionRange(caret.current, caret.current)
    }
    caret.current = null
  })

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.target
    const digitsBeforeCaret = countDigits(el.value.slice(0, el.selectionStart ?? el.value.length))
    const raw = parseAmountInput(el.value, { allowNegative })
    caret.current = caretAfterDigits(groupAmountDisplay(raw), digitsBeforeCaret)
    onChange?.(raw)
  }

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (value.endsWith('.')) onChange?.(value.slice(0, -1))
    onBlur?.(e)
  }

  return (
    <Input
      ref={setRef}
      inputMode="decimal"
      autoComplete="off"
      className={cn('nums', className)}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  )
})
