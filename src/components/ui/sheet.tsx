import { type ComponentProps } from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function Sheet(props: ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger(props: ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetContent({
  className,
  children,
  side = 'left',
  ...props
}: ComponentProps<typeof SheetPrimitive.Content> & { side?: 'left' | 'right' | 'bottom' | 'drawer' }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col shadow-lg transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-300',
          // Los laterales alojan la navegación, así que van sobre la superficie
          // del sidebar. La hoja inferior es CONTENIDO —acciones, formularios— y
          // por eso usa la superficie de capa: heredar el sidebar la dejaba
          // oscura en tema claro, que es exactamente lo que no debe pasar.
          side !== 'bottom' && side !== 'drawer' &&
            'bg-sidebar text-sidebar-foreground border-sidebar-border h-full w-72 max-w-[85vw]',
          (side === 'bottom' || side === 'drawer') && 'bg-popover text-popover-foreground',
          /*
            `drawer`: hoja inferior en móvil y cajón por la derecha desde `sm`.
            Reutiliza `.animate-drawer` (index.css), que es la única forma de
            cambiar el EJE de entrada con el breakpoint — mezclar
            `slide-in-from-bottom` con `sm:slide-in-from-right` deja las dos
            traslaciones activas y el panel entra en diagonal.
          */
          side === 'drawer' &&
            'animate-drawer inset-x-0 bottom-0 max-h-[88vh] rounded-t-xl border-t sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:w-[26rem] sm:max-h-none sm:max-w-[calc(100%-2rem)] sm:rounded-none sm:border-t-0 sm:border-l',
          side === 'left' &&
            'inset-y-0 left-0 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
          side === 'right' &&
            'inset-y-0 right-0 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          // Hoja inferior: el gesto natural en móvil (§44). Se limita a 85vh
          // para que siempre se vea algo del fondo y quede claro que es una
          // capa sobre la pantalla, no una pantalla nueva.
          side === 'bottom' &&
            'inset-x-0 bottom-0 max-h-[85vh] rounded-t-xl border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute top-3.5 right-3.5 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-hidden">
          <XIcon className="size-4" />
          <span className="sr-only">Cerrar</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('font-display font-semibold', className)}
      {...props}
    />
  )
}

export { Sheet, SheetTrigger, SheetContent, SheetTitle }
