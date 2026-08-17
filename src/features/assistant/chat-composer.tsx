import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowUp, Mic, Paperclip, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { COMPOSER_MAX_HEIGHT, MAX_MESSAGE_LENGTH } from './constants'
import { CANCEL_AT, HoldToRecord, LOCK_AT, MIN_SECONDS } from './hold-to-record'
import { formatDuration, useAudioRecorder } from './use-audio-recorder'

/**
 * `true` donde se toca con el dedo.
 *
 * El gesto de mantener pulsado no se ofrece con ratón: en escritorio hay que
 * sostener el botón del ratón sin moverlo mientras se habla, que es incómodo y
 * no lo hace nadie — ahí se pulsa una vez y se para con otro botón, igual que
 * en WhatsApp de escritorio.
 */
function useTouchInput(): boolean {
  const [touch, setTouch] = useState(() => window.matchMedia?.('(pointer: coarse)').matches ?? false)
  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)')
    const onChange = () => setTouch(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return touch
}

/** Acción secundaria: solo icono, sin relleno, dentro de la barra. */
function ComposerAction({
  label,
  Icon,
  disabled = false,
  onClick,
  ...pointer
}: {
  label: string
  Icon: typeof Mic
  disabled?: boolean
  onClick?: () => void
  onPointerDown?: (e: ReactPointerEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...pointer}
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
  const touch = useTouchInput()

  /*
    El gesto de mantener pulsado: `hold` es el desplazamiento del dedo desde
    donde empezó. Al fijar la grabación —subiendo hasta el candado— `hold` se
    limpia y manda la barra de siempre, que es exactamente lo que hace falta:
    una grabación fijada y una de escritorio se manejan igual.
  */
  const [hold, setHold] = useState<{ dx: number; dy: number } | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const startedAt = useRef(0)
  // La grabación arranca cuando el navegador da el micrófono, que puede tardar
  // más que el gesto entero. Si para entonces ya se soltó, no se graba nada.
  const abandoned = useRef(false)
  const detach = useRef<(() => void) | null>(null)

  // Si el panel se cierra a media grabación, los escuchas no se quedan sueltos.
  useEffect(() => () => detach.current?.(), [])

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
    return ok
  }

  const stopAndSend = async () => {
    const blob = await recorder.stop()
    if (blob) onSendAudio?.(blob)
    else toast.error('La grabación quedó vacía.')
  }

  /** Fin del gesto: suelta los escuchas del puntero y limpia el estado del dedo. */
  const endHold = () => {
    detach.current?.()
    origin.current = null
    setHold(null)
  }

  /**
   * Mantener pulsado para grabar (§32.2).
   *
   * Los escuchas van en `window` y no en el botón porque **el botón desaparece**
   * en cuanto empieza el gesto: la barra de grabación sustituye al composer
   * entero. Atado al botón, el primer `pointermove` ya no llegaba a nadie y el
   * dedo se quedaba arrastrando sobre un elemento que ya no existía —ni cancelar
   * ni fijar ni soltar hacían nada—.
   */
  const onMicPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (!touch || !canRecord || origin.current) return
    e.preventDefault()
    origin.current = { x: e.clientX, y: e.clientY }
    startedAt.current = performance.now()
    abandoned.current = false
    setHold({ dx: 0, dy: 0 })

    const onMove = (ev: PointerEvent) => {
      const from = origin.current
      if (!from) return
      const dx = ev.clientX - from.x
      const dy = ev.clientY - from.y

      // Fijada: el dedo se puede soltar y la grabación sigue sola.
      if (dy <= -LOCK_AT) {
        endHold()
        return
      }
      if (dx <= -CANCEL_AT) {
        abandoned.current = true
        recorder.cancel()
        endHold()
        return
      }
      setHold({ dx: Math.min(dx, 0), dy: Math.min(dy, 0) })
    }

    const onUp = () => {
      if (!origin.current) return
      const held = performance.now() - startedAt.current
      endHold()
      // Un toque no es una grabación: sin esto, rozar el micrófono manda un
      // audio de dos décimas que no dice nada.
      if (held < MIN_SECONDS * 1000) {
        abandoned.current = true
        recorder.cancel()
        toast('Mantén pulsado el micrófono para grabar')
        return
      }
      void stopAndSend()
    }

    const onCancel = () => {
      if (!origin.current) return
      abandoned.current = true
      recorder.cancel()
      endHold()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    detach.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      detach.current = null
    }

    void startRecording().then((ok) => {
      if (!ok) endHold()
      // El permiso pudo tardar más que el gesto entero.
      else if (abandoned.current) recorder.cancel()
    })
  }

  if (hold) return <HoldToRecord seconds={recorder.seconds} dx={hold.dx} dy={hold.dy} />

  if (recorder.isRecording) {
    return (
      <RecordingBar
        seconds={recorder.seconds}
        onCancel={recorder.cancel}
        onStop={() => void stopAndSend()}
      />
    )
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
            label={touch ? 'Mantén pulsado para grabar una nota de voz' : 'Grabar nota de voz'}
            Icon={Mic}
            disabled={!canRecord}
            // Con el dedo se mantiene pulsado (WhatsApp); con ratón, un clic
            // empieza y otro botón para. Nunca las dos cosas a la vez.
            onClick={touch ? undefined : () => void startRecording()}
            onPointerDown={onMicPointerDown}
          />
        )}
      </div>
    </form>
  )
}
