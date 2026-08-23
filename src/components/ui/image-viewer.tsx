import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

/**
 * **Una imagen a tamaño de mirarla.**
 *
 * Una miniatura dentro de una burbuja sirve para reconocer la foto, no para leer lo
 * que dice: un comprobante de pago a 200 px de ancho es un rectángulo gris. Tocarla
 * la abre entera, que es el gesto que ya trae aprendido cualquiera que use un chat.
 *
 * El diálogo va sin caja: sin fondo, sin borde y sin relleno, porque el marco de un
 * diálogo alrededor de una foto solo la hace más pequeña. Lo único que se dibuja
 * encima es la salida, y lleva `bg-scrim` porque tiene que verse sobre lo que sea
 * que haya debajo — una esquina blanca y una negra son igual de probables.
 */
export function ImageViewer({
  open,
  onOpenChange,
  src,
  alt,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  /** Qué se está mirando. Es el nombre accesible del diálogo. */
  alt: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="w-auto max-w-[calc(100%-2rem)] overflow-visible border-0 bg-transparent p-0 shadow-none sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <img
          src={src}
          alt={alt}
          className="max-h-[calc(100dvh-4rem)] w-auto rounded-lg object-contain"
        />
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar la imagen"
          className="bg-scrim text-primary-foreground focus-visible:ring-ring/50 absolute top-2 right-2 grid size-8 place-items-center rounded-full backdrop-blur-sm focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <X aria-hidden className="size-4" />
        </button>
      </DialogContent>
    </Dialog>
  )
}
