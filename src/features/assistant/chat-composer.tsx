import { useEffect, useRef, useState } from 'react'
import { Mic, Paperclip, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMPOSER_MAX_HEIGHT, MAX_MESSAGE_LENGTH } from './constants'

/** Acción secundaria del composer: solo icono, con su nombre accesible. */
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
        'text-muted-foreground grid size-8 place-items-center rounded-md transition-colors',
        'hover:bg-secondary hover:text-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}

/**
 * Caja de escritura: Enter envía, Shift+Enter salta de línea y el textarea
 * crece con el texto hasta un tope.
 *
 * Campo y acciones comparten un solo marco que se ilumina al enfocar, con la
 * barra de acciones abajo: adjuntar y voz a la izquierda, enviar a la derecha.
 * Adjuntos y audio quedan listos en la interfaz pero deshabilitados — el
 * contrato del chat solo acepta `{ message, sessionId }`, así que habilitarlos
 * exige primero que el backend los soporte.
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
      className="bg-card border-t p-3"
    >
      <div
        className={cn(
          'border-input bg-background rounded-lg border transition-[color,box-shadow]',
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
          className="placeholder:text-muted-foreground min-h-9 w-full resize-none overflow-y-hidden bg-transparent px-3 pt-2.5 text-sm leading-relaxed outline-none"
        />
        <div className="flex items-center gap-1 px-2 pb-2">
          <ComposerAction label="Adjuntar archivo (próximamente)" Icon={Paperclip} disabled />
          <ComposerAction label="Mensaje de voz (próximamente)" Icon={Mic} disabled />
          <span className="flex-1" />
          {remaining < 400 && (
            <span className="text-muted-foreground mr-1 text-[0.65rem] tabular-nums">
              {remaining}
            </span>
          )}
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Enviar mensaje"
            className={cn(
              'grid size-8 place-items-center rounded-md transition-all',
              'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
              canSend
                ? 'bg-primary text-primary-foreground hover:bg-primary-hover active:scale-95'
                : 'text-muted-foreground/50 cursor-not-allowed',
            )}
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </form>
  )
}
