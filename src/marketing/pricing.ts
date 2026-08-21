import type { PricingLimit, PricingPlan, PricingPrice } from '@/api/generated/model'
import { formatMoney } from '@/lib/format'

/**
 * Las reglas del contrato de precios que la pantalla tiene que reflejar, aparte para que
 * se puedan probar sin montar nada (`contract/HANDOFF-landing.md`).
 */

/**
 * Cómo se lee un precio.
 *
 * **`null` NO es gratis: es «consultar».** El plan gratuito trae `"0.00"`, que es un
 * precio de verdad y se escribe «Gratis». Hoy solo FREE tiene precio publicado; Básico y
 * Pro llegan en `null` hasta que alguien los fije desde la consola de plataforma, y la
 * sección tiene que pintar eso sin que parezca un error ni un cero.
 */
export function leerPrecio(price: PricingPrice): { texto: string; consultar: boolean } {
  if (!price) return { texto: 'A consultar', consultar: true }
  if (Number(price.amount) === 0) return { texto: 'Gratis', consultar: false }
  /* El dinero llega como string decimal y `Number()` solo se usa para presentar (§9). */
  return { texto: formatMoney(price.amount, price.currency), consultar: false }
}

/**
 * Cómo se lee un tope.
 *
 * **`null` es ilimitado; `0` es un tope real.** WhatsApp en el plan gratis viene a cero a
 * propósito, y confundirlo con «sin límite» anunciaría justo lo contrario de lo que hay.
 */
export function leerTope(limit: PricingLimit): string {
  if (limit.value === null) return 'Sin límite'
  const unidad = limit.unit ? ` ${limit.unit}` : ''
  return `${limit.value.toLocaleString('es-CO')}${unidad}`
}

/**
 * El orden en que se muestran los planes.
 *
 * Por precio ascendente, con los de «consultar» al final: son los que todavía no tienen
 * tarifa, y ponerlos entre medias rompería la lectura de menor a mayor que hace cualquiera
 * al mirar una tabla de precios.
 */
export function ordenarPlanes(planes: readonly PricingPlan[]): PricingPlan[] {
  return [...planes].sort((a, b) => {
    const pa = a.price ? Number(a.price.amount) : Number.POSITIVE_INFINITY
    const pb = b.price ? Number(b.price.amount) : Number.POSITIVE_INFINITY
    return pa - pb
  })
}

/**
 * Las claves de función que hay que enseñar, en el orden del primer plan que las trae.
 *
 * Las features llegan **sin filtrar**, con `included: true|false`, y eso es lo que permite
 * pintar la matriz comparativa: una fila ausente no dice «no lo tiene», dice «no se sabe».
 * Por eso la matriz se arma con la unión de todas las claves y no con las de un plan.
 */
export function clavesDeFunciones(planes: readonly PricingPlan[]): string[] {
  const vistas = new Map<string, string>()
  for (const plan of planes) {
    for (const f of plan.features) if (!vistas.has(f.key)) vistas.set(f.key, f.label)
  }
  return [...vistas.keys()]
}

/** La etiqueta publicada de una clave. Sale del backend: el front no inventa copy. */
export function etiquetaDeFuncion(planes: readonly PricingPlan[], key: string): string {
  for (const plan of planes) {
    const f = plan.features.find((x) => x.key === key)
    if (f) return f.label
  }
  return key
}

/** Si un plan incluye una función. `undefined` = el backend no la anuncia para ese plan. */
export function incluye(plan: PricingPlan, key: string): boolean | undefined {
  return plan.features.find((f) => f.key === key)?.included
}
