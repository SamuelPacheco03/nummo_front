import { useEffect, useRef } from 'react'
import type { LandingEventInput } from '@/api/generated/model'
import type { Cola } from './signals'

/** Los nombres de sección que el contrato acepta. Sale de la unión, no de una copia. */
export type SeccionMedible = Extract<LandingEventInput, { name: 'section_viewed' }>['section']

/**
 * Anota que una sección entró en pantalla, **una sola vez por visita**.
 *
 * El servidor deduplica por sesión, así que reenviar no ensucia los datos — pero sí gasta
 * lotes: sin el `desconectar` de aquí, subir y bajar por la página llenaría la cola de
 * eventos que el servidor va a descartar de todas formas.
 *
 * El umbral es 0.4 y no 0: una sección «vista» al asomar un píxel diría que todo el mundo
 * ve todo, que es la forma más rápida de que un embudo deje de significar nada.
 */
export function useSectionViewed(cola: Cola | null, section: SeccionMedible) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const nodo = ref.current
    if (!nodo || !cola) return

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return
        cola.encolar({ name: 'section_viewed', section })
        observador.disconnect()
      },
      { threshold: 0.4 },
    )
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [cola, section])

  return ref
}
