import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState, NoResults } from './empty-state'
import { ErrorState, InlineError } from './error-state'
import { StatusBadge, StatusDot } from './status-badge'

afterEach(cleanup)

test('EmptyState explica y ofrece el siguiente paso', () => {
  render(
    <EmptyState
      title="Todavía no tienes contactos"
      description="Son las personas y empresas con las que tienes movimientos."
      action={<button type="button">Nuevo contacto</button>}
    />,
  )

  expect(screen.getByText('Todavía no tienes contactos')).toBeInTheDocument()
  expect(
    screen.getByText('Son las personas y empresas con las que tienes movimientos.'),
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Nuevo contacto' })).toBeInTheDocument()
})

test('EmptyState sin acción no inventa un botón (p. ej. sin permiso)', () => {
  render(<EmptyState title="Todavía no hay movimientos" />)

  expect(screen.getByText('Todavía no hay movimientos')).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

test('NoResults ofrece limpiar los filtros, no crear', async () => {
  const onClear = vi.fn()
  render(<NoResults entity="pagos" onClear={onClear} />)

  expect(screen.getByText(/no hay pagos que coincidan/i)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
  expect(onClear).toHaveBeenCalledOnce()
})

test('ErrorState anuncia el fallo y usa el mensaje del error', () => {
  render(<ErrorState error={new Error('La red no responde')} />)

  const alert = screen.getByRole('alert')
  expect(alert).toHaveTextContent('No se pudo cargar')
  expect(alert).toHaveTextContent('La red no responde')
})

test('ErrorState cae al fallback cuando el error no trae mensaje', () => {
  render(<ErrorState error={null} fallback="No se pudieron cargar los pagos." />)

  expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los pagos.')
})

test('ErrorState solo muestra Reintentar cuando reintentar es posible', async () => {
  const onRetry = vi.fn()
  const { rerender } = render(<ErrorState error={new Error('x')} />)
  expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument()

  rerender(<ErrorState error={new Error('x')} onRetry={onRetry} />)
  await userEvent.click(screen.getByRole('button', { name: /reintentar/i }))
  expect(onRetry).toHaveBeenCalledOnce()
})

test('InlineError se anuncia como alerta', () => {
  render(<InlineError>Credenciales inválidas</InlineError>)

  expect(screen.getByRole('alert')).toHaveTextContent('Credenciales inválidas')
})

test('StatusBadge comunica el estado con texto, no solo con color', () => {
  const { container } = render(<StatusBadge tone="destructive" label="Vencida" />)

  expect(screen.getByText('Vencida')).toBeInTheDocument()
  // El punto es refuerzo visual: para un lector de pantalla es ruido.
  expect(container.querySelector('[aria-hidden]')).toBeInTheDocument()
})

test('StatusDot traduce el booleano a los tonos del sistema', () => {
  const { rerender } = render(<StatusDot active />)
  expect(screen.getByText('Activo')).toBeInTheDocument()

  rerender(<StatusDot active={false} inactiveLabel="Archivado" />)
  expect(screen.getByText('Archivado')).toBeInTheDocument()
})
