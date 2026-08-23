import { useEffect, useRef } from 'react'

/**
 * Rellena un formulario con lo que llega del servidor **una sola vez por
 * registro**.
 *
 * El patrón sin esto es `useEffect(() => reset(toForm(x)), [x, reset])`, y tiene
 * un fallo que no se ve leyéndolo: `x` no cambia solo cuando se abre otro
 * registro, sino **cada vez que la consulta trae datos nuevos**. Si alguien
 * edita ese mismo registro desde otro sitio, o si algo invalida la caché
 * mientras se está escribiendo, el efecto se vuelve a disparar y el formulario
 * se rellena de nuevo: lo escrito desaparece sin decir nada.
 *
 * Con la clave del registro delante, rellenar deja de depender de la identidad
 * del objeto —que además no es estable si el hook lo reconstruye por render, y
 * ahí el efecto entra en bucle—.
 *
 * **Cuando la pantalla se queda tras guardar** (no navega a otro sitio), hay que
 * volver a marcarla limpia a mano con lo que se guardó: aquí ya no va a
 * refrescarse sola.
 *
 * La clave la pone quien llama y no se saca del registro: no todo lo que se
 * edita tiene `id` —los ajustes de la organización van por `organizationId`— y
 * adivinarlo obligaría a moldear las formas que no encajan.
 *
 * De ahí que **la clave suela estar lista antes que el registro**: el
 * `organizationId` ya se conoce mientras la consulta que trae los ajustes
 * todavía va en camino —de hecho esa consulta no arranca hasta tenerlo—. Por eso
 * en las dependencias va también «¿hay registro ya?»: sin eso el efecto se
 * gastaba su único disparo en vacío, no volvía a correr porque la clave no
 * cambia, y el formulario se quedaba con sus valores por defecto enseñando lo
 * guardado como si nadie lo hubiera configurado.
 *
 * @example
 * useHydrateOnce(contact?.id, contact, (c) => reset(toForm(c)))
 */
export function useHydrateOnce<T>(
  key: string | undefined,
  record: T | undefined,
  hydrate: (record: T) => void,
): void {
  // El callback se lee del ref para no meterlo en las dependencias: llega como
  // una función nueva en cada render y volvería a disparar el efecto siempre.
  const latest = useRef(hydrate)
  latest.current = hydrate

  const hydratedFor = useRef<string | null>(null)

  useEffect(() => {
    if (key === undefined || record === undefined || hydratedFor.current === key) return
    hydratedFor.current = key
    latest.current(record)
    // `record` fuera de las dependencias a propósito: es justo su identidad la
    // que no debe mandar aquí. Lo que decide es la clave y si el registro ya
    // llegó —un booleano que pasa de `true` a `false` una sola vez—, nunca de
    // qué objeto se trata. Un refetch no lo mueve, y si llegara a moverlo el
    // guardado de arriba lo para igual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, record === undefined])
}
