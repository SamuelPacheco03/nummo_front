import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { COMPOSER_MAX_HEIGHT, MAX_MESSAGE_LENGTH } from './constants'

/**
 * Caja de escritura del chat: Enter envía, Shift+Enter salta de línea y el
 * textarea crece con el texto hasta un tope.
 */
export function ChatComposer({
  onSend,
  disabled = false,
  autoFocus = false,
}: {
  onSend: (text: string) => void
  disabled?: boolean
  autoFocus?: boolean
}) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  // Auto-alto: hay que medir el DOM, no se puede calcular en render.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`
  }, [value])

  const submit = () => {
    const text = value.trim()
    if (!text || disabled) return
    setValue('')
    onSend(text)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex items-end gap-2 border-t bg-card p-3"
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        maxLength={MAX_MESSAGE_LENGTH}
        aria-label="Mensaje para Numi"
        placeholder="Escríbele a Numi…"
        className={cn(
          'border-input placeholder:text-muted-foreground min-h-9 flex-1 resize-none rounded-md border bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow]',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        )}
      />
      <Button type="submit" size="icon" disabled={disabled || !value.trim()} aria-label="Enviar mensaje">
        <Send className="size-4" />
      </Button>
    </form>
  )
}
