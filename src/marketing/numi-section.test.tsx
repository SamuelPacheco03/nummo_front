import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const preguntar = vi.fn()
vi.mock('@/api/generated/endpoints/public/public', () => ({
  postApiV1PublicNumi: (input: unknown) => preguntar(input),
}))

const { NumiSection } = await import('./numi-section')
const { rutasApp } = await import('./links')

/* Con llaves: un hook que DEVUELVE algo, Vitest lo espera — y un mock no es una promesa. */
beforeEach(() => {
  preguntar.mockReset()
})
afterEach(() => {
  cleanup()
})

const responde = (answer: string, remaining: number, exhausted = false) =>
  preguntar.mockResolvedValue({ status: 200, data: { answer, remaining, exhausted } })

async function preguntarAlgo(texto = '¿Sirve para un colegio?') {
  const usuario = userEvent.setup()
  await usuario.type(screen.getByLabelText(/preguntale algo a numi/i), texto)
  await usuario.click(screen.getByRole('button', { name: /enviar/i }))
  return usuario
}

test('contesta en el hilo y deja seguir preguntando', async () => {
  responde('Sí, sirve para un colegio.', 5)
  render(<NumiSection cola={null} />)
  await preguntarAlgo()

  expect(await screen.findByText('Sí, sirve para un colegio.')).toBeInTheDocument()
  expect(screen.getByLabelText(/preguntale algo a numi/i)).toBeInTheDocument()
})

/*
  La regla que más cambia el diseño: quedarse sin cuota NO es un error. Llega un 200 con
  `exhausted: true`, y el sitio de la caja lo ocupa el REGISTRO — no un aviso de error.
  Son seis preguntas que no se renuevan: el tope es el empujón.
*/
test('sin cuota, la caja de texto la sustituye el registro', async () => {
  responde('Por hoy hasta aquí. Creá una cuenta y seguimos.', 0, true)
  render(<NumiSection cola={null} />)
  await preguntarAlgo()

  expect(await screen.findByRole('link', { name: /crear cuenta y seguir/i })).toHaveAttribute(
    'href',
    rutasApp.registro,
  )
  expect(screen.queryByLabelText(/preguntale algo a numi/i)).not.toBeInTheDocument()
  // Y en ningún sitio se habla de error ni de límite excedido.
  expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
})

/*
  Con el asistente apagado —que es como está en desarrollo por defecto— la respuesta es la
  misma forma: 200 y `exhausted`. Es el primer estado que se ve, así que tiene que leerse
  como algo previsto y no como una integración rota.
*/
test('apagado se comporta como sin cuota, no como un fallo', async () => {
  responde('Por aquí todavía no atiendo.', 0, true)
  render(<NumiSection cola={null} />)
  await preguntarAlgo()

  expect(await screen.findByText('Por aquí todavía no atiendo.')).toBeInTheDocument()
  expect(screen.getByText(/ya no atiende/i)).toBeInTheDocument()
})

/* `remaining` avisa ANTES del último turno, no después: después ya no sirve de nada. */
test('avisa cuando quedan pocas preguntas, no cuando ya no queda ninguna', async () => {
  responde('Ahí va.', 1)
  render(<NumiSection cola={null} />)
  await preguntarAlgo()

  expect(await screen.findByText('Te queda una pregunta.')).toBeInTheDocument()
})

test('con muchas preguntas por delante no avisa de nada', async () => {
  responde('Ahí va.', 5)
  render(<NumiSection cola={null} />)
  await preguntarAlgo()

  await screen.findByText('Ahí va.')
  expect(screen.queryByText(/te quedan?/i)).not.toBeInTheDocument()
})

/* El backend limita por minuto: el widget no debe permitir una segunda con la primera en vuelo. */
test('no deja mandar una segunda pregunta con la primera en vuelo', async () => {
  /*
    `fireEvent` y no `userEvent` aquí a propósito: con la respuesta pendiente el campo se
    deshabilita, y `userEvent` espera a que el elemento vuelva a ser interactuable — que
    es justo lo que este test comprueba que NO pasa.
  */
  let resolver: ((v: unknown) => void) | undefined
  preguntar.mockImplementation(() => new Promise((r) => (resolver = r)))
  render(<NumiSection cola={null} />)

  const campo = screen.getByLabelText(/preguntale algo a numi/i)
  fireEvent.change(campo, { target: { value: '¿Cuánto cuesta?' } })
  fireEvent.click(screen.getByRole('button', { name: /enviar/i }))

  expect(await screen.findByText(/está escribiendo/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled()
  expect(screen.getByLabelText(/preguntale algo a numi/i)).toBeDisabled()

  resolver?.({ status: 200, data: { answer: 'Listo.', remaining: 4, exhausted: false } })
  expect(await screen.findByText('Listo.')).toBeInTheDocument()
})
