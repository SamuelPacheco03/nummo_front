/**
 * **La onda de una nota de voz**: sus subidas y bajadas, resumidas en unos
 * pocos números.
 *
 * Vive aparte del reproductor porque la necesitan dos momentos distintos: al
 * grabar —para poder guardarla junto al mensaje— y al reproducir un audio del
 * que no la tenemos. Y porque decodificar audio se prueba mejor sin pantalla.
 */

/** Cuántas barras dibuja la onda. Es también el largo del array que se guarda. */
export const PEAK_COUNT = 32

/** Altura de las barras mientras no se sabe nada del audio. */
export const FLAT_PEAKS: readonly number[] = Array<number>(PEAK_COUNT).fill(0.35)

/**
 * Resume una señal en `count` picos (RMS por tramo, normalizado a 0–1).
 *
 * RMS y no el máximo absoluto: el pico se dispara con un golpe de mesa y deja
 * el resto de la onda plana, mientras que la media cuadrática dibuja el volumen
 * que de verdad se oye.
 */
export function peaksFromSamples(data: Float32Array, count = PEAK_COUNT): number[] {
  const size = Math.floor(data.length / count) || 1
  const peaks: number[] = []
  for (let i = 0; i < count; i++) {
    let sum = 0
    const start = i * size
    for (let j = 0; j < size; j++) sum += (data[start + j] ?? 0) ** 2
    peaks.push(Math.sqrt(sum / size))
  }
  const max = Math.max(...peaks, 1e-4)
  return peaks.map((p) => Math.min(p / max, 1))
}

/** Decodifica un audio (por URL o `Blob`) y devuelve su onda. */
export async function extractPeaks(source: string | Blob, count = PEAK_COUNT): Promise<number[]> {
  const arrayBuffer =
    typeof source === 'string' ? await (await fetch(source)).arrayBuffer() : await source.arrayBuffer()
  const ctx = new AudioContext()
  try {
    const audio = await ctx.decodeAudioData(arrayBuffer)
    return peaksFromSamples(audio.getChannelData(0), count)
  } finally {
    void ctx.close()
  }
}

/**
 * Redondea la onda a dos decimales para mandarla y guardarla.
 *
 * Con 32 barras de 0 a 1, dos decimales son 32 números de 4 caracteres: la
 * onda entera cabe en unos 130 bytes y a ojo se ve idéntica. Guardar los
 * dieciséis decimales de un `float` sería multiplicar el tamaño por cinco para
 * dibujar exactamente las mismas barras.
 */
export function roundPeaks(peaks: number[]): number[] {
  return peaks.map((p) => Math.round(Math.min(Math.max(p, 0), 1) * 100) / 100)
}

/**
 * Onda que llega de fuera (el historial). Devuelve `undefined` si no es una
 * onda utilizable: viene del servidor y se dibuja tal cual, así que se mira
 * antes de creerle.
 */
export function sanitizePeaks(value: unknown): number[] | undefined {
  if (!Array.isArray(value) || value.length === 0 || value.length > 256) return undefined
  const peaks = value.map((n) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(Math.max(n, 0), 1) : 0))
  return peaks.some((p) => p > 0) ? peaks : undefined
}

/**
 * Onda y duración de una grabación recién hecha.
 *
 * Se llama justo antes de enviarla: es el único momento en que el audio está
 * en la mano sin costar una petición. Si el navegador no sabe decodificar lo
 * que acaba de grabar, se sigue sin onda — es decoración, no puede impedir que
 * el mensaje salga.
 */
export async function describeRecording(blob: Blob): Promise<[number[] | undefined, number | undefined]> {
  const arrayBuffer = await blob.arrayBuffer()
  const ctx = new AudioContext()
  try {
    const audio = await ctx.decodeAudioData(arrayBuffer)
    return [roundPeaks(peaksFromSamples(audio.getChannelData(0))), Math.round(audio.duration * 10) / 10]
  } catch {
    return [undefined, undefined]
  } finally {
    void ctx.close()
  }
}
