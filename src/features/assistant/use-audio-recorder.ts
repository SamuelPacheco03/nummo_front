import { useCallback, useEffect, useRef, useState } from 'react'
import { rms } from './waveform'

/** Cuántas barras dibuja la onda en vivo mientras se graba. */
export const LIVE_PEAKS = 40
/** Cada cuánto se mide el volumen del micrófono, en ms. */
const SAMPLE_MS = 90
/**
 * Cuánto se estira la señal para dibujarla.
 *
 * Hablando a un teléfono el RMS se mueve entre 0,02 y 0,2: dibujado tal cual, la
 * onda es una línea plana y no se distingue hablar de callar, que es justo lo
 * único que la onda tiene que contar.
 */
const LEVEL_GAIN = 4

const SILENCE: number[] = Array<number>(LIVE_PEAKS).fill(0)

interface AudioRecorder {
  isRecording: boolean
  /** Fijada pero en pausa: sigue viva, no está capturando. */
  isPaused: boolean
  /** Segundos transcurridos de la grabación en curso. */
  seconds: number
  /** Volumen de los últimos instantes, de 0 a 1. El más reciente, al final. */
  levels: number[]
  /** Pide permiso y empieza a grabar. `false` si no se pudo (sin permiso/micrófono). */
  start: () => Promise<boolean>
  /** Detiene y devuelve el audio grabado (o `null` si quedó vacío). */
  stop: () => Promise<Blob | null>
  /** Descarta la grabación en curso sin devolver nada. */
  cancel: () => void
  pause: () => void
  resume: () => void
}

/**
 * Grabación de notas de voz con MediaRecorder. `stop()` resuelve con el `Blob`
 * cuando el navegador termina de volcar los datos (evento `stop`), por eso es
 * asíncrono. Libera el micrófono siempre (al parar, cancelar o desmontar).
 *
 * Mientras graba mide el volumen del micrófono para poder **dibujar la onda en
 * vivo** (§32.2): sin ella la barra de una grabación fijada es un reloj que
 * corre, y no hay forma de saber si el micrófono está cogiendo algo hasta que
 * se escucha lo enviado.
 */
export function useAudioRecorder(): AudioRecorder {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [levels, setLevels] = useState<number[]>(SILENCE)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickRef = useRef<number | null>(null)
  const levelRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const cancelledRef = useRef(false)
  const resolveRef = useRef<((blob: Blob | null) => void) | null>(null)

  const stopTimers = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (levelRef.current !== null) {
      clearInterval(levelRef.current)
      levelRef.current = null
    }
  }, [])

  /** Arranca (o rearranca, al reanudar) el reloj y la medición de volumen. */
  const startTimers = useCallback(() => {
    stopTimers()
    tickRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    const analyser = analyserRef.current
    if (!analyser) return
    const buffer = new Float32Array(analyser.fftSize)
    levelRef.current = window.setInterval(() => {
      analyser.getFloatTimeDomainData(buffer)
      const level = Math.min(1, rms(buffer) * LEVEL_GAIN)
      // La onda avanza hacia la izquierda: lo último dicho entra por la derecha.
      setLevels((prev) => [...prev.slice(1), level])
    }, SAMPLE_MS)
  }, [stopTimers])

  const teardown = useCallback(() => {
    stopTimers()
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop())
    recorderRef.current = null
    analyserRef.current = null
    void contextRef.current?.close().catch(() => {})
    contextRef.current = null
    setIsRecording(false)
    setIsPaused(false)
    setLevels(SILENCE)
  }, [stopTimers])

  // Si el panel se cierra a media grabación, no dejar el micrófono abierto.
  useEffect(() => () => teardown(), [teardown])

  const start = useCallback(async () => {
    if (recorderRef.current) return false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      cancelledRef.current = false
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        const blob =
          cancelledRef.current || chunksRef.current.length === 0
            ? null
            : new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        teardown()
        resolveRef.current?.(blob)
        resolveRef.current = null
      }
      recorderRef.current = mr
      mr.start()

      // Escucha aparte para dibujar: no toca lo que se graba, solo lo mira.
      // Si el navegador no da Web Audio, se graba igual y la onda va plana.
      try {
        const context = new AudioContext()
        void context.resume()
        const analyser = context.createAnalyser()
        analyser.fftSize = 1024
        context.createMediaStreamSource(stream).connect(analyser)
        contextRef.current = context
        analyserRef.current = analyser
      } catch {
        analyserRef.current = null
      }

      setSeconds(0)
      setLevels(SILENCE)
      setIsRecording(true)
      setIsPaused(false)
      startTimers()
      return true
    } catch {
      teardown()
      return false
    }
  }, [startTimers, teardown])

  const stop = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const mr = recorderRef.current
        if (!mr) {
          resolve(null)
          return
        }
        resolveRef.current = resolve
        mr.stop() // dispara `onstop`, que resuelve con el Blob
      }),
    [],
  )

  const cancel = useCallback(() => {
    const mr = recorderRef.current
    if (!mr) return
    cancelledRef.current = true
    mr.stop()
  }, [])

  const pause = useCallback(() => {
    const mr = recorderRef.current
    if (!mr || mr.state !== 'recording') return
    mr.pause()
    stopTimers()
    // En pausa la onda se queda quieta en lo último que se oyó, no en cero: en
    // cero parecería que se cortó el micrófono.
    setIsPaused(true)
  }, [stopTimers])

  const resume = useCallback(() => {
    const mr = recorderRef.current
    if (!mr || mr.state !== 'paused') return
    mr.resume()
    setIsPaused(false)
    startTimers()
  }, [startTimers])

  return { isRecording, isPaused, seconds, levels, start, stop, cancel, pause, resume }
}

/** Segundos → `m:ss` (para el temporizador y la duración del audio). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
