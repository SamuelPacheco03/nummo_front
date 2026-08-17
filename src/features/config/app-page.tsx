import { useState } from 'react'
import { CheckCircle2, Download, RefreshCw, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Note } from '@/components/ui/note'
import { useInstallPrompt } from '@/pwa/use-install-prompt'
import { applyUpdate, checkForUpdate, clearAppCache, useAppUpdate } from '@/pwa/app-update'

/** «hace un momento» / «hace 12 min» / la hora, que es lo que se quiere saber de una comprobación. */
function sinceLabel(at: number | null): string {
  if (at === null) return 'sin comprobar todavía'
  const mins = Math.floor((Date.now() - at) / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  return new Date(at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

export function AppPage() {
  const { state, lastCheck, supported } = useAppUpdate()
  const { canPrompt, isInstalled, needsManualInstructions, promptInstall } = useInstallPrompt()
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const busy = state === 'checking' || state === 'updating'

  const doClear = async () => {
    setClearing(true)
    await clearAppCache()
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Aplicación"
        description="Versión instalada, actualizaciones y almacenamiento en este dispositivo."
      />

      <Panel title="Actualizaciones">
        <div className="space-y-4">
          {!supported ? (
            <Note tone="info" title="Este navegador no guarda Nummo en el dispositivo">
              Nummo funciona igual, pero se descarga entera cada vez y no abre sin conexión. Siempre
              estás en la última versión.
            </Note>
          ) : state === 'ready' || state === 'updating' ? (
            <Note tone="warning" title="Hay una versión nueva">
              Al actualizar se recarga la página. Se perderán los cambios que no hayas guardado.
            </Note>
          ) : (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <CheckCircle2 aria-hidden className="text-success size-4 shrink-0" />
              <span>Estás en la última versión.</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {state === 'ready' || state === 'updating' ? (
              <Button size="sm" onClick={applyUpdate} disabled={state === 'updating'}>
                <RefreshCw aria-hidden className="size-4" />
                {state === 'updating' ? 'Actualizando…' : 'Actualizar ahora'}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => void checkForUpdate(true)} disabled={busy}>
                <RefreshCw aria-hidden className={state === 'checking' ? 'size-4 animate-spin' : 'size-4'} />
                Buscar actualizaciones
              </Button>
            )}
            {supported && (
              <span className="text-muted-foreground text-xs">
                Última comprobación: {sinceLabel(lastCheck)}
              </span>
            )}
          </div>

          <p className="text-muted-foreground text-xs">
            Nummo comprueba sola al abrir, al volver a la pestaña y cada media hora. No se actualiza
            sin avisar: la recarga siempre la decides tú.
          </p>
        </div>
      </Panel>

      {!isInstalled && (canPrompt || needsManualInstructions) && (
        <Panel title="Instalar en este dispositivo">
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Instalada abre desde el escritorio o la pantalla de inicio, sin barra del navegador.
            </p>
            {needsManualInstructions ? (
              <p className="text-muted-foreground text-sm">
                En iPhone y iPad se añade desde Safari: <strong>Compartir</strong> →{' '}
                <strong>Añadir a pantalla de inicio</strong>.
              </p>
            ) : (
              <Button size="sm" variant="outline" onClick={() => void promptInstall()}>
                <Download aria-hidden className="size-4" />
                Instalar Nummo
              </Button>
            )}
          </div>
        </Panel>
      )}

      <Panel title="Si algo se ve raro">
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Nummo guarda su interfaz en este dispositivo para abrir rápido y sin conexión. Si tras
            una actualización algo se ve a medias, vaciar ese almacén lo descarga todo de nuevo.
          </p>
          <p className="text-muted-foreground text-sm">
            <strong className="text-foreground font-medium">No borra tus datos</strong>: las cuentas,
            los pagos y los contactos viven en el servidor. Tampoco cierra tu sesión ni cambia tus
            preferencias.
          </p>
          <Button size="sm" variant="outline" onClick={() => setClearOpen(true)}>
            <Trash2 aria-hidden className="size-4" />
            Vaciar y recargar
          </Button>
        </div>
      </Panel>

      <p className="text-muted-foreground text-xs">
        Versión <span className="font-mono">{__BUILD_ID__}</span>
      </p>

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={(o) => !o && setClearOpen(false)}
        title="Vaciar y recargar"
        description="Se descargará la interfaz de nuevo. Tus datos y tu sesión no se tocan."
        confirmLabel="Vaciar y recargar"
        loading={clearing}
        onConfirm={doClear}
      />
    </div>
  )
}
