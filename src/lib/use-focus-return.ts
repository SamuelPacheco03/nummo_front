import { useCallback } from 'react'

/**
 * Último elemento enfocado **fuera** de un diálogo.
 *
 * No basta con mirar `document.activeElement` cuando el panel se monta: un
 * campo con `autoFocus` dentro —la paleta de comandos lo tiene— ya se ha
 * llevado el foco para entonces, y lo que se apuntaría sería el propio campo
 * que está a punto de desaparecer. Con el rastro se sabe siempre de dónde
 * venía, lo abriera un clic o un atajo de teclado.
 */
let ultimoFuera: HTMLElement | null = null

/*
  Se engancha **al cargar el módulo**, no dentro del hook: el hook vive en el
  contenido del diálogo, que solo existe mientras está abierto, así que instalar
  ahí el escucha llegaba tarde para el primero que se abriera — justo el caso de
  la paleta de comandos, que se abre con `⌘K` sin tocar nada antes.
*/
if (typeof document !== 'undefined') {
  document.addEventListener(
    'focusin',
    (event) => {
      const el = event.target as HTMLElement | null
      if (!el || typeof el.closest !== 'function') return
      if (el.closest('[role="dialog"]')) return
      ultimoFuera = el
    },
    true,
  )
}

/**
 * **Devolver el foco a donde estaba** al cerrar un diálogo o un cajón.
 *
 * Radix lo hace solo… salvo aquí: medido en el navegador, al cerrar cualquiera
 * de los dos —con Escape o con la X— el foco se quedaba en `<body>`, y el
 * siguiente Tab caía en «Nummo — ir al panel», el primer elemento de la página.
 * Quien abre los filtros con el teclado y los cierra volvía al principio de la
 * app y tenía que recorrer la barra lateral entera otra vez (§46).
 *
 * Se resuelve donde se puede resolver una vez: en las dos envolturas de la app
 * —`Drawer` y `DialogContent`—, que son por donde pasa todo lo que se abre
 * encima.
 *
 * Solo se toca el cierre: la entrada del foco al panel la hace Radix bien, y
 * el destino de vuelta lo da el rastro, sin depender de cuándo se monte nada.
 */
export function useFocusReturn() {
  const onCloseAutoFocus = useCallback((event: Event) => {
    const destino = ultimoFuera
    // `isConnected`: si quien abrió el cajón ya no está en la página —una fila
    // que se borró, un botón que dejó de existir— devolverle el foco no llevaría
    // a ninguna parte, y es mejor dejar que Radix haga lo suyo.
    if (!destino?.isConnected) return
    event.preventDefault()
    destino.focus()
  }, [])

  return { onCloseAutoFocus }
}
