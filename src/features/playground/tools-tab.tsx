import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Note } from '@/components/ui/note'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { DetailRow, DetailRows } from '@/components/ui/detail-drawer'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { Wrench } from 'lucide-react'
import { getErrorMessage } from '@/lib/errors'
import type { PlaygroundTool, PlaygroundToolRun } from '@/api/generated/model'
import { Disclosure, JsonBlock } from './code-block'
import { usePlaygroundContext, usePlaygroundTools, useRunTool } from './hooks'
import { toolOfferStatus } from './labels'
import { formatMs } from './metrics'
import { RunContextBar } from './run-context-bar'
import { useRunSettings } from './run-settings'
import {
  initialValues,
  readSchemaFields,
  toArgs,
  type FieldValues,
  type SchemaField,
} from './schema-fields'
import { ToolCatalog } from './tool-catalog'

/**
 * **Herramientas**: qué ve el modelo, y correr una a mano sin modelo de por medio.
 *
 * Separa en un clic «la herramienta está rota» de «el modelo la llamó mal», que es la
 * primera bifurcación de cualquier investigación y la más cara de resolver a ojo.
 */
export function ToolsTab() {
  const { settings, set, selectOrganization } = useRunSettings()
  const { context, isPending, isError, error } = usePlaygroundContext(settings.orgId)
  const tools = usePlaygroundTools(settings.orgId, {
    role: settings.role,
    customRoleId: settings.customRoleId || undefined,
    mode: settings.mode,
  })
  const [running, setRunning] = useState<PlaygroundTool | null>(null)

  return (
    <div className="space-y-4">
      {/*
        El contexto manda aquí igual que en la consola: el catálogo cambia con el rol y con
        el modo, y correr una herramienta escribe con los permisos de quien se suplanta.
      */}
      <RunContextBar
        settings={settings}
        context={context}
        isLoading={isPending && !!settings.orgId}
        onChange={set}
        onSelectOrganization={selectOrganization}
        tools={{ offered: tools.tools.filter((t) => t.offered).length, total: tools.tools.length }}
        onOpenTools={() => {}}
        onOpenPrompt={() => {}}
        promptEdited={false}
        showChips={false}
      />

      {isError ? (
        <p className="text-destructive text-sm">
          {getErrorMessage(error, 'No se pudo cargar la organización.')}
        </p>
      ) : !settings.orgId ? (
        <EmptyState
          Icon={Wrench}
          title="Elige una organización"
          description="Las herramientas corren contra los datos de un cliente, así que primero hay que decir contra cuál."
        />
      ) : (
        <ToolCatalog
          tools={tools.tools}
          isPending={tools.isPending}
          isError={tools.isError}
          error={tools.error}
          onSelect={(tool) => setRunning(tool)}
        />
      )}

      {running && (
        <ToolRunner
          key={running.name}
          tool={running}
          organizationId={settings.orgId}
          role={settings.role}
          customRoleId={settings.customRoleId}
          mode={settings.mode}
          onClose={() => setRunning(null)}
        />
      )}
    </div>
  )
}

/**
 * **La ficha de una herramienta**, y desde ella se corre.
 *
 * **Un fallo de la herramienta responde 200 con `ok: false`**, no un 500. Por eso el
 * resultado tiene dos caras y ninguna es un error de red: lo que devolvió y por qué no
 * pudo.
 */
function ToolRunner({
  tool,
  organizationId,
  role,
  customRoleId,
  mode,
  onClose,
}: {
  tool: PlaygroundTool
  organizationId: string
  role: 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'OPERATOR' | 'VIEWER'
  customRoleId: string
  mode: 'read_only' | 'read_write'
  onClose: () => void
}) {
  /*
    Correr lo que el backend va a rechazar no enseña nada: una herramienta de escritura en
    solo lectura responde 403, y una que el rol no puede, también. Se dice antes (§88.5).
  */
  const blocked = (tool.kind === 'write' && mode === 'read_only') || tool.withheld === 'permission'
  const fields = readSchemaFields(tool.schema)
  const [tab, setTab] = useState<'form' | 'json'>(fields ? 'form' : 'json')
  const [values, setValues] = useState<FieldValues>(() => initialValues(fields ?? []))
  const [json, setJson] = useState('{}')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [result, setResult] = useState<PlaygroundToolRun | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const run = useRunTool()

  const submit = () => {
    setFailure(null)
    setJsonError(null)

    let args: Record<string, unknown>
    if (tab === 'form' && fields) {
      args = toArgs(fields, values)
    } else {
      try {
        const parsed: unknown = JSON.parse(json || '{}')
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setJsonError('Los argumentos son un objeto: { "clave": valor }.')
          return
        }
        args = parsed as Record<string, unknown>
      } catch {
        setJsonError('Eso no es JSON válido.')
        return
      }
    }

    run.mutate(
      {
        name: tool.name,
        data: {
          organizationId,
          role,
          customRoleId: customRoleId || undefined,
          mode,
          args,
        },
      },
      {
        onSuccess: (response) => setResult(response.data as PlaygroundToolRun),
        onError: (e) => setFailure(getErrorMessage(e, 'No se pudo correr la herramienta.')),
      },
    )
  }

  return (
    <Drawer
      open
      onOpenChange={(open) => !open && onClose()}
      title={tool.name}
      meta={tool.description}
      footer={
        <div className="flex items-center justify-end gap-3">
          {blocked && (
            <span className="text-muted-foreground mr-auto text-xs">
              {tool.kind === 'write' && mode === 'read_only'
                ? 'Cambia el modo para poder correrla'
                : 'El rol suplantado no tiene el permiso'}
            </span>
          )}
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={submit} disabled={run.isPending || blocked}>
            {run.isPending ? 'Corriendo…' : 'Ejecutar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/*
          **Qué es y por qué se ofrece o no.** Vivía en el acordeón del catálogo y se perdió
          al pasarlo a tabla; su sitio es este, que es donde se mira una herramienta en
          concreto. La tabla responde «¿cuál?» y la ficha responde «¿y esta qué hace?».
        */}
        <DetailRows>
          <DetailRow label="Tipo">{tool.kind === 'write' ? 'Escribe' : 'Solo lee'}</DetailRow>
          <DetailRow label="Permiso">
            <span className="font-mono text-xs">{tool.permission ?? '—'}</span>
          </DetailRow>
          <DetailRow label="En esta corrida">
            <StatusBadge {...toolOfferStatus(tool.offered, tool.withheld)} />
          </DetailRow>
        </DetailRows>

        {tool.kind === 'write' && (
          <Note tone="warning" title="Esta herramienta escribe">
            Sin <code className="text-xs">confirmed: true</code> devuelve su petición de
            confirmación, igual que se la devolvería al modelo. Con él, registra de verdad.
          </Note>
        )}

        {fields && (
          <SegmentedControl
            aria-label="Cómo se escriben los argumentos"
            options={[
              { value: 'form', label: 'Formulario' },
              { value: 'json', label: 'JSON' },
            ]}
            value={tab}
            onChange={setTab}
          />
        )}

        {tab === 'form' && fields ? (
          fields.length === 0 ? (
            <p className="text-muted-foreground text-sm">Esta herramienta no lleva argumentos.</p>
          ) : (
            <div className="space-y-3">
              {fields.map((field) => (
                <SchemaFieldInput
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  onChange={(value) => setValues((prev) => ({ ...prev, [field.name]: value }))}
                />
              ))}
            </div>
          )
        ) : (
          <Field
            label="Argumentos"
            htmlFor="pg-args"
            error={jsonError ?? undefined}
            hint={
              fields
                ? undefined
                : 'Su esquema no se deja pintar como formulario: aquí van tal cual.'
            }
          >
            <Textarea
              id="pg-args"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={8}
              className="scrollbar-slim font-mono text-xs"
            />
          </Field>
        )}

        {/*
          El esquema literal, debajo del formulario que se genera con él. No es redundante:
          el formulario solo sabe pintar lo plano, y cuando algo no cuadra —un argumento que
          el backend rechaza— lo primero que se mira es qué esperaba de verdad.
        */}
        <Disclosure
          summary="El esquema, tal cual"
          meta={tool.schema == null ? 'sin representar' : undefined}
        >
          {tool.schema == null ? (
            <p className="text-muted-foreground text-xs">
              Su esquema no se pudo representar. La herramienta funciona igual; lo que no hay
              es formulario.
            </p>
          ) : (
            <JsonBlock value={tool.schema} />
          )}
        </Disclosure>

        {failure && <p className="text-destructive text-sm">{failure}</p>}

        {result && (
          <div className="space-y-2 border-t pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                tone={result.ok ? 'success' : 'destructive'}
                label={result.ok ? 'Corrió' : 'Falló'}
              />
              <span className="nums text-muted-foreground text-xs">
                {formatMs(result.durationMs)}
              </span>
            </div>
            {result.error && (
              <p className="text-destructive text-sm">
                {result.error.code}: {result.error.message}
              </p>
            )}
            <JsonBlock value={result.output} />
          </div>
        )}
      </div>
    </Drawer>
  )
}

function SchemaFieldInput({
  field,
  value,
  onChange,
}: {
  field: SchemaField
  value: string | boolean | undefined
  onChange: (value: string | boolean) => void
}) {
  const id = `pg-arg-${field.name}`

  if (field.type === 'boolean') {
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          className="accent-primary size-4"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          {field.name}
          {field.description && (
            <span className="text-muted-foreground"> — {field.description}</span>
          )}
        </span>
      </label>
    )
  }

  return (
    <Field
      label={field.name}
      htmlFor={id}
      required={field.required}
      hint={field.description ?? undefined}
    >
      {field.type === 'enum' ? (
        <NativeSelect
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Sin valor</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </NativeSelect>
      ) : (
        <Input
          id={id}
          inputMode={field.type === 'number' ? 'decimal' : undefined}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  )
}
