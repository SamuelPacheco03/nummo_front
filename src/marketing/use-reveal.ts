import { useEffect, useRef } from 'react'

/**
 * Marca un elemento cuando entra en pantalla, para que el CSS lo revele.
 *
 * El estado vive en un atributo y no en `useState` a propósito: revelar es un efecto
 * visual de una sola dirección, y pasarlo por React haría re-renderizar una sección entera
 * —con su gráfico y sus filas— para cambiar una opacidad.
 *
 * Se desconecta al primer cruce: lo que ya se reveló no se vuelve a esconder al subir.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(margen = '0px 0px -12% 0px') {
  const ref = useRef<T>(null)

  useEffect(() => {
    const nodo = ref.current
    if (!nodo) return

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return
        nodo.setAttribute('data-revelado', '')
        observador.disconnect()
      },
      { rootMargin: margen, threshold: 0.1 },
    )
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [margen])

  return ref
}
