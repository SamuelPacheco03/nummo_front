import { useState } from 'react'
import { Building2, PenLine, Settings2, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Drawer } from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { roleLabel } from '@/features/organizations/roles'
import { cn } from '@/lib/utils'
import type { PlaygroundContext, PlaygroundOrganization } from '@/api/generated/model'
import { RunSettingsFields } from './run-settings-fields'
import type { RunSettings, SettingsKey } from './run-settings'

/**
 * **Contra qué se está probando, en una línea.**
 *
 * Antes esto era un formulario de seis campos ocupando la mitad de la pantalla —siempre,
 * aunque no se fuera a tocar—, y la conversación empezaba por debajo del pliegue. Pero la
 * organización, el rol y el modo no son contenido: son **contexto**. Se leen de un vistazo
 * y se cambian cuando hace falta, que es una vez cada muchos turnos.
 *
 * Lo que sí manda sitio propio es **el modo de escritura**: encenderlo no es cambiar un
 * criterio, es autorizar que Numi registre pagos de verdad en la contabilidad de un
 * cliente. Por eso es un botón aparte, en ámbar, con confirmación, y mientras está activo
 * la barra entera cambia de color en lugar de esconderlo en un desplegable.
 */
export function RunContextBar({
  settings,
  context,
  isLoading,
  onChange,
  onSelectOrganization,
  tools,
  onOpenTools,
  onOpenPrompt,
  promptEdited,
}: {
  settings: RunSettings
  context: PlaygroundContext | undefined
  isLoading: boolean
  onChange: (patch: Partial<Record<SettingsKey, string>>) => void
  onSelectOrganization: (organization: PlaygroundOrganization) => void
  /** Cuántas herramientas ve el modelo, de cuántas hay. */
  tools: { offered: number; total: number }
  onOpenTools: () => void
  onOpenPrompt: () => void
  promptEdited: boolean
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmWrite, setConfirmWrite] = useState(false)
  const organization = context?.organization
  const writing = settings.mode === 'read_write'

  return (
    <>
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2.5 transition-colors lg:px-6',
          writing ? 'border-warning/40 bg-warning/10' : 'bg-card',
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
          {isLoading ? (
            <Skeleton className="h-5 w-56" />
          ) : organization ? (
            <>
              <Building2 aria-hidden className="text-muted-foreground size-4 shrink-0" />
              <span className="truncate font-medium">{organization.name}</span>
              <Dot />
              <span className="text-muted-foreground">{roleLabel(settings.role)}</span>
              <Dot />
              <span className={cn(writing ? 'text-warning-strong font-semibold' : 'text-muted-foreground')}>
                {writing ? 'Lectura y escritura' : 'Solo lectura'}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Sin organización elegida</span>
          )}

          {context && (
            <>
              <ContextChip onClick={onOpenPrompt} title="Ver y editar el system prompt">
                <PenLine aria-hidden className="size-3.5" />
                <span className="nums">{context.promptHash.slice(0, 6)}</span>
                {promptEdited && <span className="text-warning-strong">· editado</span>}
              </ContextChip>
              {settings.provider && settings.model && (
                <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 font-mono text-xs">
                  {settings.model}
                </span>
              )}
              <ContextChip onClick={onOpenTools} title="Ver el catálogo de herramientas">
                <Wrench aria-hidden className="size-3.5" />
                <span className="nums">
                  {tools.offered} de {tools.total}
                </span>
                <span>herramientas</span>
              </ContextChip>
            </>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings2 aria-hidden />
            Cambiar contexto
          </Button>
          {organization?.writable ? (
            writing ? (
              <Button
                size="sm"
                variant="outline"
                className="border-warning/50 text-warning-strong hover:bg-warning/10"
                onClick={() => onChange({ modo: '' })}
              >
                Volver a solo lectura
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-warning/50 text-warning-strong hover:bg-warning/10"
                onClick={() => setConfirmWrite(true)}
              >
                Activar escritura
              </Button>
            )
          ) : (
            organization && (
              <span className="text-muted-foreground hidden text-xs sm:inline">
                No está activa: solo lectura
              </span>
            )
          )}
        </div>
      </div>

      <Drawer open={settingsOpen} onOpenChange={setSettingsOpen} title="Contra qué se prueba">
        <RunSettingsFields
          settings={settings}
          context={context}
          isLoading={isLoading}
          onChange={onChange}
          onSelectOrganization={onSelectOrganization}
          showMode={false}
        />
      </Drawer>

      <ConfirmDialog
        open={confirmWrite}
        onOpenChange={setConfirmWrite}
        title="Activar escritura"
        description={`Numi va a poder registrar pagos, egresos y contactos de verdad en ${organization?.name ?? 'esta organización'}. No es una simulación y no hay deshacer en bloque: cada movimiento se revierte por donde se revierte siempre.`}
        confirmLabel="Activar escritura"
        onConfirm={() => {
          onChange({ modo: 'read_write' })
          setConfirmWrite(false)
        }}
      />
    </>
  )
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/50">
      ·
    </span>
  )
}

function ContextChip({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'border-border text-muted-foreground hover:bg-accent hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors',
        'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
      )}
    >
      {children}
    </button>
  )
}
