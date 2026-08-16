import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Mic, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMPOSER_MAX_HEIGHT, MAX_MESSAGE_LENGTH } from './constants'

/** Acción secundaria: solo icono, sin relleno, dentro de la barra. */
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
        'text-muted-foreground grid size-8 shrink-0 place-items-center rounded-full transition-colors',
        'hover:bg-secondary hover:text-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      <Icon className="size-[1.05rem]" />
    </button>
  )
}

/**
 * Barra de escritura: acciones, texto y envío en UNA sola pieza que se ilumina
 * al enfocar. No hay campo con marco propio dentro de otro marco — eso es lo
 * que hacía que los iconos parecieran metidos a la fuerza.
 *
 * Enter envía, Shift+Enter salta de línea y la barra crece con el texto (las
 * acciones quedan ancladas abajo). Adjuntos y voz están listos en la interfaz
 * pero deshabilitados: el contrato del chat solo acepta `{ message, sessionId }`,
 * así que habilitarlos exige primero que el backend los soporte.
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
      className="bg-card border-t px-3 py-2.5"
    >
      {remaining < 400 && (
        <p className="text-muted-foreground px-2 pb-1 text-right text-[0.65rem] tabular-nums">
          {remaining} caracteres
        </p>
      )}

      <div
        className={cn(
          'border-input bg-background flex items-end gap-1 rounded-2xl border py-1.5 pr-1.5 pl-2 transition-[color,box-shadow]',
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        )}
      >
        <ComposerAction label="Adjuntar archivo (próximamente)" Icon={Paperclip} disabled />
        <ComposerAction label="Mensaje de voz (próximamente)" Icon={Mic} disabled />

        <div className="relative min-w-0 flex-1 self-center">
          {/* Marcador propio: el atributo `placeholder` no admite resaltar una
              palabra, y el nombre del asistente es lo que da carácter a la barra. */}
          {!value && (
            <span
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute inset-0 flex items-center px-1 text-sm"
            >
              Escríbele a&nbsp;<span className="text-brand font-medium">Numi</span>…
            </span>
          )}
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
            className="block w-full resize-none overflow-y-hidden bg-transparent px-1 py-1 text-sm leading-relaxed outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-full transition-all',
            'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary-hover active:scale-95'
              : 'bg-secondary text-muted-foreground/70 cursor-not-allowed',
          )}
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
    </form>
  )
}
