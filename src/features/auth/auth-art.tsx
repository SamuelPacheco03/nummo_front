import { useId, type SVGProps } from 'react'

/**
 * La figura del panel de acceso.
 *
 * Se eligió mirando, entre tres dibujadas a la vez: el ciclo del cobro pedía que lo leyeras
 * —y un login se mira medio segundo— y el isotipo en grande tenía presencia pero no decía
 * nada del producto. Las dos descartadas se borraron con el conmutador que las comparaba.
 *
 * Comparte vocabulario con las ilustraciones de los planes: geométrica y con los colores del
 * isotipo (`--logo-*`), que no se re-tematizan (§3.2), así que se ve igual en claro y en
 * oscuro. Los `id` de los degradados se generan con `useId`: son globales al documento.
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
