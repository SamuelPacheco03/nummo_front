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

test('la clave puede estar lista antes que el registro', () => {
  /*
    El caso de los ajustes de una organización, y es el **normal**: el
    `organizationId` se conoce desde el primer render —sale de otra consulta ya
    resuelta— y lo que se edita llega después, porque su petición ni siquiera
    arranca hasta tener ese id. Con las dependencias en la clave a secas el
    efecto corría una vez en vacío y no volvía nunca: el formulario se quedaba
    vacío enseñando lo guardado como si no existiera.
  */
  function Ajustes({ registro }: { registro: Registro | undefined }) {
    const [value, setValue] = useState('')
    useHydrateOnce('o1', registro, (r) => setValue(r.name))
    return <input aria-label="Nombre" value={value} onChange={(e) => setValue(e.target.value)} />
  }

  const { rerender } = render(<Ajustes registro={undefined} />)
  expect(screen.getByLabelText('Nombre')).toHaveValue('')

  rerender(<Ajustes registro={{ id: 'o1', name: 'Cobranza encendida' }} />)
  expect(screen.getByLabelText('Nombre')).toHaveValue('Cobranza encendida')
})

test('y aun así un refetch no pisa lo escrito', async () => {
  // Lo que abre la puerta es «ya hay registro», que pasa una sola vez. Que el
  // objeto cambie después no la vuelve a abrir.
  function Ajustes({ registro }: { registro: Registro | undefined }) {
    const [value, setValue] = useState('')
    useHydrateOnce('o1', registro, (r) => setValue(r.name))
    return <input aria-label="Nombre" value={value} onChange={(e) => setValue(e.target.value)} />
  }

  const { rerender } = render(<Ajustes registro={undefined} />)
  rerender(<Ajustes registro={{ id: 'o1', name: 'Cajero' }} />)
  await userEvent.clear(screen.getByLabelText('Nombre'))
  await userEvent.type(screen.getByLabelText('Nombre'), 'Cajero de tarde')

  rerender(<Ajustes registro={{ id: 'o1', name: 'Otro nombre' }} />)
  expect(screen.getByLabelText('Nombre')).toHaveValue('Cajero de tarde')
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
