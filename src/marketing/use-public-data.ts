import { useCallback, useEffect, useState } from 'react'

/**
 * La lectura de datos de la portada, **sin TanStack Query**.
 *
 * La consola usa Query y hace bien: tiene decenas de lecturas que se invalidan entre sí.
 * La portada tiene **una**, los precios, y no invalida nada. Arrastrar la librería entera
 * —con su provider, su caché y su peso— por una sola lectura es justo lo que la Fase 3 va
 * a tener que deshacer cuando la portada se separe en su propia entrada.
 *
 * Orval genera, al lado de cada hook, la **función plana** que el hook envuelve. Esto se
 * apoya en esa función: el tipo sigue saliendo del contrato y lo único que se pierde es
 * la caché, que aquí no hace falta —el backend ya manda `Cache-Control: public, max-age=300`
 * y el navegador la respeta mejor que nosotros.
 */
export type Estado<T> =
  | { fase: 'cargando' }
  | { fase: 'listo'; datos: T }
  | { fase: 'error'; reintentar: () => void }

export function useRecursoPublico<T>(cargar: () => Promise<T>): Estado<T> {
  const [estado, setEstado] = useState<Estado<T>>({ fase: 'cargando' })
  const [intento, setIntento] = useState(0)

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])

  useEffect(() => {
    let vivo = true
    setEstado({ fase: 'cargando' })

    cargar()
      .then((datos) => {
        /* Si el componente ya no está, no se toca su estado: no hay a quién avisar. */
        if (vivo) setEstado({ fase: 'listo', datos })
      })
      .catch(() => {
        if (vivo) setEstado({ fase: 'error', reintentar })
      })

    return () => {
      vivo = false
    }
    /*
      `cargar` se deja fuera a propósito: llega como función nueva en cada render y
      meterla aquí volvería a pedir los datos en bucle. Lo que dispara una recarga es
      `intento`, que solo cambia cuando alguien pulsa «Reintentar».
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intento, reintentar])

  return estado
}
