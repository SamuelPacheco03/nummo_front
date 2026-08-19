import { ArrowUp, Lock, Pause, Play, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration } from './use-audio-recorder'

/** La onda en vivo: una barra por medición, la más reciente a la derecha. */
function LiveWaveform({ levels, paused }: { levels: number[]; paused: boolean }) {
  return (
    <div aria-hidden className="flex h-8 flex-1 items-center gap-[3px]">
      {levels.map((level, i) => (
        <span
          key={i}
          className={cn(
            'min-w-[2px] flex-1 rounded-full transition-[height] duration-100',
            paused ? 'bg-muted-foreground/35' : 'bg-foreground/60',
          )}
          // Un mínimo visible: en silencio la onda es una línea, no un hueco.
          style={{ height: `${Math.max(level * 100, 9)}%` }}
        />
      ))}
    </div>
  )
}

/**
 * **La barra de una grabación que ya no necesita el dedo**: la fijada con el
 * candado en móvil, y la de escritorio, que empieza con un clic.
 *
 * Es la misma en los dos sitios a propósito. Y se parece a la de WhatsApp
 * porque hace lo mismo y la gente ya sabe leerla: arriba lo que llevas grabado
 * —reloj y onda, que es la única forma de ver que el micrófono está cogiendo
 * algo—, y abajo las tres salidas, separadas y del tamaño de un pulgar: tirarlo,
 * parar un momento, mandarlo.
 *
 * **Tirar la grabación no se confirma.** Es el botón de la izquierda, lejos del
 * de enviar, y quien lo pulsa acaba de decidir que lo que dijo no vale; un
 * diálogo ahí solo estorba (§45).
 */
export function RecordingBar({
  seconds,
  levels,
  paused,
  locked,
  onCancel,
  onPause,
  onResume,
  onStop,
}: {
  seconds: number
  levels: number[]
  paused: boolean
  /** Llegó aquí subiendo al candado, así que conviene decir que quedó fijada. */
  locked?: boolean
  onCancel: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
}) {
  return (
    <div className="bg-card border-t px-3 pt-2.5 pb-2.5">
      <div className="flex items-center gap-3 px-1.5">
        <span className="flex shrink-0 items-center gap-2 text-sm tabular-nums">
          <span
            className={cn(
              'bg-destructive size-2 rounded-full transition-opacity',
              paused ? 'opacity-30' : 'animate-pulse',
            )}
          />
          {formatDuration(seconds)}
        </span>

        <LiveWaveform levels={levels} paused={paused} />

        {locked && (
          <span
            className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs"
            title="Grabación fijada: puedes soltar el dedo"
          >
            <Lock aria-hidden className="size-3.5" />
            Fijada
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Descartar grabación"
          title="Descartar"
          className="bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:ring-ring/50 grid size-11 shrink-0 place-items-center rounded-full transition-all active:scale-95 focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <Trash2 className="size-5" />
        </button>

        <button
          type="button"
          onClick={paused ? onResume : onPause}
          className="bg-secondary text-foreground hover:bg-secondary/80 focus-visible:ring-ring/50 flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-sm font-medium transition-all active:scale-[0.98] focus-visible:ring-[3px] focus-visible:outline-none"
        >
          {paused ? (
            <Play aria-hidden className="size-4 translate-x-px" />
          ) : (
            <Pause aria-hidden className="size-4" />
          )}
          {paused ? 'Reanudar' : 'Pausar'}
        </button>

        <button
          type="button"
          onClick={onStop}
          aria-label="Enviar nota de voz"
          title="Enviar"
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring/50 grid size-11 shrink-0 place-items-center rounded-full transition-all active:scale-95 focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <ArrowUp className="size-5" />
        </button>
      </div>
    </div>
  )
}
