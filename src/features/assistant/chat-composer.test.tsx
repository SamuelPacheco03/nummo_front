import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { ChatComposer } from './chat-composer'

/** jsdom no tiene micrófono: se finge uno que graba y devuelve un blob. */
function stubRecorder() {
  const track = { stop: vi.fn() }
  vi.stubGlobal('MediaRecorder', class {
    static isTypeSupported = () => true
    stream = { getTracks: () => [track] }
    mimeType = 'audio/webm'
    ondataavailable: ((e: { data: Blob }) => void) | null = null
    onstop: (() => void) | null = null
    start() {
      this.ondataavailable?.({ data: new Blob(['x'], { type: 'audio/webm' }) })
    }
    stop() {
      this.onstop?.()
    }
  })
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track] }) },
  })
}

/** El composer decide por el puntero: `coarse` es dedo, lo demás es ratón. */
function stubPointer(kind: 'coarse' | 'fine') {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((q: string) => ({
      matches: q.includes('coarse') ? kind === 'coarse' : kind === 'fine',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

const press = (el: Element, x = 200, y = 700) =>
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y }))
const moveTo = (x: number, y: number) =>
  window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y }))
const release = () => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
const systemSteals = () => window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }))

beforeEach(stubRecorder)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('el botón sigue en el DOM durante todo el gesto', async () => {
  stubPointer('coarse')
  render(<ChatComposer onSend={vi.fn()} onSendAudio={vi.fn()} />)

  const mic = screen.getByRole('button', { name: /mantén pulsado/i })
  press(mic)
  await screen.findByText('Desliza para cancelar')

  /*
    Si el overlay sustituyera al composer, el navegador quitaría del DOM el
    elemento que recibió el `pointerdown` y dispararía `pointercancel` al
    instante — con el dedo, no con el ratón —. El gesto moría antes de empezar.
  */
  expect(mic.isConnected).toBe(true)
})

test('con el dedo: mantener pulsado graba y soltar envía', async () => {
  stubPointer('coarse')
  const onSendAudio = vi.fn()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={onSendAudio} />)

  const mic = screen.getByRole('button', { name: /mantén pulsado/i })
  const started = performance.now()
  press(mic)
  await screen.findByText('Desliza para cancelar')

  // Una grabación de verdad, no un roce.
  vi.spyOn(performance, 'now').mockReturnValue(started + 2000)
  release()
  await waitFor(() => expect(onSendAudio).toHaveBeenCalledTimes(1))
})

test('con el dedo: deslizar a la izquierda cancela sin enviar', async () => {
  stubPointer('coarse')
  const onSendAudio = vi.fn()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={onSendAudio} />)

  press(screen.getByRole('button', { name: /mantén pulsado/i }))
  await screen.findByText('Desliza para cancelar')
  moveTo(20, 700) // 180 px a la izquierda
  release()

  await waitFor(() => expect(screen.queryByText('Desliza para cancelar')).not.toBeInTheDocument())
  expect(onSendAudio).not.toHaveBeenCalled()
})

test('con el dedo: el pulso de la mano no cancela nada', async () => {
  stubPointer('coarse')
  const onSendAudio = vi.fn()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={onSendAudio} />)

  const started = performance.now()
  press(screen.getByRole('button', { name: /mantén pulsado/i }), 200, 700)
  await screen.findByText('Desliza para cancelar')

  // Nadie sostiene el pulgar quieto mientras habla.
  moveTo(194, 703)
  moveTo(206, 696)
  moveTo(198, 701)
  expect(screen.getByText('Desliza para cancelar')).toBeInTheDocument()

  vi.spyOn(performance, 'now').mockReturnValue(started + 2000)
  release()
  await waitFor(() => expect(onSendAudio).toHaveBeenCalledTimes(1))
})

test('con el dedo: subir en diagonal fija, no cancela', async () => {
  stubPointer('coarse')
  const onSendAudio = vi.fn()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={onSendAudio} />)

  press(screen.getByRole('button', { name: /mantén pulsado/i }), 200, 700)
  await screen.findByText('Desliza para cancelar')
  // Un pulgar sube torcido: 40 px arriba y 30 a la izquierda. Manda el eje del
  // primer movimiento, así que esto es «fijar» y no «cancelar».
  moveTo(190, 690)
  moveTo(170, 660)
  moveTo(160, 640)

  expect(await screen.findByText('Grabando…')).toBeInTheDocument()
  expect(onSendAudio).not.toHaveBeenCalled()
})

test('si el sistema se queda con el gesto, la grabación no se pierde', async () => {
  stubPointer('coarse')
  render(<ChatComposer onSend={vi.fn()} onSendAudio={vi.fn()} />)

  press(screen.getByRole('button', { name: /mantén pulsado/i }))
  await screen.findByText('Desliza para cancelar')
  systemSteals()

  // Sigue grabando, con sus botones: quien decide si se tira es la persona.
  expect(await screen.findByText('Grabando…')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Cancelar grabación' })).toBeInTheDocument()
})

test('con el dedo: subir fija la grabación y soltar no la manda', async () => {
  stubPointer('coarse')
  const onSendAudio = vi.fn()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={onSendAudio} />)

  press(screen.getByRole('button', { name: /mantén pulsado/i }))
  await screen.findByText('Desliza para cancelar')
  moveTo(200, 600) // 100 px hacia arriba
  release()

  // Fijada: sigue grabando sola, con sus botones de parar y descartar.
  expect(await screen.findByText('Grabando…')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Enviar audio' })).toBeInTheDocument()
  expect(onSendAudio).not.toHaveBeenCalled()
})

test('con el dedo: un toque suelto no manda un audio de dos décimas', async () => {
  stubPointer('coarse')
  const onSendAudio = vi.fn()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={onSendAudio} />)

  press(screen.getByRole('button', { name: /mantén pulsado/i }))
  await screen.findByText('Desliza para cancelar')
  release()

  await waitFor(() => expect(screen.queryByText('Desliza para cancelar')).not.toBeInTheDocument())
  expect(onSendAudio).not.toHaveBeenCalled()
})

test('con ratón: un clic empieza y el botón de enviar termina', async () => {
  stubPointer('fine')
  const onSendAudio = vi.fn()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={onSendAudio} />)

  // Sostener el botón del ratón mientras se habla no lo hace nadie.
  const mic = screen.getByRole('button', { name: 'Grabar nota de voz' })
  press(mic)
  expect(screen.queryByText('Desliza para cancelar')).not.toBeInTheDocument()

  mic.click()
  expect(await screen.findByText('Grabando…')).toBeInTheDocument()
  screen.getByRole('button', { name: 'Enviar audio' }).click()
  await waitFor(() => expect(onSendAudio).toHaveBeenCalledTimes(1))
})
