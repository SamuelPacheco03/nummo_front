/**
 * Las URL de la consola, en un solo sitio.
 *
 * La portada y la app son **dos entradas distintas** (§97.11): la portada vive en la raíz
 * y la consola cuelga de `/app`. Un enlace de la portada a la app no puede ir por el
 * router —son dos routers— así que es un ancla de verdad, y una ruta escrita a mano.
 *
 * Están aquí y no repartidas por las secciones porque ya pasó una vez: la Fase 2 las
 * escribió seis veces en cinco archivos, y cuando la consola se mudó a `/app` había que
 * acordarse de las seis. La próxima mudanza es una línea.
 */

/** Prefijo de la consola. Cambiarlo aquí mueve todos los enlaces de la portada. */
const APP = '/app'

export const rutasApp = {
  registro: `${APP}/register`,
  ingreso: `${APP}/login`,
  raiz: `${APP}/`,
} as const
