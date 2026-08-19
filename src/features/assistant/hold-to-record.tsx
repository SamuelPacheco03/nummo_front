import { ChevronLeft, ChevronUp, Lock, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration } from './use-audio-recorder'

/** A cuántos píxeles a la izquierda se cancela. */
export const CANCEL_AT = 120
/**
 * A cuántos píxeles hacia arriba se fija la grabación.
 *
 * Es una distancia que **no se recorre sin querer**. Estaba en 56 px —unos ocho
 * milímetros— y sostener el micrófono ya la cubría: el pulgar se apoya en el
 * borde de abajo de la pantalla y rueda hacia arriba mientras habla, así que
 * «mantener pulsado» acababa en el candado sin que nadie lo hubiera pedido.
 *
 * Es también **hasta dónde se sube**: el candado se dibuja justo ahí (`LOCK_OFFSET`),
 * a la altura de siempre. Subir más de lo que se ve sería pedir algo que la
 * pantalla no enseña.
 */
export const LOCK_AT = 104
/**
 * Lo que el dedo puede moverse sin que signifique nada.
 *
 * Nadie sostiene el pulgar quieto mientras habla, y sin esta zona muerta el
 * temblor de la mano contaba como «deslizar»: la grabación se cancelaba sola a
 * los dos segundos de empezar.
 */
export const DEAD_ZONE = 14
/** Por debajo de esto fue un toque, no una grabación. */
export const MIN_SECONDS = 0.7

/**
 * Cuánto tiene que mandar un eje sobre el otro para robarle el gesto.
 *
 * El eje no se decide para siempre en los primeros catorce píxeles —ahí solo hay
 * ruido y un pulgar acomodándose—, pero tampoco se cambia por cualquier cosa:
 * subir torcido tiene que seguir siendo subir.
 */
export const AXIS_MARGIN = 1.6

/** Cuánto sube el micrófono respecto al dedo, para quedar justo bajo el candado. */
const MIC_FOLLOW = 0.6
/**
 * Altura del candado sobre el micrófono: donde estuvo siempre.
 *
 * Atarlo al umbral lo mandó al doble de lejos cuando el umbral creció, y un
 * candado a dos dedos de distancia deja de leerse como el destino del gesto.
 * Ocho píxeles por debajo del umbral: se sube hasta él y ahí queda fijada.
 */
const LOCK_OFFSET = 96

/**
 * **Lo que se ve mientras se mantiene pulsado el micrófono.**
 *
 * Es el gesto de WhatsApp y se copia a propósito: mantener para grabar, deslizar
 * a la izquierda para cancelar y hacia arriba para fijar. No es un capricho de
 * estilo — es el único gesto de grabar que la gente ya tiene aprendido, y un
 * dictado a Numi se parece más a mandar un audio que a rellenar un formulario.
 *
 * **Las dos salidas se dibujan igual de fuerte.** Cancelar se veía —el aviso se
 * va por la izquierda y se apaga— pero fijar no: el candado apenas crecía un
 * poco y se llegaba al tope sin haberse enterado de que se estaba llegando. Así
 * que subir tiene ahora su propia animación, y dice **cuánto falta**: el candado
 * se llena de color como un vaso, el micrófono sube a su encuentro y el aviso de
 * abajo cambia de «desliza para cancelar» a «sube para fijar». Al llenarse, el
 * candado queda macizo: eso es que ya está.
 */
export function HoldToRecord({
  seconds,
  dx,
  dy,
  anchor,
}: {
  seconds: number
  /** Desplazamiento del dedo, negativo hacia la izquierda. */
  dx: number
  /** Desplazamiento del dedo, negativo hacia arriba. */
  dy: number
  /**
   * Centro del micrófono del composer, en coordenadas de pantalla.
   *
   * El círculo grande y el candado se anclan **ahí**, medido, y no a la esquina
   * del contenedor: el micrófono pequeño vive dentro de la caja de escribir y el
   * grande es el doble de ancho, así que a ojo quedaban a seis píxeles el uno
   * del otro y el dibujo saltaba bajo el dedo al empezar a grabar.
   */
  anchor: { x: number; y: number }
}) {
  const slide = Math.max(dx, -CANCEL_AT)
  // Cuanto más cerca de cancelar, más se apaga el texto: el aviso de que va a pasar.
  const fade = 1 - Math.min(1, -slide / CANCEL_AT)
  const lift = Math.max(dy, -LOCK_AT)
  // Cuánto falta para fijar, de 0 a 1. Manda el relleno, el tamaño y el aviso.
  const toLock = Math.min(1, -dy / LOCK_AT)
  // Los dos avisos se cruzan: el que no toca se aparta antes de llegar al tope.
  const rising = Math.min(1, toLock * 2.5)

  return (
    <div className="bg-card absolute inset-0 z-40 flex flex-col justify-center border-t px-3 py-2.5">
      <div className="flex h-11 items-center">
        <div className="bg-secondary flex h-11 flex-1 items-center gap-3 rounded-full pr-16 pl-4">
          <span className="bg-destructive size-2 shrink-0 animate-pulse rounded-full" />
          <span className="text-sm tabular-nums">{formatDuration(seconds)}</span>
          {/* Recortado: el aviso se va por la izquierda sin montarse sobre el reloj. */}
          <div className="relative h-5 flex-1 overflow-hidden">
            <span
              className="text-muted-foreground absolute inset-0 flex items-center justify-center gap-1 text-sm whitespace-nowrap"
              style={{ transform: `translateX(${slide}px)`, opacity: fade * (1 - rising) }}
            >
              <ChevronLeft aria-hidden className="size-4" />
              Desliza para cancelar
            </span>
            <span
              className="text-brand absolute inset-0 flex items-center justify-center gap-1 text-sm font-medium whitespace-nowrap"
              style={{ opacity: rising }}
            >
              <ChevronUp aria-hidden className="size-4" />
              Sube para fijar
            </span>
          </div>
        </div>
      </div>

      {/*
        El candado, justo encima del micrófono. Se llena de abajo arriba con lo
        que falta para fijar: es la misma idea que el aviso que se apaga al
        cancelar, pero contada al derecho.
      */}
      <div
        aria-hidden
        className={cn(
          'bg-secondary fixed z-50 flex flex-col items-center gap-1 overflow-hidden rounded-full px-2 py-2.5',
          toLock >= 1 && 'ring-brand/40 ring-2',
        )}
        style={{
          left: anchor.x,
          top: anchor.y - LOCK_OFFSET,
          transform: `translate(-50%, -50%) scale(${1 + toLock * 0.25})`,
        }}
      >
        <span
          className="bg-brand absolute inset-x-0 bottom-0"
          style={{ height: `${toLock * 100}%` }}
        />
        <Lock
          className={cn(
            'relative size-4 transition-colors',
            toLock > 0.45 ? 'text-brand-foreground' : 'text-muted-foreground',
          )}
        />
        <ChevronUp
          className={cn(
            'relative size-3 transition-opacity',
            toLock > 0.75 ? 'text-brand-foreground' : 'text-muted-foreground',
            toLock < 0.15 && 'animate-bounce',
          )}
          style={{ opacity: 1 - toLock * 0.7 }}
        />
      </div>

      {/* El micrófono grande, exactamente donde estaba el pequeño. */}
      <span
        aria-hidden
        className={cn(
          'text-primary-foreground fixed z-50 grid size-14 place-items-center rounded-full shadow-lg transition-colors',
          toLock > 0.45 ? 'bg-brand' : 'bg-primary',
        )}
        style={{
          left: anchor.x,
          top: anchor.y,
          transform: `translate(calc(-50% + ${slide / 3}px), calc(-50% + ${lift * MIC_FOLLOW}px)) scale(${1 + Math.min(seconds, 3) * 0.03})`,
        }}
      >
        <Mic className="size-6" />
      </span>
    </div>
  )
}
