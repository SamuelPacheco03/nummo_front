import { afterEach, expect, test } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { TraceView } from './trace-view'
import type {
  PlaygroundGeneration,
  PlaygroundTokenUsage,
  PlaygroundTrace,
} from '@/api/generated/model'

afterEach(cleanup)

function usage(over: Partial<PlaygroundTokenUsage> = {}): PlaygroundTokenUsage {
  return {
    input: null,
    output: null,
    cacheRead: null,
    cacheWrite: null,
    noCache: null,
    reasoning: null,
    ...over,
  }
}

function generation(over: Partial<PlaygroundGeneration> = {}): PlaygroundGeneration {
  return {
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    usage: usage({ input: 1000, output: 200 }),
    steps: [],
    tools: [],
    finishReason: 'stop',
    durationMs: 900,
    ttftMs: 300,
    toolsMs: 0,
    warnings: [],
    ...over,
  }
}

function trace(over: Partial<PlaygroundTrace> = {}): PlaygroundTrace {
  return {
    id: 'tr1',
    at: '2026-08-20T10:00:00Z',
    organizationId: 'o1',
    userId: 'u1',
    conversationId: 'c1',
    kind: 'turn',
    origin: 'playground',
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    source: 'PLATFORM',
    usage: usage({ input: 1200, output: 300 }),
    costMicroUsd: 3200,
    ttftMs: 420,
    stepsUsed: 1,
    finishReason: 'stop',
    messageId: 'm1',
    timings: {
      totalMs: 1000,
      resolveMs: 20,
      contextMs: 80,
      engineMs: 850,
      toolsMs: 400,
      persistMs: 30,
    },
    maxSteps: 6,
    generations: [generation()],
    tools: [],
    grounding: { violated: false, retried: false, offenders: [] },
    stopped: false,
    error: null,
    detail: null,
    ...over,
  }
}

/** La fila de la traza que lleva esa etiqueta, para leer su valor sin adivinar. */
function row(label: string): HTMLElement {
  const cell = screen.getByText(label)
  return cell.parentElement as HTMLElement
}

test('un token que el proveedor no reportó se pinta «—», nunca cero', () => {
  /*
    Es el número que alguien va a mirar para decidir si el prompt cacheado sirve de algo:
    un cero ahí inventa un ahorro que no ocurrió.
  */
  render(<TraceView trace={trace({ usage: usage({ input: 1200, output: 300 }) })} />)

  expect(within(row('Leídos de caché')).getByText('—')).toBeInTheDocument()
  expect(within(row('Escritos a caché')).getByText('—')).toBeInTheDocument()
  expect(within(row('Entrada')).getByText('1.200')).toBeInTheDocument()
})

test('cuando el proveedor no reporta nada, la traza lo dice en vez de parecer rota', () => {
  render(<TraceView trace={trace({ usage: usage() })} />)

  expect(screen.getByText(/no reportó tokens/i)).toBeInTheDocument()
  expect(within(row('Tokens del turno')).getByText('—')).toBeInTheDocument()
})

test('un modelo sin precio no sale gratis', () => {
  render(<TraceView trace={trace({ costMicroUsd: null })} />)

  expect(within(row('Coste')).getByText('Sin precio configurado')).toBeInTheDocument()
  expect(screen.queryByText('USD 0,0000')).not.toBeInTheDocument()
})

test('el coste son micro-dólares, no dólares', () => {
  render(<TraceView trace={trace({ costMicroUsd: 3200 })} />)

  expect(within(row('Coste')).getByText('USD 0,0032')).toBeInTheDocument()
})

test('cuando el grounding obliga a repetir, se ven las dos llamadas', () => {
  /*
    Los tokens del turno son la suma de las dos. Enseñar solo la primera saca el coste a
    mitad de precio, que es la clase de error que nadie revisa porque el número existe.
  */
  render(
    <TraceView
      trace={trace({
        generations: [generation(), generation({ model: 'claude-sonnet-5' })],
        grounding: { violated: true, retried: true, offenders: [125_000] },
      })}
    />,
  )

  expect(screen.getByText('Generaciones (2)')).toBeInTheDocument()
  expect(screen.getByText(/se contestó dos veces/i)).toBeInTheDocument()
  expect(screen.getByText(/Llamada 1/)).toBeInTheDocument()
  expect(screen.getByText(/Llamada 2/)).toBeInTheDocument()
  // Los montos sin respaldo llegan en centavos.
  expect(screen.getByText(/1250\.00/)).toBeInTheDocument()
})

test('un turno de una sola llamada no habla de generaciones', () => {
  render(<TraceView trace={trace()} />)
  expect(screen.queryByText(/Generaciones/)).not.toBeInTheDocument()
})

test('detenerlo no se cuenta como un fallo', () => {
  render(<TraceView trace={trace({ stopped: true })} />)

  expect(screen.getByText(/Lo detuvieron a media respuesta/i)).toBeInTheDocument()
  expect(screen.queryByText(/El turno falló/i)).not.toBeInTheDocument()
})

test('el prompt exacto se enseña cuando la corrida lo trae', () => {
  render(
    <TraceView
      trace={trace({
        detail: {
          system: 'Eres Numi.',
          contextBlock: 'Organización: Demo',
          messages: [{ role: 'user', content: '¿cuánto me deben?' }],
          toolNames: ['list_receivables'],
        },
      })}
    />,
  )

  expect(screen.getByText('System prompt')).toBeInTheDocument()
  expect(screen.getByText('Eres Numi.')).toBeInTheDocument()
  expect(screen.getByText('¿cuánto me deben?')).toBeInTheDocument()
})
