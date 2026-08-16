import { useEffect, useRef, useState } from 'react'
import { Mic, Paperclip, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMPOSER_MAX_HEIGHT, MAX_MESSAGE_LENGTH } from './constants'

/** Acción secundaria: solo icono, fuera del campo de texto. */
function ComposerAction({
  label,
  Icon,
  disabled = false,
  onClick,
}: {
  label: string
  Icon: typeof Mic
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'text-muted-foreground grid size-9 shrink-0 place-items-center rounded-full transition-colors',
        'hover:bg-secondary hover:text-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      <Icon className="size-[1.15rem]" />
    </button>
  )
}

/**
 * Barra de escritura al modo de una app de mensajería: acciones sueltas a la
 * izquierda, campo en una cápsula propia y enviar como botón redondo aparte.
 * Nada de iconos metidos dentro del área de texto.
 *
 * Enter envía, Shift+Enter salta de línea y la cápsula crece con el texto.
 * Adjuntos y voz quedan listos en la interfaz pero deshabilitados: el contrato
 * del chat solo acepta `{ message, sessionId }`, así que habilitarlos exige
 * primero que el backend los soporte.
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
    const content = el.scrollHeight
    el.style.height = `${Math.min(content, COMPOSER_MAX_HEIGHT)}px`
    // La barra nativa solo cuando el texto pasa del tope. Sin esto el navegador
    // la pinta igual por un redondeo de subpíxel entre alto y contenido, y se ve
    // una barra muerta con sus flechas dentro de la caja de escribir.
    el.style.overflowY = content > COMPOSER_MAX_HEIGHT ? 'auto' : 'hidden'
  }, [value])

  const canSend = !!value.trim() && !disabled
  const remaining = MAX_MESSAGE_LENGTH - value.length

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
      className="bg-card border-t px-2 py-2"
    >
      {remaining < 400 && (
        <p className="text-muted-foreground px-2 pb-1 text-right text-[0.65rem] tabular-nums">
          {remaining} caracteres
        </p>
      )}
      <div className="flex items-end gap-1">
        <ComposerAction label="Adjuntar archivo (próximamente)" Icon={Paperclip} disabled />
        <ComposerAction label="Mensaje de voz (próximamente)" Icon={Mic} disabled />

        <div
          className={cn(
            'border-input bg-background min-w-0 flex-1 rounded-2xl border px-3 py-2 transition-[color,box-shadow]',
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
            className="placeholder:text-muted-foreground block w-full resize-none overflow-y-hidden bg-transparent text-sm leading-relaxed outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full transition-all',
            'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary-hover active:scale-95'
              : 'text-muted-foreground/50 cursor-not-allowed',
          )}
        >
          <Send className="size-[1.15rem]" />
        </button>
      </div>
    </form>
  )
}
