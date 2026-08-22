import { useId, type SVGProps } from 'react'

/**
 * Las ilustraciones de los planes.
 *
 * Free es una semilla brotando —empezar—, Básico son barras creciendo —escalar— y Pro es
 * Numi con nodos en órbita —automatizar—. Geométricas y de marca: los colores salen de
 * `--logo-*`, que son los cuatro del isotipo y **no se re-tematizan** (§3.2), así que la
 * ilustración se ve igual en claro y en oscuro. Lo que sí sigue al tema son los grises, que
 * usan tokens semánticos.
 *
 * Los `id` de los degradados se generan con `useId`: son globales al documento, y dos
 * tarjetas con el mismo `id` harían que la segunda pintara con el degradado de la primera.
 */

/** El movimiento va aquí y no en cada `style`: una clase se puede apagar sin JavaScript. */
const DIBUJO = 'plan-art-draw'
const FLOTA = 'plan-art-float'
const FLOTA_LENTO = 'plan-art-float-slow'
const ORBITA = 'plan-art-orbit'

function Degradados({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-bt`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--logo-teal)" />
        <stop offset="1" stopColor="var(--logo-blue)" />
      </linearGradient>
      <linearGradient id={`${id}-bi`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--logo-blue)" />
        <stop offset="1" stopColor="var(--logo-indigo)" />
      </linearGradient>
      <linearGradient id={`${id}-cb`} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="var(--logo-cyan)" />
        <stop offset="1" stopColor="var(--logo-blue)" />
      </linearGradient>
    </defs>
  )
}

export function FreeArt(props: SVGProps<SVGSVGElement>) {
  const id = useId()
  return (
    <svg viewBox="0 0 120 96" fill="none" aria-hidden {...props}>
      <Degradados id={id} />
      {/* La bandeja: sombra apoyada, no un rectángulo más. */}
      <rect x="18" y="70" width="84" height="8" rx="4" fill="var(--border)" opacity="0.7" />
      <path d="M44 60h32l-4 14a4 4 0 0 1-4 3H52a4 4 0 0 1-4-3L44 60Z" fill={`url(#${id}-bi)`} />
      <path
        className={DIBUJO}
        d="M60 60c0-10-1-18 0-24"
        stroke={`url(#${id}-bt)`}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M60 42c-7 1-12-3-13-10 7-1 12 3 13 10Z" fill={`url(#${id}-bt)`} />
      <path d="M60 46c6 0 11-4 11-11-6 0-11 4-11 11Z" fill={`url(#${id}-cb)`} opacity="0.9" />
      <g className={FLOTA} style={{ transformOrigin: '60px 26px' }}>
        <circle cx="60" cy="26" r="9" fill={`url(#${id}-cb)`} />
        <path d="M60 21v10M57 24h6" stroke="var(--card)" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <circle cx="30" cy="30" r="2.5" fill="var(--logo-teal)" opacity="0.5" className={FLOTA_LENTO} />
      <circle cx="92" cy="40" r="2" fill="var(--logo-cyan)" opacity="0.5" className={FLOTA} />
    </svg>
  )
}

export function BasicoArt(props: SVGProps<SVGSVGElement>) {
  const id = useId()
  return (
    <svg viewBox="0 0 120 96" fill="none" aria-hidden {...props}>
      <Degradados id={id} />
      <path d="M20 78h80" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
      <rect x="30" y="54" width="14" height="24" rx="4" fill="var(--border)" />
      <rect x="52" y="42" width="14" height="36" rx="4" fill={`url(#${id}-bt)`} />
      <rect x="74" y="30" width="14" height="48" rx="4" fill={`url(#${id}-bi)`} />
      <path
        className={DIBUJO}
        d="M30 50l22-8 22-10"
        stroke="var(--logo-blue)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className={FLOTA} style={{ transformOrigin: '96px 24px' }}>
        <circle cx="96" cy="24" r="8" fill={`url(#${id}-cb)`} />
        <path d="M96 20v8M93 22.5h6" stroke="var(--card)" strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <circle cx="24" cy="34" r="2.5" fill="var(--logo-teal)" opacity="0.5" className={FLOTA_LENTO} />
      <circle cx="42" cy="24" r="2" fill="var(--logo-indigo)" opacity="0.4" className={FLOTA} />
    </svg>
  )
}

export function ProArt(props: SVGProps<SVGSVGElement>) {
  const id = useId()
  return (
    <svg viewBox="0 0 120 96" fill="none" aria-hidden {...props}>
      <Degradados id={id} />
      <ellipse
        cx="60"
        cy="48"
        rx="42"
        ry="26"
        stroke="var(--logo-blue)"
        strokeOpacity="0.2"
        strokeWidth="1.5"
        strokeDasharray="3 5"
      />
      <path
        d="M60 48L24 34M60 48l40-6M60 48L30 68M60 48l38 16"
        stroke="var(--logo-blue)"
        strokeOpacity="0.3"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <g className={ORBITA} style={{ transformOrigin: '60px 48px' }}>
        <circle cx="24" cy="34" r="5" fill={`url(#${id}-bt)`} />
        <circle cx="100" cy="42" r="5" fill={`url(#${id}-bi)`} />
        <circle cx="30" cy="68" r="4" fill={`url(#${id}-cb)`} />
        <circle cx="98" cy="64" r="4" fill="var(--logo-indigo)" />
      </g>
      {/* Numi en el centro: es el único plan que trae la IA con llave propia. */}
      <g className={FLOTA} style={{ transformOrigin: '60px 48px' }}>
        <circle cx="60" cy="48" r="16" fill={`url(#${id}-bi)`} />
        <circle cx="55" cy="46" r="2.4" fill="var(--card)" />
        <circle cx="65" cy="46" r="2.4" fill="var(--card)" />
        <path d="M55 53c2 2.5 8 2.5 10 0" stroke="var(--card)" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M78 30l1.4 3.2L82.6 34.6 79.4 36 78 39.2 76.6 36 73.4 34.6 76.6 33.2 78 30Z"
          fill="var(--logo-cyan)"
        />
      </g>
    </svg>
  )
}
