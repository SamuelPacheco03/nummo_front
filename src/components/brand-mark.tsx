import { cn } from '@/lib/utils'

// Vive en `public/` (no se importa como módulo): así lo comparten el manifest,
// el favicon y la UI, y Workbox lo precachea junto al resto del shell.
const LOGO_URL = `${import.meta.env.BASE_URL}logo-mark.png`

/**
 * Isotipo de Nummo. El PNG lleva fondo transparente (lo genera
 * `scripts/generate-icons.mjs`), así que funciona igual en claro y en oscuro.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={LOGO_URL}
      alt=""
      aria-hidden
      width={256}
      height={256}
      className={cn('size-7 shrink-0 object-contain', className)}
    />
  )
}

/** Isotipo + wordmark, la firma de marca en sidebar, login y onboarding. */
export function BrandLockup({
  className,
  markClassName,
  textClassName,
}: {
  className?: string
  markClassName?: string
  textClassName?: string
}) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <BrandMark className={markClassName} />
      <span className={cn('font-display text-base font-semibold tracking-tight', textClassName)}>
        Nummo
      </span>
    </span>
  )
}
