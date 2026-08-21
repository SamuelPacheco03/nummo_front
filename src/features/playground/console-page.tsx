import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Building2, MessageSquare, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState, InlineError } from '@/components/ui/error-state'
import { ChatComposer } from '@/features/assistant/chat-composer'
import { ChatBubble } from '@/features/assistant/chat-message-item'
import { NumiAvatar } from '@/features/assistant/numi-avatar'
import { RichText } from '@/features/assistant/rich-text'
import { TypingIndicator } from '@/features/assistant/typing-indicator'
import { getErrorMessage } from '@/lib/errors'
import { useHydrateOnce } from '@/lib/use-hydrate-once'
import type { PlaygroundTrace } from '@/api/generated/model'
import { usePlaygroundContext, usePlaygroundTools } from './hooks'
import { formatCost, formatMs } from './metrics'
import { QuietButton } from './quiet-button'
import { RunContextBar } from './run-context-bar'
import { modelOverride, useRunSettings } from './run-settings'
import { runTurn } from './stream-run'
import { SystemPromptDialog } from './system-prompt-dialog'
import { ToolCatalog } from './tool-catalog'
import { TracePanel } from './trace-drawer'
import { TraceRail } from './trace-rail'

/**
 * **Probar**: la consola del playground.
 *
 * Se habla con Numi contra una organización real suplantando un rol, y se ve en el mismo
 * sitio qué costó cada respuesta. Corre el mismo pipeline que atiende a un cliente: mismo
 * system prompt, mismas herramientas, mismo grounding. Lo que cambia, lo cambia
 * **estrechando** — un rol suplantado no puede más que ese rol, y en solo lectura el
 * modelo no ve una sola herramienta de escritura.
 *
 * La pantalla son tres franjas y ninguna es un formulario:
 *
 * - **La barra de contexto** (`RunContextBar`) dice contra qué se prueba, en una línea.
 *   Antes esto era un panel de seis campos que empujaba la conversación por debajo del
 *   pliegue; la organización y el rol se cambian una vez cada muchos turnos, así que no
 *   pueden ocupar sitio permanente.
 * - **El hilo** se queda con el alto que sobra y ancla la caja de escribir abajo. Scrollea
 *   la conversación, no la página: dentro de un documento, el composer acababa en mitad
 *   del scroll y había que ir a buscarlo.
 * - **El carril** (`TraceRail`) enseña la traza al lado de la respuesta que la produjo, no
 *   detrás de un botón que la tapa.
 */

interface Turn {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** Solo los turnos de Numi: `null` es «contestó pero no dejó medida». */
  trace?: PlaygroundTrace | null
}

let turnSeq = 0
const nextId = () => `t${++turnSeq}`

export function PlaygroundConsolePage() {
  const { settings, set, selectOrganization } = useRunSettings()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const { context, isPending: contextPending, isError, error } = usePlaygroundContext(settings.orgId)
  const tools = usePlaygroundTools(settings.orgId, {
    role: settings.role,
    customRoleId: settings.customRoleId || undefined,
    mode: settings.mode,
  })

  const [turns, setTurns] = useState<Turn[]>([])
  const [streaming, setStreaming] = useState('')
  const [busy, setBusy] = useState(false)
  const [turnError, setTurnError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [openTrace, setOpenTrace] = useState<Turn | null>(null)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const bottom = useRef<HTMLDivElement>(null)

  /*
    El prompt vigente, precargado. Se rellena una vez por organización y no en cada
    respuesta de la consulta, o lo escrito desaparecería al revalidar la caché (§45.7).
  */
  const [system, setSystem] = useState('')
  useHydrateOnce(context?.promptHash, context, (c) => setSystem(c.systemPrompt))
  const promptEdited = !!context && system !== context.systemPrompt

  /*
    «Volver a correrla» del panel de puntuaciones: llega la pregunta en la URL, se precarga
    y se suelta del parámetro — dejarla ahí la reviviría en cada recarga.
  */
  const prefill = params.get('mensaje') ?? ''
  const [draft, setDraft] = useState('')
  useEffect(() => {
    if (!prefill) return
    setDraft(prefill)
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('mensaje')
        return next
      },
      { replace: true },
    )
  }, [prefill, setParams])

  // El hilo sigue a la última respuesta, que es lo que se está leyendo.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [turns, streaming])

  const stop = () => abort.current?.abort()

  const reset = () => {
    stop()
    setTurns([])
    setStreaming('')
    setSessionId(undefined)
    setTurnError(null)
  }

  const send = async (text: string) => {
    if (!settings.orgId || busy) return
    setTurnError(null)
    setTurns((prev) => [...prev, { id: nextId(), role: 'user', text }])
    setStreaming('')
    setBusy(true)

    const controller = new AbortController()
    abort.current = controller

    try {
      const result = await runTurn({
        body: {
          organizationId: settings.orgId,
          message: text,
          sessionId,
          role: settings.role,
          customRoleId: settings.customRoleId || undefined,
          mode: settings.mode,
          model: modelOverride(settings),
          // Un prompt igual al vigente no es una variante: se manda solo si se tocó.
          system: promptEdited ? system : undefined,
        },
        signal: controller.signal,
        onStart: setSessionId,
        onChunk: (chunk) => setStreaming((prev) => prev + chunk),
      })
      setTurns((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', text: result.reply, trace: result.trace },
      ])
    } catch (e) {
      /*
        El error se enseña **tal cual lo manda el backend**: «falta ANTHROPIC_API_KEY» es
        accionable, y traducirlo a «no se pudo contactar a Numi» borraría justo la parte
        que dice qué hacer.
      */
      setTurnError(getErrorMessage(e, 'El turno no llegó a correr.'))
    } finally {
      setStreaming('')
      setBusy(false)
      abort.current = null
    }
  }

  const last = [...turns].reverse().find((turn) => turn.role === 'assistant')

  if (isError) {
    return <ErrorState error={error} fallback="No se pudo cargar el contexto de la organización." />
  }

  return (
    <div className="bg-background flex h-full min-h-0 flex-col overflow-hidden rounded-xl border">
      <RunContextBar
        settings={settings}
        context={context}
        isLoading={contextPending && !!settings.orgId}
        onChange={set}
        onSelectOrganization={selectOrganization}
        tools={{ offered: tools.tools.filter((t) => t.offered).length, total: tools.tools.length }}
        onOpenTools={() => setToolsOpen(true)}
        onOpenPrompt={() => setPromptOpen(true)}
        promptEdited={promptEdited}
        openSettings={pickerOpen}
        onOpenSettings={setPickerOpen}
      />

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {!settings.orgId ? (
            <div className="grid flex-1 place-items-center p-6">
              <EmptyState
                Icon={MessageSquare}
                title="Elige una organización para empezar"
                description="El playground corre el pipeline de verdad contra los datos de un cliente, así que primero hay que decir contra cuál."
                action={
                  /* Un vacío que solo describe deja el trabajo en manos de quien lo lee. */
                  <Button onClick={() => setPickerOpen(true)}>
                    <Building2 aria-hidden />
                    Elegir organización
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-6">
                <div className="mx-auto w-full max-w-3xl space-y-4">
                  {turns.length === 0 && !busy && (
                    <p className="text-muted-foreground py-10 text-center text-sm">
                      Pregúntale lo que le preguntaría esa persona.
                    </p>
                  )}

                  {turns.map((turn, index) => (
                    <TurnRow
                      key={turn.id}
                      turn={turn}
                      onTrace={() => setOpenTrace(turn)}
                      /*
                        La pregunta que produjo esta respuesta. Es lo que viaja a la
                        comparación: se llega ahí desde un turno que salió regular, y
                        volver a teclearlo era trabajo que la pantalla puede ahorrar.
                      */
                      onCompare={() => {
                        const asked = turns[index - 1]
                        if (!asked) return
                        navigate(
                          `/plataforma/playground/comparar?mensaje=${encodeURIComponent(asked.text)}`,
                        )
                      }}
                    />
                  ))}

                  {busy && (
                    <div className="flex items-start gap-2">
                      <NumiAvatar className="mt-1 size-7 shrink-0" />
                      <ChatBubble role="assistant">
                        {streaming ? <RichText text={streaming} /> : <TypingIndicator />}
                      </ChatBubble>
                    </div>
                  )}

                  {turnError && <InlineError>{turnError}</InlineError>}
                  <div ref={bottom} />
                </div>
              </div>

              <div className="bg-card border-t">
                <div className="mx-auto w-full max-w-3xl">
                  {turns.length > 0 && (
                    <div className="flex justify-end px-4 pt-2">
                      <QuietButton onClick={reset}>
                        <RotateCcw aria-hidden className="mr-1 inline size-3" />
                        Empezar de nuevo
                      </QuietButton>
                    </div>
                  )}
                  <ChatComposer
                    key={draft}
                    textOnly
                    busy={busy}
                    initialValue={draft}
                    onSend={(text) => void send(text)}
                    onStop={stop}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <TraceRail
          trace={last?.trace}
          busy={busy}
          hasTurns={turns.length > 0}
          onOpenFull={() => last && setOpenTrace(last)}
        />
      </div>

      {openTrace && (
        <TracePanel trace={openTrace.trace ?? null} onClose={() => setOpenTrace(null)} />
      )}

      {promptOpen && context && (
        <SystemPromptDialog
          context={context}
          value={system}
          onSave={setSystem}
          onClose={() => setPromptOpen(false)}
        />
      )}

      <Drawer open={toolsOpen} onOpenChange={setToolsOpen} title="Herramientas de la corrida">
        <ToolCatalog
          tools={tools.tools}
          isPending={tools.isPending}
          isError={tools.isError}
          error={tools.error}
        />
      </Drawer>
    </div>
  )
}

function TurnRow({
  turn,
  onTrace,
  onCompare,
}: {
  turn: Turn
  onTrace: () => void
  onCompare: () => void
}) {
  if (turn.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%]">
          <ChatBubble role="user">
            <p className="whitespace-pre-wrap">{turn.text}</p>
          </ChatBubble>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <NumiAvatar className="mt-1 size-7 shrink-0" />
      <div className="min-w-0 max-w-[85%] space-y-1">
        <ChatBubble role="assistant">
          <RichText text={turn.text} />
        </ChatBubble>
        {/*
          Lo que costó, bajo su propia respuesta. El carril enseña la última; esto es lo que
          permite comparar dos turnos de la misma conversación sin abrir nada.
        */}
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {turn.trace && (
            <>
              <span className="nums">{formatCost(turn.trace.costMicroUsd)}</span>
              <span className="nums">{formatMs(turn.trace.timings.totalMs)}</span>
            </>
          )}
          <QuietButton onClick={onTrace}>Ver la traza</QuietButton>
          <QuietButton onClick={onCompare}>Comparar esta pregunta</QuietButton>
        </div>
      </div>
    </div>
  )
}
