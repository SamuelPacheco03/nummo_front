/**
 * Lógica de filtros de listado, sin React ni router.
 *
 * Vive aparte del hook para poder probar la parte difícil —la precedencia entre
 * la URL y lo guardado— sin montar un router (§66, §92.2).
 */

export type FilterValues = Record<string, string>

/**
 * Toma de los parámetros SOLO las claves de esta lista.
 *
 * Es lo que permite que una pantalla comparta la URL con otros parámetros
 * (`?nueva=1`, anclas, utm…) sin que el filtro los pise ni los herede.
 */
export function readFromParams(params: URLSearchParams, keys: readonly string[]): FilterValues {
  const values: FilterValues = {}
  for (const key of keys) {
    const value = params.get(key)
    if (value) values[key] = value
  }
  return values
}

/** ¿Hay algún criterio puesto? Un valor vacío no cuenta como filtro. */
export function hasAnyFilter(values: FilterValues): boolean {
  return Object.values(values).some((v) => v !== '')
}

/**
 * Vuelca los valores sobre unos parámetros existentes.
 *
 * Las claves vacías se **borran** en vez de escribirse como `?estado=`: una URL
 * con parámetros vacíos es ruido, y al compartirla no dice nada distinto de no
 * llevarlos.
 */
export function writeToParams(
  params: URLSearchParams,
  values: FilterValues,
  keys: readonly string[],
): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const key of keys) {
    const value = values[key]
    if (value) next.set(key, value)
    else next.delete(key)
  }
  return next
}

/**
 * Lee lo guardado en la sesión, ignorando lo que no reconozca.
 *
 * Tolera JSON corrupto y claves que ya no existen: `sessionStorage` sobrevive a
 * despliegues, así que puede traer la forma de una versión anterior de la
 * pantalla y eso no puede tumbar la lista.
 */
export function readStored(raw: string | null, keys: readonly string[]): FilterValues {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const values: FilterValues = {}
    for (const key of keys) {
      const value = (parsed as Record<string, unknown>)[key]
      if (typeof value === 'string' && value !== '') values[key] = value
    }
    return values
  } catch {
    return {}
  }
}

/**
 * Qué filtros gobiernan al entrar en la pantalla.
 *
 * La regla, en una línea: **la URL manda si dice algo**.
 *
 * - Si trae criterios, es un enlace deliberado —alguien lo compartió, o es el
 *   botón «atrás»— y lo guardado no debe pisarlo.
 * - Si no trae ninguno, se recupera la última búsqueda de la sesión. `restored`
 *   avisa de que hay que escribirla en la URL, para que lo que se ve y lo que
 *   dice la barra de direcciones no cuenten cosas distintas.
 */
export function resolveInitial(
  fromUrl: FilterValues,
  fromStorage: FilterValues,
): { values: FilterValues; restored: boolean } {
  if (hasAnyFilter(fromUrl)) return { values: fromUrl, restored: false }
  if (hasAnyFilter(fromStorage)) return { values: fromStorage, restored: true }
  return { values: {}, restored: false }
}
