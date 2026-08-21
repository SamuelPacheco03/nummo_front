import { Activity } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import type { PlaygroundTrace } from '@/api/generated/model'
import { QuietButton } from './quiet-button'
import {
  cacheShare,
  formatCost,
  formatMs,
  formatTokens,
  SIN_DATO_LARGO,
} from './metrics'
import { PhaseBar } from './trace-view'

/**
 * **La traza, al lado de la conversación y no debajo de un botón.**
 *
 * Antes había que abrir un cajón por cada turno para saber qué había costado, y el cajón
 * tapaba justo la respuesta que se estaba juzgando. Pero el coste, el tiempo y las
 * herramientas **no son un detalle**: son la razón de ser de esta consola, y se miran
 * mientras se escribe el siguiente mensaje.
 *
 * Aquí va lo que se lee de un vistazo —tres cifras, dónde se fue el tiempo, qué
 * herramientas llamó y si se inventó algo—. El resto —el prompt exacto, los argumentos de
 * cada llamada, las dos generaciones— sigue en la traza larga, a un clic.
 */
export function TraceRail({
  trace,
  busy,
  hasTurns,
  onOpenFull,
}: {
  /** `undefined` = todavía no hay turno. `null` = el turno no dejó medida. */
  trace: PlaygroundTrace | null | undefined
  busy: boolean
  hasTurns: boolean
  onOpenFull: () => void
}) {
  return (
    <aside
      aria-label="Traza del turno"
      className="bg-card scrollbar-slim hidden min-h-0 w-[21rem] shrink-0 overflow-y-auto border-l xl:block"
    >
      <div className="border-b px-4 py-3">
        <h2 className="font-display text-sm font-semibold">Traza del turno</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">Lo que costó la última respuesta</p>
      </div>

      {busy ? (
        <Section>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader size="sm" label="Midiendo el turno" />
            Midiendo…
          </div>
        </Section>
      ) : !hasTurns ? (
        <Section>
          <div className="text-muted-foreground space-y-2 text-sm">
            <Activity aria-hidden className="size-5 opacity-60" />
            <p>
              Aquí aparece lo que costó cada respuesta: tokens, tiempo por fase y las
              herramientas que llamó.
            </p>
          </div>
        </Section>
      ) : !trace ? (
        <Section>
          <p className="text-muted-foreground text-sm">
            El turno contestó, pero no dejó medida. La respuesta vale igual; lo que no hay es
            con qué contar lo que costó.
          </p>
        </Section>
      ) : (
        <TraceSummary trace={trace} onOpenFull={onOpenFull} />
      )}
    </aside>
  )
}

function TraceSummary({ trace, onOpenFull }: { trace: PlaygroundTrace; onOpenFull: () => void }) {
  const share = cacheShare(trace.usage)
  const violated = trace.grounding?.violated ?? false

  return (
    <>
      <Section>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Coste" value={formatCost(trace.costMicroUsd)} />
          <Stat label="Tiempo" value={formatMs(trace.timings.totalMs)} />
        </div>
      </Section>

      <Section title="Dónde se fue el tiempo">
        <PhaseBar timings={trace.timings} />
      </Section>

      <Section title="Tokens">
        <dl className="space-y-1.5 text-sm">
          <Row label="Entrada" value={formatTokens(trace.usage.input)} known={trace.usage.input != null} />
          <Row label="Salida" value={formatTokens(trace.usage.output)} known={trace.usage.output != null} />
          <Row
            label="Leídos de caché"
            value={
              trace.usage.cacheRead == null
                ? SIN_DATO_LARGO
                : `${formatTokens(trace.usage.cacheRead)}${share !== null ? ` · ${share} %` : ''}`
            }
            known={trace.usage.cacheRead != null}
          />
          <Row label="Primera palabra" value={formatMs(trace.ttftMs)} known={trace.ttftMs != null} />
        </dl>
      </Section>

      <Section title={`Herramientas (${trace.tools.length})`}>
        {trace.tools.length === 0 ? (
          <p className="text-muted-foreground text-sm">Contestó sin llamar a ninguna.</p>
        ) : (
          <ul className="space-y-1.5">
            {trace.tools.map((tool, index) => (
              <li
                key={`${tool.name}-${index}`}
                className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
              >
                <span
                  aria-hidden
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    tool.ok ? 'bg-success' : 'bg-destructive',
                  )}
                />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{tool.name}</span>
                <span className="nums text-muted-foreground text-xs">
                  {formatMs(tool.durationMs)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Grounding">
        <div className="space-y-2">
          <StatusBadge
            tone={violated ? 'warning' : 'success'}
            label={violated ? 'Dijo una cifra sin respaldo' : 'Sin cifras inventadas'}
          />
          <p className="text-muted-foreground text-xs leading-relaxed">
            {violated
              ? 'La respuesta dio un monto que ninguna herramienta devolvió.'
              : 'Cada monto de la respuesta vino de una herramienta.'}
          </p>
          {trace.generations.length > 1 && (
            <p className="text-warning-strong text-xs leading-relaxed">
              El turno se contestó dos veces: el coste y los tokens de arriba son la suma.
            </p>
          )}
        </div>
      </Section>

      <Section>
        <QuietButton onClick={onOpenFull}>Ver la traza completa</QuietButton>
      </Section>
    </>
  )
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-b px-4 py-3">
      {title && (
        <h3 className="text-muted-foreground text-[0.68rem] font-semibold tracking-wider uppercase">
          {title}
        </h3>
      )}
      {children}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-2.5 py-2">
      <div className="text-muted-foreground text-[0.68rem] font-medium tracking-wider uppercase">
        {label}
      </div>
      <div className="nums font-display mt-0.5 truncate text-base font-semibold" title={value}>
        {value}
      </div>
    </div>
  )
}

function Row({ label, value, known }: { label: string; value: string; known: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn('nums text-xs', !known && 'text-muted-foreground italic')}>{value}</dd>
    </div>
  )
}
