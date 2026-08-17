import { type ComponentProps } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Select nativo estilizado (accesible y fácil de registrar con RHF).
 *
 * `className` llega al `<select>`, no a la envoltura: para **ocultar o colocar**
 * el control entero hay que envolverlo, o el chevron —que va posicionado fuera
 * del select— se queda flotando solo.
 */
function NativeSelect({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          'border-input flex h-9 w-full appearance-none rounded-md pointer-coarse:min-h-11 border bg-transparent px-3 py-1 pr-8 text-sm shadow-xs outline-none transition-[color,box-shadow]',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 opacity-60" />
    </div>
  )
}

export { NativeSelect }
