import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { getErrorMessage } from '@/lib/errors'
import { toastApiError } from '@/features/platform/errors'
import type {
  AiProviderCatalogEntryProvider,
  AiVoiceProviderCatalogEntryProvider,
} from '@/api/generated/model'
import {
  useActivateAiProvider,
  useActivateVoiceProvider,
  useAssistantSettings,
  useRemoveAiProvider,
  useRemoveVoiceProvider,
  useUpsertAiProvider,
  useUpsertVoiceProvider,
} from './hooks'

/**
 * Lo que la lista necesita del catálogo y de la credencial guardada.
 *
 * `P` es la unión de proveedores de **ese** tipo —chat o voz—, que el contrato
 * declara por separado (`'openai' | …` frente a `'deepgram' | …`). Genérico y no
 * `string` para que las mutaciones sigan exigiendo un proveedor de los suyos:
 * pasar el de voz al endpoint de chat tiene que ser un error de compilación, no
 * un 400 en producción.
 */
type CatalogEntry<P extends string = string> = {
  provider: P
  label: string
  suggestedModels: string[]
}
type Credential<P extends string = string> = { provider: P; model: string; apiKeyLast4: string }

type ChatProvider = AiProviderCatalogEntryProvider
type VoiceProvider = AiVoiceProviderCatalogEntryProvider

/** Las tres mutaciones de un tipo de proveedor, ya atadas a su endpoint. */
interface ProviderActions<P extends string> {
  save: (provider: P, model: string, apiKey: string) => Promise<unknown>
  activate: (provider: P) => Promise<unknown>
  remove: (provider: P) => Promise<unknown>
  saving: boolean
  activating: boolean
  removing: boolean
}

/**
 * Una fila del listado: qué proveedor es, en qué estado está y qué se puede
 * hacer con él.
 *
 * Antes cada proveedor era una tarjeta con el formulario desplegado, así que la
 * pantalla abría con cinco formularios vacíos, todos iguales y sin ninguna pista
 * de cuál estaba en uso. Se conecta **uno**: los demás son una línea que dice que
 * no lo están.
 */
function ProviderRow({
  entry,
  credential,
  isActive,
  canManage,
  onConnect,
  onActivate,
  onRemove,
  activating,
}: {
  entry: CatalogEntry
  credential: Credential | undefined
  isActive: boolean
  canManage: boolean
  onConnect: () => void
  onActivate: () => void
  onRemove: () => void
  activating: boolean
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{entry.label}</span>
          {isActive && <Badge variant="success">En uso</Badge>}
        </div>
        <p className="text-muted-foreground truncate text-sm">
          {credential
            ? `${credential.model} · clave •••• ${credential.apiKeyLast4}`
            : 'Sin conectar'}
        </p>
      </div>

      {canManage && (
        <div className="ml-auto flex items-center gap-1">
          {!credential ? (
            <Button size="sm" variant="outline" onClick={onConnect}>
              <Plus aria-hidden className="size-4" />
              Conectar
            </Button>
          ) : (
            <>
              {!isActive && (
                <Button size="sm" variant="outline" onClick={onActivate} disabled={activating}>
                  Usar este
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onConnect}
                aria-label={`Editar ${entry.label}`}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={onRemove}
                aria-label={`Desconectar ${entry.label}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  )
}

/**
 * Una sección de proveedores —chat o voz— con su lista y **un solo** formulario:
 * el del proveedor que se esté tocando, en el diálogo centrado de Configuración.
 *
 * El orden no es el del catálogo: primero el que está en uso, después los
 * conectados y al final los que no. Así lo que importa queda arriba en vez de
 * donde caiga en la respuesta del API.
 */
function ProviderSection<P extends string>({
  title,
  description,
  catalog,
  credentials,
  activeProvider,
  canManage,
  actions,
  warnWhenNoneActive = false,
}: {
  title: string
  description: string
  catalog: CatalogEntry<P>[]
  credentials: Credential<P>[]
  activeProvider: P | null | undefined
  canManage: boolean
  actions: ProviderActions<P>
  /** El chat no funciona sin uno en uso; la voz sí (es opcional). */
  warnWhenNoneActive?: boolean
}) {
  const [editing, setEditing] = useState<CatalogEntry<P> | null>(null)
  const [removing, setRemoving] = useState<CatalogEntry<P> | null>(null)
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')

  const credentialOf = (provider: P) => credentials.find((c) => c.provider === provider)

  /* En uso → conectados → sin conectar, conservando el orden del catálogo dentro
     de cada grupo. */
  const rank = (entry: CatalogEntry<P>) =>
    activeProvider === entry.provider ? 0 : credentialOf(entry.provider) ? 1 : 2
  const rows = [...catalog].sort((a, b) => rank(a) - rank(b))

  const openForm = (entry: CatalogEntry<P>) => {
    const credential = credentialOf(entry.provider)
    setModel(credential?.model ?? entry.suggestedModels[0] ?? '')
    setApiKey('')
    setEditing(entry)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editing) return
    if (!model.trim()) {
      toast.error('Indica el modelo.')
      return
    }
    if (apiKey.trim().length < 10) {
      toast.error('La API key es obligatoria (mínimo 10 caracteres).')
      return
    }
    try {
      await actions.save(editing.provider, model.trim(), apiKey.trim())
      toast.success(`${editing.label} conectado`)
      setEditing(null)
    } catch (err) {
      toastApiError(err, 'No se pudo guardar')
    }
  }

  const activate = async (entry: CatalogEntry<P>) => {
    try {
      await actions.activate(entry.provider)
      toast.success(`Ahora se usa ${entry.label}`)
    } catch (err) {
      toastApiError(err, 'No se pudo activar')
    }
  }

  const remove = async () => {
    if (!removing) return
    try {
      await actions.remove(removing.provider)
      toast.success(`${removing.label} desconectado`)
      setRemoving(null)
    } catch (err) {
      toastApiError(err, 'No se pudo desconectar')
    }
  }

  const editingCredential = editing ? credentialOf(editing.provider) : undefined
  const showWarning = warnWhenNoneActive && !activeProvider && credentials.length > 0

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {showWarning && (
        <p className="text-warning flex items-center gap-2 text-sm">
          <AlertTriangle aria-hidden className="size-4 shrink-0" />
          Hay proveedores conectados, pero ninguno en uso.
        </p>
      )}

      <Card className="gap-0 py-0">
        <ul className="divide-y">
          {rows.map((entry) => (
            <ProviderRow
              key={entry.provider}
              entry={entry}
              credential={credentialOf(entry.provider)}
              isActive={activeProvider === entry.provider}
              canManage={canManage}
              onConnect={() => openForm(entry)}
              onActivate={() => activate(entry)}
              onRemove={() => setRemoving(entry)}
              activating={actions.activating}
            />
          ))}
        </ul>
      </Card>

      <FormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        title={`${editingCredential ? 'Editar' : 'Conectar'} ${editing?.label ?? ''}`}
        description="La API key se guarda cifrada y nunca se vuelve a mostrar."
        submitLabel={editingCredential ? 'Guardar' : 'Conectar'}
        loading={actions.saving}
        onSubmit={submit}
      >
        <Field
          label="Modelo"
          htmlFor="provider-model"
          required
          hint="Texto libre; las sugerencias son solo una ayuda."
        >
          <Input
            id="provider-model"
            list="provider-models"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={editing?.suggestedModels[0] ?? 'modelo'}
          />
          <datalist id="provider-models">
            {editing?.suggestedModels.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>

        <Field
          label="API key"
          htmlFor="provider-key"
          required
          hint={
            editingCredential
              ? `La guardada termina en ${editingCredential.apiKeyLast4}. Escribe una nueva para reemplazarla.`
              : 'La consigues en el panel del proveedor.'
          }
        >
          <Input
            id="provider-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-…"
          />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Desconectar ${removing?.label ?? ''}`}
        description="Se borrará la credencial guardada. Podrás volver a conectarlo cuando quieras."
        confirmLabel="Desconectar"
        destructive
        loading={actions.removing}
        onConfirm={remove}
      />
    </section>
  )
}

/** Proveedores de chat: el modelo de lenguaje con el que habla Numi. */
function ChatSection({
  orgId,
  catalog,
  credentials,
  activeProvider,
  canManage,
}: {
  orgId: string
  catalog: CatalogEntry<ChatProvider>[]
  credentials: Credential<ChatProvider>[]
  activeProvider: ChatProvider | null | undefined
  canManage: boolean
}) {
  const upsert = useUpsertAiProvider(orgId)
  const activate = useActivateAiProvider(orgId)
  const remove = useRemoveAiProvider(orgId)

  return (
    <ProviderSection
      title="Chat (modelo de lenguaje)"
      description="El modelo con el que Numi conversa y consulta tus datos."
      catalog={catalog}
      credentials={credentials}
      activeProvider={activeProvider}
      canManage={canManage}
      warnWhenNoneActive
      actions={{
        save: (provider, model, apiKey) =>
          upsert.mutateAsync({ orgId, provider, data: { model, apiKey } }),
        activate: (provider) => activate.mutateAsync({ orgId, provider }),
        remove: (provider) => remove.mutateAsync({ orgId, provider }),
        saving: upsert.isPending,
        activating: activate.isPending,
        removing: remove.isPending,
      }}
    />
  )
}

/** Proveedores de voz: transcriben los mensajes de audio. Es opcional. */
function VoiceSection({
  orgId,
  catalog,
  credentials,
  activeProvider,
  canManage,
}: {
  orgId: string
  catalog: CatalogEntry<VoiceProvider>[]
  credentials: Credential<VoiceProvider>[]
  activeProvider: VoiceProvider | null | undefined
  canManage: boolean
}) {
  const upsert = useUpsertVoiceProvider(orgId)
  const activate = useActivateVoiceProvider(orgId)
  const remove = useRemoveVoiceProvider(orgId)

  return (
    <ProviderSection
      title="Voz (transcripción)"
      description="El modelo que convierte los audios en texto. Es independiente del de chat y puedes dejarlo sin conectar."
      catalog={catalog}
      credentials={credentials}
      activeProvider={activeProvider}
      canManage={canManage}
      actions={{
        save: (provider, model, apiKey) =>
          upsert.mutateAsync({ orgId, provider, data: { model, apiKey } }),
        activate: (provider) => activate.mutateAsync({ orgId, provider }),
        remove: (provider) => remove.mutateAsync({ orgId, provider }),
        saving: upsert.isPending,
        activating: activate.isPending,
        removing: remove.isPending,
      }}
    />
  )
}

export function AssistantPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canManage = can('assistant.settings.manage')
  const { settings, isPending, isError, error } = useAssistantSettings(canManage ? orgId : undefined)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Asistente / IA"
        description="Numi funciona con tu propia cuenta de IA (BYOK): conectas un proveedor de chat y, si quieres, uno de voz para los audios. Las API keys se guardan cifradas y nunca se muestran."
      />

      {!canManage ? (
        <p className="text-muted-foreground text-sm">
          Solo el dueño o un administrador pueden configurar el asistente.
        </p>
      ) : isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
      ) : isError || !settings ? (
        <p className="text-destructive text-sm">
          {getErrorMessage(error, 'No se pudo cargar la configuración del asistente.')}
        </p>
      ) : (
        <>
          <ChatSection
            orgId={orgId ?? ''}
            catalog={settings.catalog}
            credentials={settings.providers}
            activeProvider={settings.activeProvider}
            canManage={canManage}
          />
          <VoiceSection
            orgId={orgId ?? ''}
            catalog={settings.voice.catalog}
            credentials={settings.voice.providers}
            activeProvider={settings.voice.activeProvider}
            canManage={canManage}
          />
        </>
      )}
    </div>
  )
}
