/**
 * Lo que devuelve un hook de listado paginado, ya desenvuelto.
 *
 * Vive en `lib/` porque **no tiene dominio**: lo cumplen los diez listados de la
 * app, y ponerlo en una feature obligaba a `lib/` a importar de `features/`, que
 * es justo lo que §87.2 prohíbe. Estuvo un tiempo en `features/masters/` por
 * accidente histórico —el primero que lo necesitó fue un maestro—.
 *
 * `error` va como `unknown`: quien lo pinta lo pasa por `getErrorMessage`, que
 * es el único sitio que sabe interpretar un error del API (§88).
 */
export interface ListResult<T> {
  items: T[]
  total: number
  totalPages: number
  isPending: boolean
  isError: boolean
  error: unknown
  isFetching: boolean
}

/**
 * Lee una respuesta del API que **debe ser una lista**, sin fiarse.
 *
 * `(query.data?.data ?? []) as T[]` solo cubre `undefined`: cualquier otra cosa
 * —un error servido como 200, un backend a medio desplegar, un endpoint que
 * cambia de forma— atraviesa el cast y revienta en el primer `.map()`, y se
 * lleva la pantalla entera por delante.
 *
 * Aquí se comprueba de verdad. Una lista que no llega se queda vacía, que es un
 * estado que las pantallas ya saben pintar (§45); una pantalla en blanco, no.
 */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}
