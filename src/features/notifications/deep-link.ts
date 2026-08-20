/**
 * **A dónde lleva una notificación.**
 *
 * El `deepLink` lo compone el backend a partir de un catálogo cerrado
 * (`deep-link.ts` allí), y ese catálogo usa un vocabulario de rutas que no es el
 * de esta aplicación: pulsar un aviso llevaba a `/cartera/cobros/:id`, que aquí
 * no existe, y la pantalla era un 404.
 *
 * **Esto es un puente, no la solución.** Lo correcto es que el backend componga
 * las rutas que el router tiene, y así está pedido (§95.16): una tabla de
 * traducción en el cliente es una segunda fuente de verdad para las rutas, que
 * §87.5 declara en un solo sitio. Vive aquí mientras tanto porque la alternativa
 * es que el centro de notificaciones no lleve a ninguna parte.
 *
 * Está escrito para **retirarse solo**: lo que no reconoce pasa tal cual, así que
 * el día que el backend publique las rutas de verdad ninguna regla casa, todo
 * sigue funcionando y este archivo se borra de una pieza.
 */

/**
 * De lo que manda el contrato a lo que existe aquí. El orden importa: las de más
 * arriba son más específicas que las de más abajo.
 *
 * Las claves de los filtros van **en español** y son las de `useListFilters`
 * (§21.1), no el `filter=` del backend.
 */
const REWRITES: [RegExp, string][] = [
  // Cartera: la lista es `/cartera/cxc`; `/cartera` a secas no es una ruta.
  [/^\/cartera\/cobros\/([^/?#]+)$/, '/cartera/cxc/$1'],
  [/^\/cartera\?filter=vencidos$/, '/cartera/cxc?estado=OVERDUE'],
  [/^\/cartera$/, '/cartera/cxc'],
  [/^\/pagos\/([^/?#]+)$/, '/cartera/pagos/$1'],

  // Gastos, el espejo del anterior.
  [/^\/gastos\/cuentas\/([^/?#]+)$/, '/gastos/cxp/$1'],
  [/^\/gastos\?filter=vencidos$/, '/gastos/cxp?estado=OVERDUE'],
  [/^\/gastos$/, '/gastos/cxp'],
  /*
    `?action=approve` se cae: aprobar y rechazar están en la propia ficha (§47.4),
    así que el destino es el mismo y un parámetro que nadie lee solo ensucia la
    URL que luego se comparte.
  */
  [/^\/egresos\/([^/?#]+)(?:\?action=approve)?$/, '/gastos/egresos/$1'],

  // Caja no tiene ficha por cuenta: es un resumen de saldos (§18.1).
  [/^\/caja\/cuentas\/[^/?#]+$/, '/caja/cuentas'],

  [/^\/configuracion\/miembros$/, '/config/miembros'],
]

/**
 * La ruta interna de un aviso, o `null` si no lleva a ninguna parte.
 *
 * **Solo rutas internas.** El destino llega por la red, y `//otro.sitio` es una
 * URL absoluta disfrazada de ruta; es la misma comprobación que hace `returnPath`
 * (§87.5).
 */
export function notificationRoute(link: string | null | undefined): string | null {
  if (!link || !link.startsWith('/') || link.startsWith('//')) return null
  const rule = REWRITES.find(([pattern]) => pattern.test(link))
  return rule ? link.replace(rule[0], rule[1]) : link
}
