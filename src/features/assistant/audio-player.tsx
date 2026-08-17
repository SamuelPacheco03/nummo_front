import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { cn } from '@/lib/utils'
import { formatDuration } from './use-audio-recorder'
import { formatTime } from './utils'

const BARS = 32

/** Decodifica el audio y saca `BARS` picos (RMS normalizado) para la onda. */
async function extractPeaks(url: string, buckets: number): Promise<number[]> {
  const res = await fetch(url)
  const arrayBuffer = await res.arrayBuffer()
  const ctx = new AudioContext()
  try {
    const audio = await ctx.decodeAudioData(arrayBuffer)
    const data = audio.getChannelData(0)
    const size = Math.floor(data.length / buckets) || 1
    const peaks: number[] = []
    for (let i = 0; i < buckets; i++) {
      let sum = 0
      const start = i * size
      for (let j = 0; j < size; j++) sum += (data[start + j] ?? 0) ** 2
      peaks.push(Math.sqrt(sum / size))
    }
    const max = Math.max(...peaks, 1e-4)
    return peaks.map((p) => Math.min(p / max, 1))
  } finally {
    void ctx.close()
  }
}

const FLAT = Array<number>(BARS).fill(0.35)

/** Onda del audio; sin audio todavía (o si falla la decodificación), barras planas. */
function useWaveform(src: string | undefined): number[] {
  const [peaks, setPeaks] = useState<number[]>(FLAT)
  useEffect(() => {
    if (!src) {
      setPeaks(FLAT)
      return
    }
    let alive = true
    extractPeaks(src, BARS)
      .then((p) => alive && setPeaks(p))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [src])
  return peaks
}

/**
 * Nota de voz al estilo de una app de mensajería: play/pausa + onda con los
 * altos y bajos del audio, y debajo la duración a un lado y la hora al otro.
 * Los colores heredan de la burbuja (`currentColor`).
 *
 * **El audio puede no estar todavía.** Los de esta sesión llegan como `src` —un
 * blob local, listo—; los del historial hay que pedirlos, y entonces llega
 * `load`: se llama al pulsar play, y hasta ahí la onda va plana. Es lo que hace
 * cualquier app de mensajería con una nota que aún no ha descargado, y evita
 * firmar treinta URLs temporales al abrir un hilo largo.
 */
export function AudioPlayer({
  src,
  load,
  at,
}: {
  src?: string
  /** Trae la URL del audio. Se invoca al pulsar play; `force` salta la caché. */
  load?: (force?: boolean) => Promise<string>
  at: string
}) {
  const ref = useRef<HTMLAudioElement>(null)
  const [resolved, setResolved] = useState<string | undefined>(src)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  // Play pedido antes de tener el audio: se cumple en cuanto llega.
  const wanted = useRef(false)
  const peaks = useWaveform(resolved)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => setResolved(src), [src])

  useEffect(() => {
    if (!resolved || !wanted.current) return
    wanted.current = false
    void ref.current?.play()
  }, [resolved])

  /** Pide el audio y, si sale bien, lo deja listo para sonar. */
  const fetchAudio = useCallback(async (force: boolean) => {
    if (!load || loading) return
    wanted.current = true
    setLoading(true)
    setFailed(false)
    try {
      setResolved(await load(force))
    } catch {
      wanted.current = false
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [load, loading])

  const toggle = () => {
    if (!resolved) {
      // Tras un fallo se pide una URL nueva: la anterior pudo caducar.
      void fetchAudio(failed)
      return
    }
    const el = ref.current
    if (!el) return
    if (playing) el.pause()
    else void el.play()
  }

  const seekTo = (ratio: number) => {
    const el = ref.current
    if (!el || !duration) return
    el.currentTime = Math.min(Math.max(ratio, 0), 1) * duration
  }

  const onBarsClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    seekTo((e.clientX - rect.left) / rect.width)
  }

  const progress = duration ? current / duration : 0

  return (
    <div className="min-w-[12.5rem]">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          aria-label={
            failed
              ? 'Reintentar la nota de voz'
              : playing
                ? 'Pausar la nota de voz'
                : 'Reproducir la nota de voz'
          }
          className="grid size-8 shrink-0 place-items-center rounded-full bg-current/15 transition-transform active:scale-95"
        >
          {loading ? (
            <Loader size="sm" />
          ) : failed ? (
            <RotateCcw className="size-4" />
          ) : playing ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4 translate-x-px" />
          )}
        </button>

        <div className="relative flex-1">
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div onClick={onBarsClick} className="flex h-7 cursor-pointer items-center gap-[2px]">
            {peaks.map((p, i) => (
              <span
                key={i}
                className={cn(
                  'min-w-[2px] flex-1 rounded-full transition-colors',
                  i / peaks.length < progress ? 'bg-current' : 'bg-current/30',
                )}
                style={{ height: `${Math.max(p * 100, 14)}%` }}
              />
            ))}
          </div>
          {duration > 0 && (
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current shadow-sm"
              style={{ left: `${Math.min(progress, 1) * 100}%` }}
            />
          )}
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between gap-3 text-[0.62rem] tabular-nums opacity-70">
        <span>
          {failed
            ? 'No se pudo cargar'
            : formatDuration(playing || current ? current : duration)}
        </span>
        <time dateTime={at}>{formatTime(at)}</time>
      </div>

      <audio
        ref={ref}
        src={resolved}
        preload="metadata"
        hidden
        /*
          La URL firmada caduca. Si al reproducir ya no vale, se olvida y el
          botón vuelve a ser un «reintentar»: la siguiente pulsación pide otra.
        */
        onError={() => {
          if (!resolved || !load) return
          setResolved(undefined)
          setFailed(true)
          setPlaying(false)
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setCurrent(0)
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget
          if (el.duration === Infinity) el.currentTime = 1e101 // fuerza el cálculo real (bug webm)
          else setDuration(el.duration)
        }}
        onDurationChange={(e) => {
          const el = e.currentTarget
          if (!Number.isFinite(el.duration)) return
          setDuration(el.duration)
          if (el.currentTime > el.duration) el.currentTime = 0 // deshace el salto forzado
        }}
      />
    </div>
  )
}
