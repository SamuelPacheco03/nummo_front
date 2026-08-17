import { ChevronLeft, ChevronUp, Lock, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration } from './use-audio-recorder'

/** A cuántos píxeles a la izquierda se cancela. */
export const CANCEL_AT = 120
/** A cuántos píxeles hacia arriba se fija la grabación. */
export const LOCK_AT = 72
/** Por debajo de esto fue un toque, no una grabación. */
export const MIN_SECONDS = 0.7

/**
 * **Lo que se ve mientras se mantiene pulsado el micrófono.**
 *
 * Es el gesto de WhatsApp y se copia a propósito: mantener para grabar, deslizar
 * a la izquierda para cancelar y hacia arriba para fijar. No es un capricho de
 * estilo — es el único gesto de grabar que la gente ya tiene aprendido, y un
 * dictado a Numi se parece más a mandar un audio que a rellenar un formulario.
 *
 * La barra dice **las dos salidas a la vez**: el tiempo que llevas y cómo salir
 * sin mandar nada. Y el candado aparece solo cuando empiezas a subir, para no
 * ofrecer de entrada una opción que casi nadie usa.
 */
export function HoldToRecord({
  seconds,
  dx,
  dy,
}: {
  seconds: number
  /** Desplazamiento del dedo, negativo hacia la izquierda. */
  dx: number
  /** Desplazamiento del dedo, negativo hacia arriba. */
  dy: number
}) {
  const slide = Math.max(dx, -CANCEL_AT)
  // Cuanto más cerca de cancelar, más se apaga el texto: el aviso de que va a pasar.
  const fade = 1 - Math.min(1, -slide / CANCEL_AT)
  const lift = Math.max(dy, -LOCK_AT)
  const locking = dy < -8

  return (
    <div className="bg-card border-t px-3 py-2.5">
      <div className="relative flex h-11 items-center">
        <div className="bg-secondary flex h-11 flex-1 items-center gap-3 rounded-full pr-16 pl-4">
          <span className="bg-destructive size-2 shrink-0 animate-pulse rounded-full" />
          <span className="text-sm tabular-nums">{formatDuration(seconds)}</span>
          {/* Recortado: el aviso se va por la izquierda sin montarse sobre el reloj. */}
          <div className="relative h-5 flex-1 overflow-hidden">
            <span
              className="text-muted-foreground absolute inset-0 flex items-center justify-center gap-1 text-sm whitespace-nowrap"
              style={{ transform: `translateX(${slide}px)`, opacity: fade }}
            >
              <ChevronLeft aria-hidden className="size-4" />
              Desliza para cancelar
            </span>
          </div>
        </div>

        {/*
          El candado, encima del dedo. Sube con él para que se vea que es ahí
          adonde hay que llegar, y se ilumina al llegar.
        */}
        <div
          aria-hidden
          className={cn(
            'bg-secondary text-muted-foreground absolute right-1 bottom-14 flex flex-col items-center gap-1 rounded-full px-2 py-2.5 transition-opacity',
            locking ? 'opacity-100' : 'opacity-0',
          )}
        >
          <Lock className={cn('size-4', dy <= -LOCK_AT && 'text-brand')} />
          <ChevronUp className="size-3 animate-bounce" />
        </div>

        <span
          aria-hidden
          className="bg-primary text-primary-foreground absolute right-0 grid size-14 place-items-center rounded-full shadow-lg transition-transform"
          style={{ transform: `translate(${slide / 3}px, ${lift / 2}px) scale(${1 + Math.min(seconds, 3) * 0.03})` }}
        >
          <Mic className="size-6" />
        </span>
      </div>
    </div>
  )
}
