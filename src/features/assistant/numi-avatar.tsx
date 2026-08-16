import { cn } from '@/lib/utils'

// Vive en `public/` (no se importa como módulo) igual que el isotipo de Nummo:
// lo genera `scripts/generate-icons.mjs` desde `brand/numi.png` y Workbox lo
// precachea con el resto del shell.
const NUMI_MARK_URL = `${import.meta.env.BASE_URL}numi-mark.png`

/**
 * Cara de Numi. El PNG ya trae su propia silueta y fondo oscuro, así que se
 * pinta tal cual: funciona igual en tema claro y oscuro.
 */
export function NumiAvatar({ className }: { className?: string }) {
  return (
    <img
      src={NUMI_MARK_URL}
      alt=""
      aria-hidden
      width={256}
      height={256}
      className={cn('size-7 shrink-0 object-contain', className)}
    />
  )
}
