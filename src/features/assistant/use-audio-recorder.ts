import { useCallback, useEffect, useRef, useState } from 'react'

export interface AudioRecorder {
  isRecording: boolean
  /** Segundos transcurridos de la grabación en curso. */
  seconds: number
  /** Pide permiso y empieza a grabar. `false` si no se pudo (sin permiso/micrófono). */
  start: () => Promise<boolean>
  /** Detiene y devuelve el audio grabado (o `null` si quedó vacío). */
  stop: () => Promise<Blob | null>
  /** Descarta la grabación en curso sin devolver nada. */
  cancel: () => void
}

/**
 * Grabación de notas de voz con MediaRecorder. `stop()` resuelve con el `Blob`
 * cuando el navegador termina de volcar los datos (evento `stop`), por eso es
 * asíncrono. Libera el micrófono siempre (al parar, cancelar o desmontar).
 */
export function useAudioRecorder(): AudioRecorder {
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)
  const resolveRef = useRef<((blob: Blob | null) => void) | null>(null)

  const teardown = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop())
    recorderRef.current = null
    setIsRecording(false)
  }, [])

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
      setSeconds(0)
      setIsRecording(true)
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
      return true
    } catch {
      teardown()
      return false
    }
  }, [teardown])

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

  return { isRecording, seconds, start, stop, cancel }
}

/** Segundos → `m:ss` (para el temporizador y la duración del audio). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
