import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { useHydrateOnce } from './use-hydrate-once'

interface Registro {
  id: string
  name: string
}

/** Un formulario mínimo: se rellena con lo que llega y se puede escribir encima. */
function Formulario({ registro }: { registro: Registro | undefined }) {
  const [value, setValue] = useState('')
  useHydrateOnce(registro?.id, registro, (r) => setValue(r.name))
  return <input aria-label="Nombre" value={value} onChange={(e) => setValue(e.target.value)} />
}

afterEach(cleanup)

test('rellena cuando el registro llega', () => {
  const { rerender } = render(<Formulario registro={undefined} />)
  expect(screen.getByLabelText('Nombre')).toHaveValue('')

  rerender(<Formulario registro={{ id: 'r1', name: 'Cajero' }} />)
  expect(screen.getByLabelText('Nombre')).toHaveValue('Cajero')
})

test('un refetch del mismo registro no pisa lo que se está escribiendo', async () => {
  /*
    Es el fallo que este hook existe para cerrar: con `[registro]` a secas, que
    alguien edite ese registro desde otro sitio —o que algo invalide la caché—
    borraba lo escrito sin decir nada.
  */
  const { rerender } = render(<Formulario registro={{ id: 'r1', name: 'Cajero' }} />)
  await userEvent.clear(screen.getByLabelText('Nombre'))
  await userEvent.type(screen.getByLabelText('Nombre'), 'Cajero de tarde')

  // Mismo id, objeto nuevo y hasta un nombre distinto: alguien lo cambió fuera.
  rerender(<Formulario registro={{ id: 'r1', name: 'Otro nombre' }} />)

  expect(screen.getByLabelText('Nombre')).toHaveValue('Cajero de tarde')
})

test('un objeto nuevo por render no lo dispara en bucle', async () => {
  const hidratar = vi.fn()
  function Inestable() {
    const [, forzar] = useState(0)
    // Lo que hace un hook que reconstruye su resultado en cada render: sin la
    // clave delante, cada render dispararía el efecto y el efecto otro render.
    useHydrateOnce('r1', { id: 'r1', name: 'Cajero' }, hidratar)
    return <button onClick={() => forzar((n) => n + 1)}>Re-render</button>
  }
  render(<Inestable />)

  await userEvent.click(screen.getByRole('button'))
  await userEvent.click(screen.getByRole('button'))

  expect(hidratar).toHaveBeenCalledTimes(1)
})

test('otro registro sí lo rellena de nuevo', () => {
  const { rerender } = render(<Formulario registro={{ id: 'r1', name: 'Cajero' }} />)
  rerender(<Formulario registro={{ id: 'r2', name: 'Auxiliar' }} />)

  expect(screen.getByLabelText('Nombre')).toHaveValue('Auxiliar')
})
