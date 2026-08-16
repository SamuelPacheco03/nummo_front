import { useRef, useState, type MouseEvent } from 'react'
import { Pause, Play } from 'lucide-react'
import { formatDuration } from './use-audio-recorder'

/**
 * Reproductor compacto de una nota de voz (play/pausa + barra + tiempo), al
 * estilo de una app de mensajería. Los colores heredan de la burbuja
 * (`currentColor`), así se ve bien tanto del lado propio como del de Numi.
 *
 * Workaround: los blobs de MediaRecorder (webm) suelen reportar `duration`
 * Infinity; se fuerza un salto al final para que el navegador calcule la real.
 */
export function AudioPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = () => {
    const el = ref.current
    if (!el) return
    if (playing) el.pause()
    else void el.play()
  }

  const seek = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    el.currentTime = Math.min(Math.max(ratio, 0), 1) * duration
  }

  const pct = duration ? (current / duration) * 100 : 0

  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        className="grid size-8 shrink-0 place-items-center rounded-full bg-current/15 transition-transform active:scale-95"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
      </button>

      <div className="min-w-[6.5rem] flex-1">
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div onClick={seek} className="h-1.5 cursor-pointer overflow-hidden rounded-full bg-current/20">
          <div className="h-full rounded-full bg-current transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-[0.62rem] tabular-nums opacity-70">
          {formatDuration(playing || current ? current : duration)}
        </div>
      </div>

      <audio
        ref={ref}
        src={src}
        preload="metadata"
        hidden
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setCurrent(0)
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget
          if (el.duration === Infinity) el.currentTime = 1e101 // fuerza el cálculo real
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
