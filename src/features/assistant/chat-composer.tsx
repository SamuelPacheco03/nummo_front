import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMPOSER_MAX_HEIGHT, MAX_MESSAGE_LENGTH } from './constants'

/**
 * Caja de escritura del chat: Enter envía, Shift+Enter salta de línea y el
 * textarea crece con el texto hasta un tope.
 *
 * Campo y botón comparten un solo marco redondeado (el foco ilumina el
 * conjunto): así se lee como una sola pieza y no como dos controles sueltos.
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

  const canSend = !!value.trim() && !disabled

  const submit = () => {
    if (!canSend) return
    setValue('')
    onSend(value.trim())
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="border-t bg-card p-3"
    >
      <div
        className={cn(
          'border-input bg-background flex items-end gap-1 rounded-2xl border py-1 pr-1 pl-3 shadow-xs transition-[color,box-shadow]',
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        )}
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
          className="placeholder:text-muted-foreground min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-full transition-all',
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary-hover active:scale-95'
              : 'text-muted-foreground/60 bg-transparent',
          )}
        >
          <Send className="size-4" />
        </button>
      </div>
    </form>
  )
}
