import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react'
import { ArrowUp, Mic, Paperclip, Square, X } from 'lucide-react'
import { toast } from 'sonner'
import { useTouchInput } from '@/lib/use-touch-input'
import { withQuote, type QuoteAuthor } from './quote'
import { cn } from '@/lib/utils'
import { COMPOSER_MAX_HEIGHT, MAX_MESSAGE_LENGTH } from './constants'
import {
  AXIS_MARGIN,
  CANCEL_AT,
  DEAD_ZONE,
  HoldToRecord,
  LOCK_AT,
  MIN_SECONDS,
  TOUCH_GRACE,
} from './hold-to-record'
import { RecordingBar } from './recording-bar'
import { useAudioRecorder } from './use-audio-recorder'

/** Acción secundaria: solo icono, sin relleno, dentro de la barra. */
function ComposerAction({
  label,
  Icon,
  disabled = false,
  onClick,
  ref,
  ...pointer
}: {
  label: string
  Icon: typeof Mic
  disabled?: boolean
  onClick?: () => void
  ref?: Ref<HTMLButtonElement>
  onPointerDown?: (e: ReactPointerEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      {...pointer}
      disabled={disabled}
      aria-label={label}
      title={label}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        'text-muted-foreground grid size-8 shrink-0 place-items-center rounded-full transition-colors',
        'hover:bg-secondary hover:text-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-40',
        /*
          `touch-none` es lo que hace que mantener pulsado funcione en un móvil.
          Sin él, el navegador entiende que el dedo quiere desplazar el hilo,
          se queda con el gesto y manda `pointercancel` a los pocos píxeles: la
          grabación moría al primer temblor y al candado no se llegaba nunca.
          `select-none` y el menú contextual, por la pulsación larga de Android.
        */
        'touch-none select-none',
      )}
    >
      <Icon className="size-[1.05rem]" />
    </button>
  )
}

/**
 * Barra de escritura: acciones, texto y envío en UNA sola pieza que se ilumina
 * al enfocar. Enter envía, Shift+Enter salta de línea y la barra crece con el
 * texto.
 *
 * **El botón de la derecha es uno solo y dice qué toca ahora**: la flecha de
 * enviar en cuanto hay algo escrito; con la caja vacía, el cuadrado de detener
 * mientras Numi contesta y el micrófono cuando no.
 */
export function ChatComposer({
  onSend,
  onSendAudio,
  onStop,
  busy = false,
  quoted = null,
  onClearQuote,
  autoFocus = false,
  textOnly = false,
  initialValue = '',
}: {
  onSend: (text: string) => void
  onSendAudio?: (blob: Blob) => void
  /**
   * Corta la respuesta en curso. **Ocupa el sitio del micrófono** mientras Numi
   * escribe: es el mismo botón de la derecha diciendo qué se puede hacer ahora
   * mismo, no una barra flotante que aparece y desaparece sobre la caja.
   */
  onStop?: () => void
  /**
   * Numi está contestando. **Escribir y enviar siguen abiertos** —lo enviado entra en
   * la cola del hilo—; lo que espera es grabar, porque una nota de voz no se puede
   * encolar: su audio vive en esta página y no sobrevive a guardarlo.
   */
  busy?: boolean
  /**
   * Lo que se está citando, si algo. Viaja aparte del texto para que la cita no se pueda
   * romper escribiendo dentro de ella, y para poder quitarla sin borrar de paso lo que ya
   * se había escrito.
   */
  quoted?: { author: QuoteAuthor; quote: string } | null
  onClearQuote?: () => void
  autoFocus?: boolean
  /**
   * Solo texto: sin adjuntar y sin nota de voz.
   *
   * Es lo que necesita el playground del superadmin, que escribe a Numi con las mismas
   * teclas —Enter envía, Shift+Enter salta— pero no graba nada: un clip «próximamente» y
   * un micrófono muerto en una consola de diagnóstico son dos controles que no llevan a
   * ninguna parte.
   */
  textOnly?: boolean
  /**
   * Lo que la caja trae ya escrito. Se lee **al montar**, así que quien la precargue
   * después tiene que remontarla (`key`): una caja que se rellena sola a media frase es
   * la peor forma de perder lo que alguien estaba escribiendo.
   */
  initialValue?: string
}) {
  const [value, setValue] = useState(initialValue)
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
  /*
    Eje del gesto. El primer movimiento que sale de la zona muerta decide si esto
    va a ser «cancelar» (horizontal) o «fijar» (vertical), y a partir de ahí el
    otro eje se ignora. Sin esto, subir el pulgar en diagonal —que es como sube
    un pulgar— acumulaba desplazamiento a la izquierda y cancelaba a medio camino
    del candado.
  */
  const axis = useRef<'none' | 'x' | 'y'>('none')
  /** Centro del micrófono en pantalla: ancla del círculo grande y del candado. */
  const [anchor, setAnchor] = useState({ x: 0, y: 0 })
  // Mientras se vuelca el audio grabado no es «grabando»: sin esto la barra de
  // grabación parpadea al soltar y parece que se fijó.
  const [finishing, setFinishing] = useState(false)
  // Si llegó al candado, la barra lo dice: quien subió el dedo necesita saber
  // que ya puede soltarlo.
  const [locked, setLocked] = useState(false)
  const detach = useRef<(() => void) | null>(null)
  const micRef = useRef<HTMLButtonElement>(null)
  /** Temporizador de «se perdió el rastro del dedo» (ver `stolen`). */
  const lost = useRef(0)

  // Si el panel se cierra a media grabación, los escuchas no se quedan sueltos.
  useEffect(() => () => detach.current?.(), [])

  /*
    El foco automático, **solo donde hay teclado de verdad**. En un móvil abre el
    teclado al entrar: tapa media conversación antes de que nadie haya pedido
    escribir, y mueve el suelo bajo el dedo justo cuando se va a mantener pulsado
    el micrófono —el navegador cancela los gestos vivos al redimensionarse la
    ventana—.
  */
  useEffect(() => {
    if (autoFocus && !touch) ref.current?.focus()
  }, [autoFocus, touch])

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
  const canSend = hasText
  const remaining = MAX_MESSAGE_LENGTH - value.length
  const canRecord = !!onSendAudio && !busy

  /*
    **Que sostener el micrófono no sea una pulsación larga.**

    Android decide a los ~500 ms que un toque quieto va a ser una pulsación
    larga —la de seleccionar texto— y cancela el gesto: sin esto, mantener
    pulsado sin moverse mataba la grabación sola, y moverse un poco lo evitaba
    porque mover descarta la pulsación larga. Se quita impidiendo el
    comportamiento por defecto del toque.

    Y tiene que ser un escucha **no pasivo**, puesto a mano: los que registra
    React son pasivos y ahí `preventDefault` no hace nada. Se vuelve a poner
    cada vez que el botón cambia: con texto escrito el micrófono deja su sitio al
    de enviar, y mientras Numi contesta al de detener.
  */
  useEffect(() => {
    const el = micRef.current
    if (!el) return
    const noLongPress = (e: TouchEvent) => e.preventDefault()
    el.addEventListener('touchstart', noLongPress, { passive: false })
    return () => el.removeEventListener('touchstart', noLongPress)
  }, [hasText, busy, onStop])

  const submit = () => {
    if (!canSend) return
    const text = value.trim()
    setValue('')
    onClearQuote?.()
    onSend(quoted ? withQuote(quoted, text) : text)
  }

  const startRecording = async () => {
    const ok = await recorder.start()
    if (!ok) toast.error('No se pudo acceder al micrófono. Revisa los permisos del navegador.')
    return ok
  }

  const stopAndSend = async () => {
    setFinishing(true)
    try {
      const blob = await recorder.stop()
      if (blob) onSendAudio?.(blob)
      else toast.error('La grabación quedó vacía.')
    } finally {
      setFinishing(false)
    }
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
    const rect = e.currentTarget.getBoundingClientRect()
    setAnchor({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    origin.current = { x: e.clientX, y: e.clientY }
    startedAt.current = performance.now()
    abandoned.current = false
    axis.current = 'none'
    setLocked(false)
    setHold({ dx: 0, dy: 0 })

    const moved = (cx: number, cy: number) => {
      const from = origin.current
      if (!from) return
      alive()
      const mx = cx - from.x
      const my = cy - from.y

      /*
        Qué está haciendo el dedo. El primer movimiento que sale de la zona
        muerta lo decide, pero **no lo deja decidido para siempre**: son catorce
        píxeles de ruido y el pulgar se acomoda antes de arrancar. Con el eje
        congelado ahí, un temblor horizontal al empezar dejaba «cancelar» puesto
        y la subida al candado no contaba nunca.

        Cambia de eje cuando el otro manda con holgura: subir torcido —el otro
        fallo, el de siempre— sigue siendo subir, porque ahí la vertical es la
        que domina.
      */
      if (axis.current === 'none') {
        if (Math.hypot(mx, my) < DEAD_ZONE) return
        axis.current = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
      } else if (axis.current === 'x' && Math.abs(my) > Math.abs(mx) * AXIS_MARGIN) {
        axis.current = 'y'
      } else if (axis.current === 'y' && Math.abs(mx) > Math.abs(my) * AXIS_MARGIN) {
        axis.current = 'x'
      }
      const dx = axis.current === 'x' ? Math.min(mx, 0) : 0
      const dy = axis.current === 'y' ? Math.min(my, 0) : 0

      // Fijada: el dedo se puede soltar y la grabación sigue sola.
      if (dy <= -LOCK_AT) {
        setLocked(true)
        endHold()
        return
      }
      if (dx <= -CANCEL_AT) {
        abandoned.current = true
        recorder.cancel()
        endHold()
        return
      }
      setHold({ dx, dy })
    }

    const lifted = () => {
      if (!origin.current) return
      alive()
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

    /*
      El sistema se queda con el gesto de verdad —`touchcancel`—: una llamada,
      el gesto de volver del borde. Con una grabación ya en marcha **no se
      tira**: se fija, como si hubiera subido al candado. Perder lo que alguien
      acaba de dictar porque entró una llamada es el peor final posible; en la
      barra de grabación ya decide si lo manda o lo descarta. Si llega en los
      primeros instantes no había nada que salvar, y una barra fijada ahí se lee
      como «pulsar el micrófono bloquea la grabación solo»: se descarta callando.
    */
    /*
      El sistema se queda con la **secuencia táctil**. No se termina el gesto de
      inmediato: la secuencia de puntero es otra y puede seguir viva, y mientras
      siga llegando algo de ella el dedo está ahí y el gesto continúa como si
      nada. Solo si tampoco llega nada por ahí se da por perdido el rastro.

      Y perder el rastro **nunca descarta**. Que el sistema interrumpa no es la
      persona diciendo «tira esto»: la grabación queda fijada, con sus botones,
      y decide quien habló. Descartar en silencio fue lo que hacía que sostener
      el micrófono pareciera cancelarlo solo.
    */
    const giveUp = () => {
      if (!origin.current) return
      endHold()
      setLocked(true)
    }

    const stolen = () => {
      if (!origin.current) return
      window.clearTimeout(lost.current)
      lost.current = window.setTimeout(giveUp, TOUCH_GRACE)
    }

    /** Llegó algo del dedo: el rastro no estaba perdido. */
    const alive = () => {
      if (!lost.current) return
      window.clearTimeout(lost.current)
      lost.current = 0
    }

    const onPointerMove = (ev: PointerEvent) => moved(ev.clientX, ev.clientY)
    const onTouchMove = (ev: TouchEvent) => {
      const finger = ev.touches[0]
      if (finger) moved(finger.clientX, finger.clientY)
    }

    /*
      **Dos fuentes para el mismo dedo, y `pointercancel` deja de importar.**

      Android cancela el puntero cuando cree que una pulsación quieta va a ser
      una pulsación larga —la de seleccionar texto—. El menú no llega a salir,
      así que desde fuera solo se ve que el gesto muere solo a los medio segundo
      de presionar; moverse un poco lo evitaba, porque mover descarta la
      pulsación larga. Contra eso no hay heurística que valga: se descartara la
      grabación o se fijara, las dos formas de reaccionar estaban mal, porque el
      gesto seguía vivo bajo el dedo.

      Los eventos táctiles no se cancelan por eso, así que van en paralelo y
      dicen lo mismo. `pointercancel` ya no se escucha: si el puntero muere, el
      dedo sigue contándose por `touchmove` y el gesto acaba en `touchend`.
    */
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', lifted)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', lifted)
    window.addEventListener('touchcancel', stolen)
    detach.current = () => {
      window.clearTimeout(lost.current)
      lost.current = 0
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', lifted)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', lifted)
      window.removeEventListener('touchcancel', stolen)
      detach.current = null
    }

    void startRecording().then((ok) => {
      if (!ok) endHold()
      // El permiso pudo tardar más que el gesto entero.
      else if (abandoned.current) recorder.cancel()
    })
  }

  if (recorder.isRecording && !hold && !finishing) {
    return (
      <RecordingBar
        seconds={recorder.seconds}
        levels={recorder.levels}
        paused={recorder.isPaused}
        locked={locked}
        onCancel={recorder.cancel}
        onPause={recorder.pause}
        onResume={recorder.resume}
        onStop={() => void stopAndSend()}
      />
    )
  }

  /*
    **El composer no se desmonta mientras el dedo está encima.** El overlay de
    «mantener pulsado» se dibuja *sobre* él, no en su lugar.

    Sustituirlo quitaba del DOM el botón que había recibido el `pointerdown`, y
    eso —con el dedo, no con el ratón— dispara `pointercancel` al instante: el
    gesto moría nada más empezar. Primero se leyó como «se cancela con cualquier
    movimiento» y luego, al dejar de descartar en `pointercancel`, como «se
    bloquea de una». El mismo bug con dos caras.
  */
  return (
    <div className="relative">
      {hold && (
        <HoldToRecord seconds={recorder.seconds} dx={hold.dx} dy={hold.dy} anchor={anchor} />
      )}
      <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="bg-card border-t px-3 py-2.5"
    >
      {quoted && (
        <div className="bg-secondary/60 border-brand mb-2 flex items-start gap-2 rounded-md border-l-2 px-2.5 py-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-brand text-xs font-medium">{quoted.author}</p>
            <p className="text-muted-foreground truncate text-xs">{quoted.quote}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClearQuote?.()
              // El botón desaparece con la cita, y con él el foco. Sin devolverlo, la
              // siguiente tecla no va a ninguna parte y parece que se colgó.
              ref.current?.focus()
            }}
            aria-label="Quitar la cita"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -mr-1 grid size-5 shrink-0 place-items-center rounded focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </div>
      )}

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
        {!textOnly && (
          <ComposerAction label="Adjuntar archivo (próximamente)" Icon={Paperclip} disabled />
        )}

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

        {/*
          El orden decide qué botón manda: con algo escrito, enviar —lo que se escriba
          mientras Numi contesta entra en la cola—; con la caja vacía y Numi escribiendo,
          detener; y si no hay nota de voz que ofrecer (`textOnly`), enviar apagado, que
          es lo único que esa caja sabe hacer.
        */}
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
        ) : busy && onStop ? (
          /*
            **Detener ocupa el sitio del micrófono, no un sitio propio.**

            Es el botón de la derecha contando lo único que se puede hacer con la
            caja vacía mientras Numi escribe: grabar no se puede —una nota de voz no
            se encola (§32.5)— y parar sí. Con algo escrito manda enviar, que sigue
            haciendo falta porque lo que se escriba entretanto entra en la cola.

            Va con el mismo relleno que enviar, y no como icono suelto: es la acción
            principal del momento, y se pulsa donde ya estaba el pulgar.
          */
          <button
            type="button"
            onClick={onStop}
            aria-label="Detener la respuesta"
            title="Detener la respuesta"
            className={cn(
              'bg-primary text-primary-foreground hover:bg-primary-hover grid size-8 shrink-0 place-items-center rounded-full transition-all active:scale-95',
              'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
            )}
          >
            <Square aria-hidden className="size-3 fill-current" />
          </button>
        ) : textOnly ? (
          <button
            type="submit"
            disabled
            aria-label="Enviar mensaje"
            className="bg-secondary text-muted-foreground/70 grid size-8 shrink-0 cursor-not-allowed place-items-center rounded-full"
          >
            <ArrowUp className="size-4" />
          </button>
        ) : (
          <ComposerAction
            ref={micRef}
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
    </div>
  )
}
