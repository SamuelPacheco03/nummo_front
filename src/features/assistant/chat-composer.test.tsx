import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const avisos = vi.hoisted(() => ({ errores: [] as string[] }))
/* `toast` se usa suelto —«Mantén pulsado el micrófono»— y también con `.error`, así
   que el doble tiene que ser una función con métodos, no un objeto. */
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: (t: string) => avisos.errores.push(t),
    success: vi.fn(),
  }),
}))
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ChatComposer } from './chat-composer'
import { TOUCH_GRACE } from './hold-to-record'

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
/** El sistema se queda con el gesto de verdad: una llamada, el gesto del borde. */
const systemSteals = () => window.dispatchEvent(new Event('touchcancel', { bubbles: true }))
/** Android cancelando el puntero por una pulsación larga que no llega a salir. */
const pointerDies = () =>
  window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }))

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
  // Un pulgar sube torcido: 120 px arriba y 40 a la izquierda. Manda el eje del
  // primer movimiento, así que esto es «fijar» y no «cancelar».
  moveTo(190, 690)
  moveTo(175, 640)
  moveTo(160, 580)

  expect(await screen.findByText('Fijada')).toBeInTheDocument()
  expect(onSendAudio).not.toHaveBeenCalled()
})

test('que Android cancele el puntero no rompe el gesto', async () => {
  stubPointer('coarse')
  const onSendAudio = vi.fn()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={onSendAudio} />)

  const started = performance.now()
  press(screen.getByRole('button', { name: /mantén pulsado/i }))
  await screen.findByText('Desliza para cancelar')

  /*
    Sostener el dedo quieto hace que Android cancele el puntero, creyendo que
    va a ser una pulsación larga. El dedo sigue ahí: el gesto también.
  */
  pointerDies()
  expect(screen.getByText('Desliza para cancelar')).toBeInTheDocument()

  vi.spyOn(performance, 'now').mockReturnValue(started + 2000)
  window.dispatchEvent(new Event('touchend', { bubbles: true }))
  await waitFor(() => expect(onSendAudio).toHaveBeenCalledTimes(1))
})

test('que se lleve el táctil tampoco, si el puntero sigue vivo', async () => {
  stubPointer('coarse')
  const onSendAudio = vi.fn()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={onSendAudio} />)

  const started = performance.now()
  press(screen.getByRole('button', { name: /mantén pulsado/i }))
  await screen.findByText('Desliza para cancelar')

  // Las dos secuencias son independientes: mientras una siga hablando, el dedo
  // está ahí y no hay nada que decidir.
  systemSteals()
  moveTo(200, 695)
  expect(screen.getByText('Desliza para cancelar')).toBeInTheDocument()

  vi.spyOn(performance, 'now').mockReturnValue(started + 2000)
  release()
  await waitFor(() => expect(onSendAudio).toHaveBeenCalledTimes(1))
})

test('si además se pierde el rastro del dedo, la grabación se fija, no se tira', async () => {
  stubPointer('coarse')
  const onSendAudio = vi.fn()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={onSendAudio} />)

  press(screen.getByRole('button', { name: /mantén pulsado/i }))
  await screen.findByText('Desliza para cancelar')
  systemSteals()

  /*
    Ni el táctil ni el puntero vuelven a decir nada: no hay forma de saber
    dónde está el dedo. Que el sistema interrumpa no es la persona diciendo
    «tira esto», así que la grabación queda fijada y decide quien habló.
  */
  expect(await screen.findByText('Fijada', undefined, { timeout: TOUCH_GRACE + 1000 })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Descartar grabación' })).toBeInTheDocument()
  expect(onSendAudio).not.toHaveBeenCalled()
})

test('con el dedo: subir fija la grabación y soltar no la manda', async () => {
  stubPointer('coarse')
  const onSendAudio = vi.fn()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={onSendAudio} />)

  press(screen.getByRole('button', { name: /mantén pulsado/i }))
  await screen.findByText('Desliza para cancelar')
  moveTo(200, 560) // 140 px hacia arriba: por encima del umbral de fijar
  release()

  // Fijada: sigue grabando sola, con sus botones de parar y descartar.
  expect(await screen.findByText('Fijada')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Enviar nota de voz' })).toBeInTheDocument()
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
  // De escritorio: no viene del candado, así que la barra no dice «fijada».
  expect(await screen.findByRole('button', { name: 'Enviar nota de voz' })).toBeInTheDocument()
  expect(screen.queryByText('Fijada')).not.toBeInTheDocument()
  screen.getByRole('button', { name: 'Enviar nota de voz' }).click()
  await waitFor(() => expect(onSendAudio).toHaveBeenCalledTimes(1))
})

test('sostener el micrófono no cuenta como pulsación larga', () => {
  stubPointer('coarse')
  render(<ChatComposer onSend={vi.fn()} onSendAudio={vi.fn()} />)

  const mic = screen.getByRole('button', { name: /mantén pulsado/i })
  const toque = new Event('touchstart', { bubbles: true, cancelable: true })
  mic.dispatchEvent(toque)

  /*
    Android decide a los ~500 ms que un toque quieto va a ser una pulsación
    larga y cancela el gesto: sostener el micrófono sin moverse mataba la
    grabación sola. Impedir el comportamiento por defecto del toque es lo que
    lo evita, y solo funciona con un escucha no pasivo puesto a mano.
  */
  expect(toque.defaultPrevented).toBe(true)
})

/** jsdom no crea `blob:`; la miniatura solo necesita que la URL exista. */
function stubObjectUrl() {
  URL.createObjectURL = vi.fn(() => 'blob:foto')
  URL.revokeObjectURL = vi.fn()
}

/** Elige un archivo en el input oculto que dispara el clip. */
function adjuntar(file: File) {
  const input = document.querySelector('input[type="file"]')
  if (!input) throw new Error('el composer no trae input de archivo')
  fireEvent.change(input, { target: { files: [file] } })
}

test('una imagen sola es un mensaje: se puede enviar sin escribir nada', async () => {
  stubPointer('fine')
  stubObjectUrl()
  const onSend = vi.fn()
  const onSendImage = vi.fn()
  render(<ChatComposer onSend={onSend} onSendAudio={vi.fn()} onSendImage={onSendImage} />)

  // Con la caja vacía manda el micrófono; la foto es lo que trae la flecha.
  expect(screen.queryByRole('button', { name: 'Enviar mensaje' })).not.toBeInTheDocument()

  const foto = new File(['x'], 'recibo.png', { type: 'image/png' })
  adjuntar(foto)

  expect(await screen.findByText('recibo.png')).toBeInTheDocument()
  screen.getByRole('button', { name: 'Enviar mensaje' }).click()

  await waitFor(() => expect(onSendImage).toHaveBeenCalledWith(foto, ''))
  // Y no se va también por el camino del texto: son dos endpoints distintos.
  expect(onSend).not.toHaveBeenCalled()
})

test('lo escrito viaja con la imagen, no por su cuenta', async () => {
  stubPointer('fine')
  stubObjectUrl()
  const onSend = vi.fn()
  const onSendImage = vi.fn()
  render(<ChatComposer onSend={onSend} onSendAudio={vi.fn()} onSendImage={onSendImage} />)

  adjuntar(new File(['x'], 'factura.jpg', { type: 'image/jpeg' }))
  fireEvent.change(screen.getByLabelText('Mensaje para Numi'), {
    target: { value: '¿de cuánto es?' },
  })
  screen.getByRole('button', { name: 'Enviar mensaje' }).click()

  await waitFor(() => expect(onSendImage).toHaveBeenCalledTimes(1))
  expect(onSendImage.mock.calls[0]?.[1]).toBe('¿de cuánto es?')
  expect(onSend).not.toHaveBeenCalled()
})

test('quitar la imagen devuelve la caja a como estaba', async () => {
  stubPointer('fine')
  stubObjectUrl()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={vi.fn()} onSendImage={vi.fn()} />)

  adjuntar(new File(['x'], 'recibo.png', { type: 'image/png' }))
  expect(await screen.findByText('recibo.png')).toBeInTheDocument()

  screen.getByRole('button', { name: 'Quitar la imagen' }).click()

  await waitFor(() => expect(screen.queryByText('recibo.png')).not.toBeInTheDocument())
  // Sin nada que mandar vuelve a mandar el micrófono.
  expect(screen.queryByRole('button', { name: 'Enviar mensaje' })).not.toBeInTheDocument()
})

test('sin quien reciba la imagen, el clip no promete nada', () => {
  stubPointer('fine')
  render(<ChatComposer onSend={vi.fn()} onSendAudio={vi.fn()} />)

  expect(screen.getByRole('button', { name: 'Adjuntar una imagen' })).toBeDisabled()
})

/** Un Ctrl+V con lo que sea que traiga el portapapeles. */
function pegar(files: File[]) {
  return fireEvent.paste(screen.getByLabelText('Mensaje para Numi'), {
    clipboardData: { files, getData: () => '' },
  })
}

test('una captura pegada se adjunta sin pasar por el disco', async () => {
  stubPointer('fine')
  stubObjectUrl()
  const onSendImage = vi.fn()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={vi.fn()} onSendImage={onSendImage} />)

  const captura = new File(['x'], 'imagen.png', { type: 'image/png' })
  pegar([captura])

  expect(await screen.findByText('imagen.png')).toBeInTheDocument()
  screen.getByRole('button', { name: 'Enviar mensaje' }).click()

  await waitFor(() => expect(onSendImage).toHaveBeenCalledWith(captura, ''))
})

test('pegar texto sigue pegando texto', () => {
  stubPointer('fine')
  stubObjectUrl()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={vi.fn()} onSendImage={vi.fn()} />)

  // `fireEvent` devuelve false si alguien llamó a `preventDefault`: aquí nadie debe,
  // o pegar una frase en la caja dejaría de funcionar.
  expect(pegar([])).toBe(true)
  expect(screen.queryByRole('button', { name: 'Quitar la imagen' })).not.toBeInTheDocument()
})

test('un PDF pegado no se cuela: el backend solo lee imágenes', () => {
  stubPointer('fine')
  stubObjectUrl()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={vi.fn()} onSendImage={vi.fn()} />)

  pegar([new File(['x'], 'factura.pdf', { type: 'application/pdf' })])

  expect(screen.queryByText('factura.pdf')).not.toBeInTheDocument()
})

test('sin quien reciba la imagen, pegar una no hace nada', () => {
  stubPointer('fine')
  stubObjectUrl()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={vi.fn()} />)

  expect(pegar([new File(['x'], 'imagen.png', { type: 'image/png' })])).toBe(true)
  expect(screen.queryByText('imagen.png')).not.toBeInTheDocument()
})

/** Arrastrar algo sobre la caja. `types` es lo que mira el compositor. */
function arrastrar(tipo: 'dragEnter' | 'dragOver' | 'drop', files: File[] = []) {
  const caja = screen.getByLabelText('Mensaje para Numi').closest('form')!
  return fireEvent[tipo](caja, {
    dataTransfer: { files, types: ['Files'], items: [] },
  })
}

test('arrastrar un archivo encima dice dónde soltarlo', () => {
  stubPointer('fine')
  stubObjectUrl()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={vi.fn()} onSendImage={vi.fn()} />)

  expect(screen.queryByText('Suelta la imagen para adjuntarla')).not.toBeInTheDocument()
  arrastrar('dragEnter')
  expect(screen.getByText('Suelta la imagen para adjuntarla')).toBeInTheDocument()
})

test('cruzar de un hijo a otro no apaga el aviso', () => {
  stubPointer('fine')
  stubObjectUrl()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={vi.fn()} onSendImage={vi.fn()} />)

  // Entrar en la caja y después en el textarea: dos entradas, una salida.
  arrastrar('dragEnter')
  arrastrar('dragEnter')
  fireEvent.dragLeave(screen.getByLabelText('Mensaje para Numi').closest('form')!)

  expect(screen.getByText('Suelta la imagen para adjuntarla')).toBeInTheDocument()
})

test('soltar una imagen la deja lista para enviar', async () => {
  stubPointer('fine')
  stubObjectUrl()
  const onSendImage = vi.fn()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={vi.fn()} onSendImage={onSendImage} />)

  const foto = new File(['x'], 'comprobante.jpg', { type: 'image/jpeg' })
  arrastrar('dragEnter')
  arrastrar('drop', [foto])

  expect(await screen.findByText('comprobante.jpg')).toBeInTheDocument()
  // Y el aviso se retira: ya no hay nada encima.
  expect(screen.queryByText('Suelta la imagen para adjuntarla')).not.toBeInTheDocument()

  screen.getByRole('button', { name: 'Enviar mensaje' }).click()
  await waitFor(() => expect(onSendImage).toHaveBeenCalledWith(foto, ''))
})

test('soltar un PDF lo dice, en vez de no hacer nada', () => {
  stubPointer('fine')
  stubObjectUrl()
  avisos.errores.length = 0
  render(<ChatComposer onSend={vi.fn()} onSendAudio={vi.fn()} onSendImage={vi.fn()} />)

  arrastrar('dragEnter')
  arrastrar('drop', [new File(['x'], 'factura.pdf', { type: 'application/pdf' })])

  // Un gesto que no produce nada se lee como que la app falló.
  expect(avisos.errores).toEqual(['Numi lee JPEG, PNG, WebP y GIF. Un PDF todavía no.'])
  expect(screen.queryByText('factura.pdf')).not.toBeInTheDocument()
})

test('sin quien reciba la imagen, arrastrar no promete nada', () => {
  stubPointer('fine')
  stubObjectUrl()
  render(<ChatComposer onSend={vi.fn()} onSendAudio={vi.fn()} />)

  arrastrar('dragEnter')

  expect(screen.queryByText('Suelta la imagen para adjuntarla')).not.toBeInTheDocument()
})
