/**
 * Configuración de red del cliente.
 *
 * `VITE_API_BASE_URL` es la base sobre la que se construyen las rutas del API
 * en runtime:
 *  - Vacío (default) = MISMO ORIGEN. En dev, el proxy de Vite reenvía /api, /health…
 *    al backend; en prod, sirve cuando el front y el API comparten dominio.
 *  - Con valor (p. ej. `https://api.tudominio.com`) = el API vive en otro dominio.
 *    Requiere que el backend habilite CORS con credenciales y cookies SameSite=None.
 *
 * Es una variable de BUILD: Vite la hornea en el bundle (prefijo `VITE_`), así que
 * NO es un secreto. Se define en `.env` / `.env.local` o como env var del despliegue.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

/** Antepone la base URL a una ruta del API (`/api/v1/...`, `/health`). */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}
