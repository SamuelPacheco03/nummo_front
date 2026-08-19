import { cn } from '@/lib/utils'
import { useNumiStore } from './numi-store'

// Viven en `public/` (no se importan como módulo) igual que el isotipo de
// Nummo: los genera `scripts/generate-icons.mjs` desde `brand/numi.png` y
// Workbox los precachea con el resto del shell.
const GLYPH_URL = `${import.meta.env.BASE_URL}numi-glyph.png`
const MARK_URL = `${import.meta.env.BASE_URL}numi-mark.png`

/**
 * Cara de Numi DENTRO del chat: solo el glifo, sobre transparente. El icono de
 * app trae un squircle azul casi negro que se funde con las superficies del
 * tema oscuro; suelto, el glifo se lee sobre cualquier fondo.
 */
export function NumiAvatar({ className }: { className?: string }) {
  return (
    <img
      src={GLYPH_URL}
      alt=""
      aria-hidden
      draggable={false}
      width={256}
      height={256}
      className={cn('size-6 shrink-0 object-contain', className)}
    />
  )
}

/**
 * Icono de app completo (squircle con su fondo). Se usa en el botón flotante,
 * donde funciona como la "app" de Numi sobre el contenido de la pantalla.
 */
export function NumiAppMark({ className }: { className?: string }) {
  return (
    <img
      src={MARK_URL}
      alt=""
      aria-hidden
      /*
        Sin esto, arrastrar el botón flotante inicia el arrastre nativo de la
        imagen y el navegador cancela el gesto (`pointercancel`) al segundo
        movimiento: el botón no se movía y volvía solo a su sitio.
      */
      draggable={false}
      width={256}
      height={256}
      className={cn('size-14 shrink-0 object-contain', className)}
    />
  )
}

/**
 * **El punto sobre el icono de Numi**: contestó con el chat cerrado y todavía
 * no se ha visto (§32.3).
 *
 * Va donde vive el icono —la barra de abajo en móvil, el botón flotante en
 * escritorio— y no en una notificación aparte: la respuesta está en el chat, y
 * el sitio donde se dice es el sitio al que hay que ir. Se apaga solo al abrir.
 *
 * El anillo del color del fondo lo separa del icono; sin él, sobre el squircle
 * de Numi se lee como parte del dibujo.
 */
export function NumiUnreadDot({ className }: { className?: string }) {
  const unread = useNumiStore((s) => s.unread)
  if (!unread) return null
  return (
    <span
      aria-hidden
      className={cn(
        'bg-brand ring-card absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2',
        className,
      )}
    />
  )
}
