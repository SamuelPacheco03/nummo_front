import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Loader2, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canManageOrg } from '@/features/organizations/roles'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { AiProviderCatalogEntry, AiProviderCredential } from '@/api/generated/model'
import {
  useActivateAiProvider,
  useAssistantSettings,
  useRemoveAiProvider,
  useUpsertAiProvider,
} from './hooks'

/** Tarjeta de un proveedor: modelo + API key (write-only) y acciones. */
function ProviderCard({
  orgId,
  entry,
  credential,
  isActive,
}: {
  orgId: string
  entry: AiProviderCatalogEntry
  credential: AiProviderCredential | undefined
  isActive: boolean
}) {
  const upsert = useUpsertAiProvider(orgId)
  const activate = useActivateAiProvider(orgId)
  const remove = useRemoveAiProvider(orgId)
  const configured = !!credential
  const [model, setModel] = useState(credential?.model ?? entry.suggestedModels[0] ?? '')
  const [apiKey, setApiKey] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  const onSave = async () => {
    if (!model.trim()) {
      toast.error('Indica el modelo.')
      return
    }
    if (apiKey.trim().length < 10) {
      toast.error('La API key es obligatoria (mín. 10 caracteres).')
      return
    }
    try {
      await upsert.mutateAsync({ orgId, provider: entry.provider, data: { model: model.trim(), apiKey: apiKey.trim() } })
      setApiKey('')
      toast.success(`${entry.label} guardado`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar'))
    }
  }

  const onActivate = async () => {
    try {
      await activate.mutateAsync({ orgId, provider: entry.provider })
      toast.success(`${entry.label} activado`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo activar'))
    }
  }

  const onRemove = async () => {
    try {
      await remove.mutateAsync({ orgId, provider: entry.provider })
      setConfirmDel(false)
      toast.success(`${entry.label} eliminado`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo eliminar'))
    }
  }

  const modelsId = `models-${entry.provider}`

  return (
    <Card className={cn(isActive && 'ring-1 ring-brand')}>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">{entry.label}</h2>
          {isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
              <Check className="size-3" /> Activo
            </span>
          ) : configured ? (
            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Configurado</span>
          ) : (
            <span className="rounded-full px-2 py-0.5 text-xs text-muted-foreground">Sin configurar</span>
          )}
        </div>

        <Field
          label="Modelo"
          htmlFor={`${entry.provider}-model`}
          hint="Texto libre; las sugerencias son solo una ayuda."
        >
          <Input
            id={`${entry.provider}-model`}
            list={modelsId}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={entry.suggestedModels[0] ?? 'modelo'}
          />
          <datalist id={modelsId}>
            {entry.suggestedModels.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>

        <Field
          label="API key"
          htmlFor={`${entry.provider}-key`}
          hint={
            configured
              ? `Guardada (termina en ${credential.apiKeyLast4}). Se cifra y nunca se muestra; vuelve a ingresarla para actualizar.`
              : 'Se guarda cifrada y nunca se muestra.'
          }
        >
          <Input
            id={`${entry.provider}-key`}
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={configured ? `•••• ${credential.apiKeyLast4}` : 'sk-…'}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={onSave} disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="size-4 animate-spin" />}
            Guardar
          </Button>
          {configured && !isActive && (
            <Button type="button" variant="outline" onClick={onActivate} disabled={activate.isPending}>
              {activate.isPending && <Loader2 className="size-4 animate-spin" />}
              Activar
            </Button>
          )}
          {configured && (
            <Button
              type="button"
              variant="ghost"
              className="ml-auto text-destructive hover:text-destructive"
              onClick={() => setConfirmDel(true)}
            >
              <Trash2 className="size-4" />
              Eliminar
            </Button>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title={`Eliminar ${entry.label}`}
        description="Se borrará la credencial guardada. Podrás volver a configurarla cuando quieras."
        confirmLabel="Eliminar"
        destructive
        loading={remove.isPending}
        onConfirm={onRemove}
      />
    </Card>
  )
}

export function AssistantPage() {
  const { orgId, role } = useCurrentOrg()
  const canManage = canManageOrg(role)
  const { settings, isPending, isError, error } = useAssistantSettings(canManage ? orgId : undefined)

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Asistente / IA"
        description="Conecta tu propio proveedor de IA (BYOK): elige modelo y pega tu API key. Con un proveedor activo, Numi queda disponible en el botón flotante de todas las pantallas."
      />

      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          Solo el dueño o un administrador pueden configurar el asistente.
        </p>
      ) : isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
      ) : isError || !settings ? (
        <p className="text-sm text-destructive">
          {getErrorMessage(error, 'No se pudo cargar la configuración del asistente.')}
        </p>
      ) : (
        <div className="space-y-4">
          {settings.catalog.map((entry) => (
            <ProviderCard
              key={entry.provider}
              orgId={orgId ?? ''}
              entry={entry}
              credential={settings.providers.find((p) => p.provider === entry.provider)}
              isActive={settings.activeProvider === entry.provider}
            />
          ))}
        </div>
      )}
    </div>
  )
}
