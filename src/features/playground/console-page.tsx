import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { MessageSquare, RotateCcw, Wrench } from 'lucide-react'
import { Panel } from '@/components/panel'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState, InlineError } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { ChatComposer } from '@/features/assistant/chat-composer'
import { ChatBubble } from '@/features/assistant/chat-message-item'
import { NumiAvatar } from '@/features/assistant/numi-avatar'
import { RichText } from '@/features/assistant/rich-text'
import { TypingIndicator } from '@/features/assistant/typing-indicator'
import { getErrorMessage } from '@/lib/errors'
import { useHydrateOnce } from '@/lib/use-hydrate-once'
import type { PlaygroundTrace } from '@/api/generated/model'
import { CopyButton } from './code-block'
import { usePlaygroundContext, usePlaygroundTools } from './hooks'
import { modeLabel } from './labels'
import { RunSettingsFields } from './run-settings-fields'
import { modelOverride, useRunSettings } from './run-settings'
import { runTurn } from './stream-run'
import { ToolCatalog } from './tool-catalog'
import { QuietButton } from './quiet-button'
import { TracePanel } from './trace-drawer'

/**
 * **La consola del playground.** Se elige una organización, se suplanta un rol, se elige
 * el modo y se habla con Numi — contra el mismo pipeline que atiende a un cliente.
 *
 * Lo que se ve aquí es lo que pasa en producción: mismo system prompt, mismas
 * herramientas, mismo grounding. Lo que cambia, lo cambia **estrechando**: un rol
 * suplantado no puede más que ese rol, y el modo de solo lectura no ve una sola
 * herramienta de escritura.
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

  const { context, isPending: contextPending, isError, error } = usePlaygroundContext(
    settings.orgId,
  )
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
  const abort = useRef<AbortController | null>(null)

  /*
    El prompt vigente, precargado. Editarlo **no lo guarda en ningún sitio**: corre solo
    ese turno. Se rellena una vez por organización y no en cada respuesta de la consulta,
    o lo escrito desaparecería al revalidar la caché (§45.7).
  */
  const [system, setSystem] = useState('')
  useHydrateOnce(context?.promptHash, context, (c) => setSystem(c.systemPrompt))

  /*
    «Volver a correrla» del panel de pulgares abajo: llega la pregunta en la URL, se
    precarga y se suelta del parámetro — dejarla ahí la reviviría en cada recarga.
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
          system: system.trim() && system !== context?.systemPrompt ? system : undefined,
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

  if (isError) {
    return (
      <div className="space-y-5">
        <ConsoleHeader />
        <ErrorState error={error} fallback="No se pudo cargar el contexto de la organización." />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <ConsoleHeader />

      <Panel title="Contra qué se prueba">
        <RunSettingsFields
          settings={settings}
          context={context}
          isLoading={contextPending && !!settings.orgId}
          onChange={set}
          onSelectOrganization={selectOrganization}
        />

        {context && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <Field
              label="System prompt"
              htmlFor="pg-system"
              hint="Editarlo no lo guarda en ningún sitio: corre solo en esta conversación."
            >
              <Textarea
                id="pg-system"
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                rows={6}
                className="scrollbar-slim font-mono text-xs"
              />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                Prompt vigente: <span className="nums">{context.promptChars.toLocaleString('es-CO')}</span>{' '}
                caracteres · huella <span className="nums">{context.promptHash.slice(0, 8)}</span>
              </p>
              <div className="flex items-center gap-3">
                <CopyButton text={context.systemPrompt} label="Copiar el vigente" />
                {system !== context.systemPrompt && (
                  <QuietButton onClick={() => setSystem(context.systemPrompt)}>
                    Volver al vigente
                  </QuietButton>
                )}
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => setToolsOpen(true)}>
              <Wrench aria-hidden />
              Ver las herramientas que verá ({tools.tools.length})
            </Button>
          </div>
        )}
      </Panel>

      {!settings.orgId ? (
        <EmptyState
          Icon={MessageSquare}
          title="Elige una organización para empezar"
          description="El playground corre el pipeline de verdad contra los datos de un cliente, así que primero hay que decir contra cuál."
        />
      ) : (
        <Panel
          title="Conversación"
          action={
            turns.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw aria-hidden />
                Empezar de nuevo
              </Button>
            ) : undefined
          }
        >
          <div className="space-y-4">
            <p className="text-muted-foreground text-xs">
              {modeLabel(settings.mode)}
              {settings.provider && settings.model ? ` · ${settings.model}` : ''}
            </p>

            <div className="min-h-32 space-y-3">
              {turns.length === 0 && !streaming && !busy && (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  Pregúntale lo que le preguntaría esa persona.
                </p>
              )}

              {turns.map((turn) => (
                <TurnRow key={turn.id} turn={turn} onTrace={() => setOpenTrace(turn)} />
              ))}

              {busy && (
                <div className="flex items-start gap-2">
                  <NumiAvatar className="mt-1 size-7 shrink-0" />
                  <ChatBubble role="assistant">
                    {streaming ? <RichText text={streaming} /> : <TypingIndicator />}
                  </ChatBubble>
                </div>
              )}
            </div>

            {turnError && <InlineError>{turnError}</InlineError>}

            <div className="-mx-4 -mb-4 sm:-mx-5 sm:-mb-5">
              {/* `key`: la caja lee lo precargado al montar, así que remonta al llegar. */}
              <ChatComposer
                key={draft}
                textOnly
                busy={busy}
                initialValue={draft}
                onSend={(text) => void send(text)}
                // Detener vive dentro de la caja, en el sitio del micrófono (§32.6).
                onStop={stop}
              />
            </div>
          </div>
        </Panel>
      )}

      {openTrace && (
        <TracePanel trace={openTrace.trace ?? null} onClose={() => setOpenTrace(null)} />
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

function ConsoleHeader() {
  return (
    <PageHeader
      title="Consola de Numi"
      description="Habla con Numi contra una organización real, suplantando un rol. Corre el mismo pipeline que atiende a un cliente."
    />
  )
}

function TurnRow({ turn, onTrace }: { turn: Turn; onTrace: () => void }) {
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
        <QuietButton onClick={onTrace}>Ver la traza</QuietButton>
      </div>
    </div>
  )
}
