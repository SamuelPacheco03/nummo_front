import type { To } from 'react-router'

/**
 * La ruta a la que navegó una pantalla, **con sus criterios**.
 *
 * Un listado no navega a su ficha con una cadena sino con `{pathname, search}`:
 * los filtros viven en la URL y la ficha es una ruta hija que se abre **sobre la
 * lista montada** (§21.1). Los tests afirman sobre la ruta entera, que es lo que
 * el usuario ve en la barra de direcciones y lo que decide qué enseña la lista
 * al cerrar el cajón.
 */
export function routeOf(to: To | undefined): string {
  if (to === undefined) return ''
  return typeof to === 'string' ? to : `${to.pathname ?? ''}${to.search ?? ''}`
}

declare global {
  interface Window {
    /** Última ruta a la que se pidió navegar, tal cual la recibió el router. */
    __ultimaRuta?: To
    __listaVacia?: boolean
    __listaFalla?: boolean
  }
}
