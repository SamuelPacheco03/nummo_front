type Navigate = (to: string) => void

let navigate: Navigate | null = null

/**
 * Registra el navegador del router para que se pueda usar **desde fuera de
 * React**.
 *
 * Hace falta porque el `Toaster` se monta en `providers.tsx`, por encima del
 * `RouterProvider`: un `<Link>` dentro de un aviso no tendría router del que
 * colgar. Y llamar al router directamente desde un módulo suelto crearía un
 * ciclo de imports —`router.tsx` monta el shell, y el shell acaba importando
 * quien avisa—.
 *
 * Mismo patrón que `setUnauthorizedHandler` (`api/http-client.ts`), y por el
 * mismo motivo: quien sabe navegar vive dentro del árbol, quien lo necesita no.
 */
export function setAppNavigate(fn: Navigate | null): void {
  navigate = fn
}

/**
 * Navega dentro de la aplicación desde donde no hay hooks.
 *
 * Sin nadie registrado cae a una navegación del navegador: recarga, que es peor,
 * pero **un botón que no hace nada es mucho peor**.
 */
export function navigateApp(to: string): void {
  if (navigate) {
    navigate(to)
    return
  }
  globalThis.location?.assign(to)
}
