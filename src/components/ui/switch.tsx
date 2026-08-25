import { cn } from '@/lib/utils'

/**
 * **Interruptor de encendido/apagado.**
 *
 * Existe porque una casilla suelta no dice lo mismo: un checkbox es «marca esta
 * opción» y se lee junto a las demás de su grupo; un interruptor es «esto está
 * funcionando o no», y su estado se ve de lejos. Donde lo que se enciende **hace
 * algo por su cuenta** —la cobranza le escribe a tus clientes— la diferencia
 * importa.
 *
 * Va sobre un `<input type="checkbox" role="switch">` y no sobre un `<button>`:
 * conserva la semántica de formulario —se registra con React Hook Form, envía con
 * el `<form>`, responde a la barra espaciadora— y `role="switch"` es lo que hace
 * que un lector de pantalla diga «activado» en vez de «casilla marcada».
 *
 * **El encendido va en `success`, nunca en `brand`**: es un estado del sistema,
 * no una acción destacada. Y apagado va en gris y no en rojo — apagar la cobranza
 * no es un error (§7).
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  size = 'default',
  ...props
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  /** `sm` para el que va dentro de una tarjeta de etapa, junto a su nombre. */
  size?: 'default' | 'sm'
} & Omit<React.ComponentProps<'input'>, 'type' | 'checked' | 'onChange' | 'size'>) {
  const grande = size === 'default'
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full p-[3px] transition-colors',
        grande ? 'h-[30px] w-[52px]' : 'h-5 w-[34px] p-0.5',
        checked ? 'bg-success' : 'bg-muted-foreground/35',
        disabled && 'opacity-60',
        className,
      )}
    >
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        /*
          El control real, invisible y encima de todo: es lo que recibe el foco,
          el clic y el teclado. Pintar el interruptor con `<span>` y dejar el
          `<input>` haciendo su trabajo evita reimplementar a mano lo que el
          navegador ya sabe hacer.
        */
        className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        {...props}
      />
      <span
        aria-hidden
        className={cn(
          'pointer-events-none rounded-full bg-white shadow-sm transition-transform',
          'peer-focus-visible:ring-ring/50 peer-focus-visible:ring-[3px]',
          grande ? 'size-6' : 'size-4',
          checked ? (grande ? 'translate-x-[22px]' : 'translate-x-3.5') : 'translate-x-0',
        )}
      />
    </span>
  )
}
