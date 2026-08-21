import { paletteById } from '@/lib/palette/palettes'

/**
 * La candidata con la que se pinta la portada. Cambiarla es cambiar esta línea.
 *
 * Vive aquí y no en `landing-page.tsx` porque un archivo que exporta componentes **y**
 * constantes rompe el refresco rápido de Vite: al tocar el componente, la constante se
 * reevalúa y el módulo entero se recarga.
 */
export const PALETA_PORTADA = 'bosque' as const

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
