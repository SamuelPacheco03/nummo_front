import { useState } from 'react'
import { Download, Share, SquarePlus } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useInstallPrompt } from './use-install-prompt'

/**
 * "Instalar app" en el pie del sidebar. Se esconde solo cuando no aplica:
 * ya instalada, o navegador sin soporte. En iOS no existe prompt nativo, así
 * que abrimos las instrucciones de "Añadir a pantalla de inicio".
 */
export function InstallAppButton({ className }: { className?: string }) {
  const { canPrompt, isInstalled, needsManualInstructions, promptInstall } = useInstallPrompt()
  const [helpOpen, setHelpOpen] = useState(false)

  if (isInstalled || (!canPrompt && !needsManualInstructions)) return null

  const onClick = async () => {
    if (needsManualInstructions) {
      setHelpOpen(true)
      return
    }
    const accepted = await promptInstall()
    if (accepted) toast.success('Nummo se está instalando')
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-2 px-2 text-xs text-muted-foreground hover:text-foreground',
          className,
        )}
      >
        <Download className="size-3.5" />
        Instalar app
      </button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Instalar Nummo</DialogTitle>
            <DialogDescription>
              En iPhone y iPad se añade desde Safari, en dos pasos.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <Share className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>
                Toca <strong>Compartir</strong> en la barra inferior de Safari.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <SquarePlus className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>
                Elige <strong>Añadir a pantalla de inicio</strong> y confirma.
              </span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  )
}
