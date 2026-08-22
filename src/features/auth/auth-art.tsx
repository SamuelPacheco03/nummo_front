import { useId, type SVGProps } from 'react'
import { BrandMark } from '@/components/brand-mark'

/**
 * Las tres figuras candidatas para el panel del acceso.
 *
 * Existen a la vez para poder **elegir mirando** y no leyendo una descripción: es una
 * decisión visual, y las visuales se deciden en pantalla. Cuando haya una elegida, las
 * otras dos se borran — igual que pasó con las paletas.
 *
 * Comparten vocabulario con las ilustraciones de los planes: geométricas y con los colores
 * del isotipo (`--logo-*`), que no se re-tematizan (§3.2). Así las tres son de la misma
 * familia y la comparación es entre ideas, no entre estilos.
 *
 * Los `id` de los degradados se generan con `useId`: son globales al documento.
 */

function Degradados({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="var(--logo-teal)" />
        <stop offset="1" stopColor="var(--logo-blue)" />
      </linearGradient>
      <linearGradient id={`${id}-b`} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="var(--logo-cyan)" />
        <stop offset="1" stopColor="var(--logo-indigo)" />
      </linearGradient>
    </defs>
  )
}

/**
 * **Lo disperso que se ordena.**
 *
 * Las piezas entran torcidas y apagadas por arriba y salen alineadas y encendidas por
 * abajo. Dice lo mismo que el titular —«Todo en orden»— en vez de hablar de otra cosa al
 * lado de él, y rima con la sección «El desorden cuesta» de la portada sin repetirla.
 */
export function OrdenArt(props: SVGProps<SVGSVGElement>) {
  const id = useId()
  /* De arriba abajo: la rotación se va a cero y la opacidad sube. El orden apareciendo. */
  const piezas = [
    { x: 26, y: 18, w: 68, rot: -14, op: 0.28 },
    { x: 62, y: 44, w: 84, rot: 9, op: 0.4 },
    { x: 34, y: 74, w: 74, rot: -6, op: 0.55 },
    { x: 52, y: 104, w: 96, rot: 3, op: 0.75 },
  ]

  return (
    <svg viewBox="0 0 220 200" fill="none" aria-hidden {...props}>
      <Degradados id={id} />

      {piezas.map((p, i) => (
        <rect
          key={i}
          x={p.x}
          y={p.y}
          width={p.w}
          height="14"
          rx="7"
          fill="var(--sidebar-foreground)"
          opacity={p.op * 0.35}
          transform={`rotate(${p.rot} ${p.x + p.w / 2} ${p.y + 7})`}
        />
      ))}

      {/* Ya ordenadas: alineadas al mismo eje, del mismo largo y con el gradiente. */}
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x="52"
          y={136 + i * 22}
          width="116"
          height="14"
          rx="7"
          fill={`url(#${id}-${i === 0 ? 'a' : 'b'})`}
          opacity={1 - i * 0.18}
        />
      ))}

      {/* El eje al que se alinean. Es lo que hace legible que ANTES no lo estaban. */}
      <path
        d="M52 130v66"
        stroke="var(--logo-cyan)"
        strokeOpacity="0.5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * **El ciclo del cobro.**
 *
 * Tres momentos en órbita: se crea el cobro, se recuerda, entra el pago. Es literalmente lo
 * que hace el producto — y por eso mismo pide que lo leas, que es lo que un login no da
 * tiempo a hacer.
 */
export function CicloArt(props: SVGProps<SVGSVGElement>) {
  const id = useId()
  return (
    <svg viewBox="0 0 220 200" fill="none" aria-hidden {...props}>
      <Degradados id={id} />

      <circle
        cx="110"
        cy="100"
        r="66"
        stroke="var(--sidebar-foreground)"
        strokeOpacity="0.18"
        strokeWidth="1.5"
        strokeDasharray="4 7"
      />

      {/* Los tres momentos, a 120º. El que cierra el ciclo va encendido. */}
      <g>
        <circle cx="110" cy="34" r="17" fill={`url(#${id}-a)`} />
        <path d="M104 30h12M104 36h8" stroke="var(--card)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g>
        <circle cx="167" cy="133" r="17" fill={`url(#${id}-b)`} />
        <path
          d="M162 130a5 5 0 0 1 10 0c0 5 2 6 2 6h-14s2-1 2-6Zm3 9a2.5 2.5 0 0 0 4 0"
          stroke="var(--card)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </g>
      <g>
        <circle cx="53" cy="133" r="17" fill="var(--logo-teal)" />
        <path d="M47 133l4.5 4.5L60 129" stroke="var(--card)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* La flecha que cierra: el ciclo vuelve a empezar. */}
      <path
        d="M132 43a66 66 0 0 1 30 62"
        stroke="var(--logo-cyan)"
        strokeOpacity="0.6"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * **El isotipo, en grande.**
 *
 * Lo que hacen Linear o Stripe: la marca ocupando el sitio, sin metáfora. Es la que menos
 * puede envejecer mal y la que menos dice sobre qué hace el producto.
 */
export function IsotipoArt({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="relative grid h-full w-full place-items-center">
        {/* Un halo del color de marca, para que no flote sobre el vacío. */}
        <div
          className="absolute size-56 rounded-full blur-3xl"
          style={{ background: 'var(--logo-blue)', opacity: 0.22 }}
          aria-hidden
        />
        <BrandMark className="relative size-40" />
      </div>
    </div>
  )
}
