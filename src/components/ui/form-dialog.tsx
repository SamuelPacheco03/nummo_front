import { type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * **El formulario en diálogo centrado de Configuración.**
 *
 * Cada pantalla de ajustes tenía el suyo: `Dialog` + `DialogHeader` +
 * `<form className="space-y-4">` + `DialogFooter` con Cancelar y Guardar,
 * copiado tres veces con etiquetas distintas y un `Loader` que a veces estaba y
 * a veces no. Es exactamente lo que CLAUDE.md llama extraer en vez de reescribir:
 * lo que cambia entre uno y otro son los campos y el texto del botón.
 *
 * **Por qué centrado y no el `Drawer` (§11.1.3):** el cajón es para lo que cuelga
 * de una lista —una ficha que se comparte por URL, unos filtros que se aplican a
 * lo que hay detrás—. Aquí no hay lista detrás que mirar mientras se escribe: son
 * tres campos y un botón, y el diálogo centrado los pone donde ya está la vista.
 * Vale para Configuración; una ficha de cartera sigue yendo al cajón.
 *
 * El pie es siempre Cancelar + acción: la salida y la confirmación en el mismo
 * sitio en las cinco pantallas.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  loading = false,
  onSubmit,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  submitLabel?: string
  cancelLabel?: string
  /** Deshabilita el envío y pinta el spinner. */
  loading?: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader size="sm" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
