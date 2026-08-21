import { DetailRow, DetailRows, DetailSection } from '@/components/ui/detail-drawer'
import { Note } from '@/components/ui/note'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import type { PlaygroundTokenUsage, PlaygroundTrace } from '@/api/generated/model'
import { CodeBlock, CopyButton, Disclosure, JsonBlock } from './code-block'
import { finishLabel, providerLabel, sourceLabel } from './labels'
import {
  cacheShare,
  formatCost,
  formatMs,
  formatTokens,
  offenderAmount,
  phaseSlices,
  totalTokens,
  SIN_DATO,
} from './metrics'

/**
 * **La traza de un turno**: qué modelo contestó, cuánto tardó cada fase, qué tokens
 * gastó, qué herramientas llamó y qué prompt recibió, literal.
 *
 * Llega por el evento `trace` del propio turno y también por `GET /runs/{id}`, así que
 * este componente no consulta nada: recibe la traza y la pinta. Lo usan la consola, la
 * comparación y el conjunto de regresión.
 */

/** Un color por fase, de la paleta de gráficas (§57). Nunca un hex suelto. */
const PHASE_COLOR: Record<string, string> = {
  resolve: 'bg-chart-3',
  context: 'bg-chart-5',
  engine: 'bg-chart-1',
  tools: 'bg-chart-4',
  persist: 'bg-chart-2',
  rest: 'bg-muted-foreground/40',
}

/**
 * Los tiempos del turno en una sola barra.
 *
 * Es la mitad del diagnóstico: si `toolsMs` se come el turno, el problema no es el
 * modelo. Con seis filas de números eso hay que calcularlo; con la barra se ve.
 */
export function PhaseBar({ timings }: { timings: PlaygroundTrace['timings'] }) {
  const slices = phaseSlices(timings)
  if (slices.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="bg-secondary flex h-2 overflow-hidden rounded-full">
        {slices.map((slice) => (
          <div
            key={slice.key}
            className={cn('h-full', PHASE_COLOR[slice.key])}
            style={{ width: `${slice.pct}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {slices.map((slice) => (
          <li key={slice.key} className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span aria-hidden className={cn('size-2 rounded-[2px]', PHASE_COLOR[slice.key])} />
            {slice.label}
            <span className="nums text-foreground">{formatMs(slice.ms)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Los tokens, con `null` como «no lo sé».
 *
 * El aviso de abajo existe porque un panel entero de guiones parece roto, y no lo está:
 * hay proveedores que sencillamente no reportan esto.
 */
function UsageRows({ usage }: { usage: PlaygroundTokenUsage }) {
  const known = Object.values(usage).some((value) => typeof value === 'number')
  const share = cacheShare(usage)

  return (
    <div className="space-y-2">
      <DetailRows>
        <DetailRow label="Entrada">{formatTokens(usage.input)}</DetailRow>
        <DetailRow label="Salida">{formatTokens(usage.output)}</DetailRow>
        <DetailRow label="Leídos de caché">
          {formatTokens(usage.cacheRead)}
          {share !== null && <span className="text-muted-foreground"> · {share} % de la entrada</span>}
        </DetailRow>
        <DetailRow label="Escritos a caché">{formatTokens(usage.cacheWrite)}</DetailRow>
        <DetailRow label="Sin caché">{formatTokens(usage.noCache)}</DetailRow>
        <DetailRow label="Razonamiento">{formatTokens(usage.reasoning)}</DetailRow>
      </DetailRows>
      {!known && (
        <p className="text-muted-foreground text-xs">
          Este proveedor no reportó tokens en el turno. «{SIN_DATO}» es «no lo sé», no cero.
        </p>
      )}
    </div>
  )
}

export function TraceView({ trace }: { trace: PlaygroundTrace }) {
  const tokens = totalTokens(trace.usage)

  return (
    <div className="space-y-5">
      {trace.error && (
        <Note tone="warning" title="El turno falló">
          {trace.error.name}: {trace.error.message}
        </Note>
      )}
      {trace.stopped && (
        // Detener no es fallar: lo escrito hasta ese momento es una respuesta real.
        <Note>Lo detuvieron a media respuesta. Lo escrito hasta ahí se guardó.</Note>
      )}

      <DetailSection title="El modelo que contestó">
        <DetailRows>
          <DetailRow label="Proveedor">{providerLabel(trace.provider)}</DetailRow>
          <DetailRow label="Modelo">{trace.model}</DetailRow>
          <DetailRow label="Credencial">{sourceLabel(trace.source)}</DetailRow>
          <DetailRow label="Cómo terminó">{finishLabel(trace.finishReason)}</DetailRow>
          <DetailRow label="Pasos">
            {trace.stepsUsed} de {trace.maxSteps}
          </DetailRow>
        </DetailRows>
      </DetailSection>

      <DetailSection title="Lo que costó">
        <DetailRows>
          <DetailRow label="Coste" strong>
            {formatCost(trace.costMicroUsd)}
          </DetailRow>
          <DetailRow label="Tokens del turno">
            {tokens === null ? SIN_DATO : formatTokens(tokens)}
          </DetailRow>
        </DetailRows>
      </DetailSection>

      <DetailSection title="Tokens">
        <UsageRows usage={trace.usage} />
      </DetailSection>

      <DetailSection title="Tiempos">
        <div className="space-y-3">
          <PhaseBar timings={trace.timings} />
          <DetailRows>
            <DetailRow label="Turno completo" strong>
              {formatMs(trace.timings.totalMs)}
            </DetailRow>
            <DetailRow label="Hasta la primera palabra">{formatMs(trace.ttftMs)}</DetailRow>
          </DetailRows>
        </div>
      </DetailSection>

      {trace.generations.length > 1 && (
        <DetailSection title={`Generaciones (${trace.generations.length})`}>
          <div className="space-y-2">
            {/*
              Dos llamadas es lo que pasa cuando el grounding obliga a repetir. Los tokens
              del turno son la suma; enseñar solo la primera saca el coste a mitad de precio.
            */}
            <Note title="El turno se contestó dos veces">
              El grounding detectó una cifra sin respaldo y obligó a repetir. El coste y los
              tokens de arriba son la suma de las dos llamadas.
            </Note>
            {trace.generations.map((generation, index) => (
              <Disclosure
                key={index}
                summary={`Llamada ${index + 1} · ${generation.model}`}
                meta={formatMs(generation.durationMs)}
              >
                <DetailRows>
                  <DetailRow label="Proveedor">{providerLabel(generation.provider)}</DetailRow>
                  <DetailRow label="Entrada">{formatTokens(generation.usage.input)}</DetailRow>
                  <DetailRow label="Salida">{formatTokens(generation.usage.output)}</DetailRow>
                  <DetailRow label="Cómo terminó">{finishLabel(generation.finishReason)}</DetailRow>
                  <DetailRow label="Herramientas">
                    {generation.tools.length > 0
                      ? generation.tools.map((t) => t.name).join(', ')
                      : 'Ninguna'}
                  </DetailRow>
                </DetailRows>
                {generation.warnings.length > 0 && (
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    {generation.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
              </Disclosure>
            ))}
          </div>
        </DetailSection>
      )}

      <DetailSection title={`Herramientas (${trace.tools.length})`}>
        {trace.tools.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            El modelo contestó sin llamar a ninguna.
          </p>
        ) : (
          <div className="space-y-2">
            {trace.tools.map((tool, index) => (
              <Disclosure
                key={`${tool.name}-${index}`}
                summary={
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{tool.name}</span>
                    {!tool.ok && <StatusBadge tone="destructive" label="Falló" />}
                  </span>
                }
                meta={`${formatMs(tool.durationMs)} · +${formatMs(tool.startedAtMs)}`}
              >
                {tool.errorMessage && (
                  <p className="text-destructive text-xs">{tool.errorMessage}</p>
                )}
                <p className="text-muted-foreground text-xs font-medium">Argumentos</p>
                <JsonBlock value={tool.args} />
                <p className="text-muted-foreground text-xs font-medium">Resultado</p>
                <JsonBlock value={tool.output} />
              </Disclosure>
            ))}
          </div>
        )}
      </DetailSection>

      {trace.grounding && (trace.grounding.violated || trace.grounding.retried) && (
        <DetailSection title="Grounding">
          <div className="space-y-2">
            <DetailRows>
              <DetailRow label="Cifra sin respaldo">
                {trace.grounding.violated ? 'Sí' : 'No'}
              </DetailRow>
              <DetailRow label="Se repitió el turno">
                {trace.grounding.retried ? 'Sí' : 'No'}
              </DetailRow>
            </DetailRows>
            {trace.grounding.offenders.length > 0 && (
              <p className="text-muted-foreground text-xs">
                Montos que la respuesta dijo y ninguna herramienta devolvió:{' '}
                <span className="nums text-foreground">
                  {trace.grounding.offenders.map(offenderAmount).join(' · ')}
                </span>
              </p>
            )}
          </div>
        </DetailSection>
      )}

      {trace.detail && (
        <DetailSection title="Lo que recibió el modelo">
          <div className="space-y-2">
            <Disclosure
              summary="System prompt"
              meta={`${trace.detail.system.length.toLocaleString('es-CO')} caracteres`}
            >
              <CopyButton text={trace.detail.system} label="Copiar el prompt" />
              <CodeBlock>{trace.detail.system}</CodeBlock>
            </Disclosure>

            <Disclosure summary="Bloque de contexto de la organización">
              <CodeBlock>{trace.detail.contextBlock}</CodeBlock>
            </Disclosure>

            <Disclosure summary={`Mensajes (${trace.detail.messages.length})`}>
              {trace.detail.messages.map((message, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    {message.role === 'user' ? 'Persona' : 'Numi'}
                  </p>
                  <CodeBlock>{message.content}</CodeBlock>
                </div>
              ))}
            </Disclosure>

            <Disclosure summary={`Herramientas ofrecidas (${trace.detail.toolNames.length})`}>
              <p className="text-xs leading-relaxed">
                {trace.detail.toolNames.join(' · ') || 'Ninguna.'}
              </p>
            </Disclosure>
          </div>
        </DetailSection>
      )}
    </div>
  )
}

/**
 * **Las cuatro cifras de un turno**, para cuando no cabe la traza entera: la comparación
 * de variantes y el detalle de un caso de regresión.
 *
 * Son las mismas que la traza larga y salen de las mismas funciones: si aquí el coste se
 * calculara aparte, dos pantallas contarían el mismo turno por distinto precio.
 */
export function TraceHighlights({ trace }: { trace: PlaygroundTrace }) {
  const tokens = totalTokens(trace.usage)
  return (
    <DetailRows>
      <DetailRow label="Coste">{formatCost(trace.costMicroUsd)}</DetailRow>
      <DetailRow label="Tokens">{tokens === null ? SIN_DATO : formatTokens(tokens)}</DetailRow>
      <DetailRow label="Caché">{formatTokens(trace.usage.cacheRead)}</DetailRow>
      <DetailRow label="Tiempo">{formatMs(trace.timings.totalMs)}</DetailRow>
      <DetailRow label="Primera palabra">{formatMs(trace.ttftMs)}</DetailRow>
      <DetailRow label="Herramientas">
        {trace.tools.length > 0 ? trace.tools.map((tool) => tool.name).join(', ') : 'Ninguna'}
      </DetailRow>
      {trace.generations.length > 1 && (
        <DetailRow label="Llamadas al modelo">{trace.generations.length}</DetailRow>
      )}
    </DetailRows>
  )
}

/**
 * Lo que se enseña cuando el turno terminó pero no dejó traza.
 *
 * Pasa: la respuesta vale igual. Un panel vacío sin explicación se lee como un fallo de
 * la pantalla, que es lo contrario de lo que ocurrió.
 */
export function TraceMissing() {
  return (
    <Note title="Este turno no dejó traza">
      El pipeline contestó, pero no archivó las medidas del turno. La respuesta es válida;
      lo que no hay es con qué contar lo que costó.
    </Note>
  )
}
