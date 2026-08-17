import { ScrollRestoration, type UIMatch } from 'react-router'

/** Lo pone el router en las rutas que se dibujan **encima** de su padre. */
const isOverlay = (match: UIMatch) => (match.handle as { overlay?: boolean } | undefined)?.overlay

/**
 * **Cada pantalla empieza por arriba.**
 *
 * El problema: bajabas en una lista larga, cambiabas de sección y aparecías al
 * final de la nueva, mirando el pie de una página cuyo título no habías visto.
 * Un `useEffect` con `scrollTo(0, 0)` por cada cambio de `pathname` lo arregla a
 * medias y rompe dos cosas: al volver atrás pierdes el sitio donde estabas, y al
 * abrir un cajón sobre una lista —que también cambia la URL— la lista de detrás
 * salta al principio, que es justo lo que §87.5 quiere evitar.
 *
 * `ScrollRestoration` de React Router lo hace bien porque guarda la posición por
 * clave: **destino nuevo → arriba; volver atrás → donde estabas**. Lo único que
 * hay que decirle es qué cuenta como pantalla, y eso lo resuelve `getKey`
 * quedándose con la coincidencia más profunda que **no** sea una capa: así
 * `/cartera/cxc` y `/cartera/cxc/abc` comparten clave y abrir la ficha no mueve
 * nada de lo que hay detrás.
 */
export function PageScrollRestoration() {
  return (
    <ScrollRestoration
      getKey={(location, matches) =>
        [...matches].reverse().find((m) => !isOverlay(m))?.pathname ?? location.pathname
      }
    />
  )
}
