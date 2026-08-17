import { describe, expect, it } from 'vitest'
import { PEAK_COUNT, peaksFromSamples, roundPeaks, sanitizePeaks } from './waveform'

describe('peaksFromSamples', () => {
  it('resume la señal en el número de barras que se dibuja', () => {
    const samples = new Float32Array(4096).map((_, i) => Math.sin(i / 10))
    expect(peaksFromSamples(samples)).toHaveLength(PEAK_COUNT)
  })

  it('normaliza al tramo más fuerte, así que siempre hay un 1', () => {
    // Primera mitad callada, segunda mitad a tope.
    const samples = new Float32Array(3200).map((_, i) => (i < 1600 ? 0.1 : 1))
    const peaks = peaksFromSamples(samples, 4)
    expect(Math.max(...peaks)).toBeCloseTo(1)
    expect(peaks[0]).toBeLessThan(peaks[3] as number)
  })

  it('no divide por cero con silencio', () => {
    const peaks = peaksFromSamples(new Float32Array(1000), 8)
    expect(peaks.every((p) => Number.isFinite(p))).toBe(true)
  })
})

describe('roundPeaks', () => {
  it('deja dos decimales y recorta fuera de rango', () => {
    expect(roundPeaks([0.123456, 1.8, -0.4])).toEqual([0.12, 1, 0])
  })
})

describe('sanitizePeaks', () => {
  it('acepta una onda del servidor y la recorta a 0–1', () => {
    expect(sanitizePeaks([0.5, 2, -1])).toEqual([0.5, 1, 0])
  })

  it('descarta lo que no se puede dibujar', () => {
    expect(sanitizePeaks(undefined)).toBeUndefined()
    expect(sanitizePeaks([])).toBeUndefined()
    expect(sanitizePeaks('0.5,0.6')).toBeUndefined()
    expect(sanitizePeaks(Array(300).fill(0.5))).toBeUndefined() // largo absurdo
    expect(sanitizePeaks([0, 0, 0])).toBeUndefined() // onda plana = ninguna onda
  })

  it('un valor roto no tumba la onda entera', () => {
    expect(sanitizePeaks([0.4, Number.NaN, 'x', 0.9])).toEqual([0.4, 0, 0, 0.9])
  })
})
