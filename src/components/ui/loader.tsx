import { cn } from '@/lib/utils'

// Vive en `public/`, igual que el resto de la marca. Es el glifo suelto sobre
// transparente, no el icono de app con su squircle.
const NUMI_URL = `${import.meta.env.BASE_URL}numi-glyph.png`

const RING_SIZES = { sm: 'size-3.5', md: 'size-5', lg: 'size-7' } as const

/**
 * Aro de degradado de marca. Es el indicador de espera corta: dentro de un
 * botón mientras se envía, o en una tarjeta que recalcula.
 *
 * Los degradados cónicos no se pueden trazar con `border`, así que el anillo se
 * consigue recortando el disco con una máscara radial.
 */
export function Loader({
  size = 'md',
  className,
  label,
}: {
  size?: keyof typeof RING_SIZES
  className?: string
  /** Texto para lectores de pantalla. Sin él, el aro es decorativo. */
  label?: string
}) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
      className={cn('animate-loader-ring shrink-0', RING_SIZES[size], className)}
    >
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}

/**
 * Numi esperando: el glifo flota sobre su halo mientras una barra recorre el
 * degradado de marca.
 *
 * Se reserva para esperas que el usuario ha pedido explícitamente y que tardan
 * —generar mensualidades, causar mora, un informe pesado— y para el arranque de
 * la app. En listas y fichas siguen mandando los esqueletos, que dibujan la
 * forma del contenido y se perciben más rápidos que cualquier indicador.
 */
export function NumiLoader({
  label = 'Cargando…',
  className,
  compact = false,
}: {
  label?: string
  className?: string
  /** En línea dentro de una tarjeta: sin barra y en horizontal. */
  compact?: boolean
}) {
  const glyph = (
    <span className={cn('relative grid place-items-center', compact ? 'size-8' : 'size-16')}>
      <span
        aria-hidden
        className={cn(
          'animate-numi-halo absolute rounded-full blur-lg',
          'bg-[linear-gradient(150deg,var(--logo-teal),var(--logo-blue)_60%,var(--logo-indigo))]',
          compact ? 'size-6' : 'size-11',
        )}
      />
      <img
        src={NUMI_URL}
        alt=""
        aria-hidden
        width={256}
        height={256}
        className={cn('animate-numi-float relative', compact ? 'size-7' : 'size-14')}
      />
    </span>
  )

  if (compact) {
    return (
      <div role="status" className={cn('flex items-center gap-2.5', className)}>
        {glyph}
        <span className="text-muted-foreground text-sm">{label}</span>
      </div>
    )
  }

  return (
    <div role="status" className={cn('flex flex-col items-center gap-4', className)}>
      {glyph}
      <span aria-hidden className="bg-brand/15 relative h-[3px] w-40 overflow-hidden rounded-full">
        <span className="animate-loader-sweep absolute inset-0 w-2/5 rounded-full bg-[linear-gradient(90deg,var(--logo-teal),var(--logo-cyan),var(--logo-blue),var(--logo-indigo))]" />
      </span>
      <span className="text-muted-foreground text-sm">{label}</span>
    </div>
  )
}

/** Espera a página completa: arranque de la app y cambio de ruta. */
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <NumiLoader label={label} />
    </div>
  )
}
