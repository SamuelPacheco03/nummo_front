import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { PlaygroundContext } from '@/api/generated/model'
import { CopyButton } from './code-block'
import { QuietButton } from './quiet-button'

/**
 * **El system prompt, a tamaño de leerse.**
 *
 * Son unos 4.700 caracteres, y estaban metidos en un textarea de seis renglones dentro de
 * un formulario: para saber qué decía había que desplazar dentro de una caja del tamaño de
 * un párrafo. Es el texto que decide cómo contesta Numi — el objeto más importante de esta
 * consola— y no cabía en pantalla.
 *
 * Va en diálogo ancho y alto, no en el cajón lateral: el cajón mide 30rem y este texto se
 * lee en líneas largas. Y se abre desde la huella del prompt en la barra de contexto, que
 * es donde alguien se pregunta «¿cuál está corriendo?».
 *
 * **Editarlo no lo guarda en ningún sitio**: corre solo en esta conversación.
 */
export function SystemPromptDialog({
  context,
  value,
  onSave,
  onClose,
}: {
  context: PlaygroundContext
  value: string
  onSave: (value: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(value)
  const edited = draft !== context.systemPrompt

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92dvh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>System prompt</DialogTitle>
          <DialogDescription>
            Es el que recibe Numi en cada turno. Lo que edites aquí corre solo en esta
            conversación: no se guarda en ningún sitio.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          aria-label="System prompt"
          className="scrollbar-slim min-h-[52dvh] flex-1 resize-none font-mono text-xs leading-relaxed"
        />

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="nums">{draft.length.toLocaleString('es-CO')} caracteres</span>
          <span>
            Vigente: <span className="nums">{context.promptHash.slice(0, 12)}</span>
          </span>
          <CopyButton text={draft} label="Copiar" />
          {edited && (
            <QuietButton onClick={() => setDraft(context.systemPrompt)}>
              Volver al vigente
            </QuietButton>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onSave(draft)
              onClose()
            }}
          >
            {edited ? 'Usar en esta conversación' : 'Cerrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
