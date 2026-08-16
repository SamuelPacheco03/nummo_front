import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Mic, Paperclip, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { COMPOSER_MAX_HEIGHT, MAX_MESSAGE_LENGTH } from './constants'
import { formatDuration, useAudioRecorder } from './use-audio-recorder'

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

/** Barra que reemplaza al composer mientras se graba una nota de voz. */
function RecordingBar({
  seconds,
  onCancel,
  onStop,
}: {
  seconds: number
  onCancel: () => void
  onStop: () => void
}) {
  return (
    <div className="bg-card border-t px-3 py-2.5">
      <div className="border-input bg-background flex items-center gap-2 rounded-2xl border py-1.5 pr-1.5 pl-2">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar grabación"
          title="Cancelar"
          className="text-muted-foreground hover:bg-secondary hover:text-destructive focus-visible:ring-ring/50 grid size-8 shrink-0 place-items-center rounded-full transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <Trash2 className="size-[1.05rem]" />
        </button>
        <div className="flex flex-1 items-center gap-2 px-1 text-sm">
          <span className="bg-destructive size-2 shrink-0 animate-pulse rounded-full" />
          <span className="tabular-nums">{formatDuration(seconds)}</span>
          <span className="text-muted-foreground">Grabando…</span>
        </div>
        <button
          type="button"
          onClick={onStop}
          aria-label="Enviar audio"
          title="Enviar"
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring/50 grid size-8 shrink-0 place-items-center rounded-full transition-all active:scale-95 focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Barra de escritura: acciones, texto y envío en UNA sola pieza que se ilumina
 * al enfocar. Enter envía, Shift+Enter salta de línea y la barra crece con el
 * texto. Con la caja vacía, el botón de la derecha es el micrófono (nota de voz);
 * al escribir, pasa a ser la flecha de enviar.
 */
export function ChatComposer({
  onSend,
  onSendAudio,
  disabled = false,
  autoFocus = false,
}: {
  onSend: (text: string) => void
  onSendAudio?: (blob: Blob) => void
  disabled?: boolean
  autoFocus?: boolean
}) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const recorder = useAudioRecorder()

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
    el.style.overflowY = content > COMPOSER_MAX_HEIGHT ? 'auto' : 'hidden'
  }, [value])

  const hasText = !!value.trim()
  const canSend = hasText && !disabled
  const remaining = MAX_MESSAGE_LENGTH - value.length
  const canRecord = !!onSendAudio && !disabled

  const submit = () => {
    if (!canSend) return
    setValue('')
    onSend(value.trim())
  }

  const startRecording = async () => {
    const ok = await recorder.start()
    if (!ok) toast.error('No se pudo acceder al micrófono. Revisa los permisos del navegador.')
  }

  const stopAndSend = async () => {
    const blob = await recorder.stop()
    if (blob) onSendAudio?.(blob)
    else toast.error('La grabación quedó vacía.')
  }

  if (recorder.isRecording) {
    return <RecordingBar seconds={recorder.seconds} onCancel={recorder.cancel} onStop={() => void stopAndSend()} />
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

        <div className="relative min-w-0 flex-1 self-center">
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

        {hasText ? (
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
        ) : (
          <ComposerAction
            label="Grabar nota de voz"
            Icon={Mic}
            disabled={!canRecord}
            onClick={() => void startRecording()}
          />
        )}
      </div>
    </form>
  )
}
