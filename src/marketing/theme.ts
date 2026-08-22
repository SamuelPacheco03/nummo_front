import { PALETTES, paletteById, type PaletteId } from '@/lib/palette/palettes'

/**
 * La candidata con la que se pinta la portada. Cambiarla es cambiar esta línea.
 *
 * Vive aquí y no en `landing-page.tsx` porque un archivo que exporta componentes **y**
 * constantes rompe el refresco rápido de Vite: al tocar el componente, la constante se
 * reevalúa y el módulo entero se recarga.
 */
export const PALETA_PORTADA = 'azul' as const

/**
 * El color de la barra del navegador, sacado de la paleta y no escrito a mano.
 *
 * Es el fondo de la portada en cada modo. Antes vivía como literal dentro de
 * `theme-provider.tsx` y solo conocía el azul de la consola, con lo que la barra salía
 * azul sobre una página crema.
 */
export const TEMA_PORTADA = {
  light: paletteById(PALETA_PORTADA).light.surface,
  dark: paletteById(PALETA_PORTADA).dark.surface,
} as const

/**
 * La paleta con la que pintar **esta** carga de la portada.
 *
 * En desarrollo se puede pedir otra por la URL —`?paleta=bruma`— y así se compara la
 * portada **entera** en otra candidata sin tocar código ni reconstruir. El laboratorio
 * enseña las tres a la vez, pero solo sobre el hero y unas superficies de consola; hay
 * decisiones —cómo cae el crema tras la banda oscura, si el durazno cansa después de
 * bajar cinco secciones— que solo se ven en la página de verdad.
 *
 * **Solo en desarrollo.** En producción la portada tiene una paleta, no un selector: un
 * parámetro que repinta el sitio es una herramienta, y las herramientas no se publican.
 */
export function paletaDeEstaCarga(): PaletteId {
  if (!import.meta.env.DEV || typeof window === 'undefined') return PALETA_PORTADA

  const pedida = new URLSearchParams(window.location.search).get('paleta')
  const existe = PALETTES.some((p) => p.id === pedida)
  return existe ? (pedida as PaletteId) : PALETA_PORTADA
}

/** Las candidatas, para ofrecerlas en el conmutador de desarrollo. */
export const CANDIDATAS = PALETTES.map((p) => ({ id: p.id, name: p.name, note: p.note }))

export type ModoForzado = 'light' | 'dark'

/**
 * El modo que pide la URL —`?modo=claro`— o `null` si manda el sistema.
 *
 * La portada no tiene interruptor de tema: sigue al del sistema, como la consola. Eso está
 * bien para quien la visita y es un estorbo para quien la está diseñando, porque para ver
 * el otro modo hay que cambiar el tema del sistema operativo entero.
 *
 * **Solo en desarrollo**, por lo mismo que la paleta: en producción la portada no lleva un
 * selector de tema. Si algún día se decide que sí, eso es una decisión de producto y va en
 * la barra, no en un parámetro.
 */
export function modoDeEstaCarga(): ModoForzado | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null

  const pedido = new URLSearchParams(window.location.search).get('modo')
  if (pedido === 'claro' || pedido === 'light') return 'light'
  if (pedido === 'oscuro' || pedido === 'dark') return 'dark'
  return null
}
