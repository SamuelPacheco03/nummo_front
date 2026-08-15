import { defineConfig } from 'orval'

// Genera cliente tipado + hooks de TanStack Query desde el contrato OpenAPI.
// Fuente de verdad: ./contract/openapi.json (copiar el nuevo al cerrar cada fase).
// Salida en src/api/generated/** — NO editar a mano; regenerar con `pnpm api:gen`.
export default defineConfig({
  nummo: {
    input: {
      target: './contract/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated/endpoints',
      schemas: './src/api/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      biome: false,
      prettier: false,
      override: {
        mutator: {
          path: './src/api/http-client.ts',
          name: 'customFetch',
        },
        query: {
          signal: true,
        },
      },
    },
  },
})
