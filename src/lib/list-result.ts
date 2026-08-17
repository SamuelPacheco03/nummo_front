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
