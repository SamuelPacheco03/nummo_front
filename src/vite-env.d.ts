/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL del API en runtime. Vacío = mismo origen (dev usa el proxy de Vite).
   * API en otro dominio: `https://api.tudominio.com`.
   */
  readonly VITE_API_BASE_URL?: string
  /** Solo DEV: destino del proxy de Vite para /api, /health, /openapi.json, /docs. */
  readonly VITE_API_PROXY_TARGET?: string
  /** 'true' muestra el botón de credenciales demo en el login. En producción no se define → oculto. */
  readonly VITE_DEMO_LOGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
