# Handoff — Fase 0 (backend → frontend)

Para el chat que construye **`nummo_front`**. Resume qué dejó lista la Fase 0 del backend y cómo conectarse.

## Contrato disponible

- **OpenAPI:** `GET http://localhost:4010/openapi.json` (o el archivo versionado `nummo-api/openapi.json`).
- **Docs interactivas:** `http://localhost:4010/docs` (Scalar).
- Endpoint de esta fase: `GET /health` → `{ status: 'ok', db: 'up'|'down', uptimeSeconds, timestamp, version }`.

## Cómo generar el cliente tipado

Configura **Orval** (modo TanStack Query) apuntando a `../nummo-api/openapi.json` o a `http://localhost:4010/openapi.json`. Regenera con `pnpm api:gen` tras cada nuevo handoff. La salida va a `src/api/` (no editar a mano).

## Convenciones que el front debe respetar

- **Base URL:** `/api/v1` para módulos (health es `/health`). En dev, **proxy de Vite** `'/api' → http://localhost:4010` y `'/health'`, `'/openapi.json'`, `'/docs'` según necesites, para mantener **mismo origen** (cookies + CSRF).
- **Auth (desde Fase 1):** cookies `HttpOnly` — el cliente HTTP usa `credentials: 'include'`; las mutaciones envían el header CSRF (double-submit). Detalle en Fase 1.
- **Errores:** forma consistente `{ error: { code, message, details?, requestId } }`. Códigos: `VALIDATION`, `NOT_FOUND`, `CONFLICT`, `UNAUTHENTICATED`, `FORBIDDEN`, `IDEMPOTENCY_REPLAY`, `RATE_LIMITED`, `INTERNAL`.
- **Dinero:** llega como **string decimal** (ej. `"550000.00"`); nunca calcular saldos como fuente de verdad en el front.
- **Fechas:** ISO 8601. `date` (vencimientos) vs `timestamptz` (eventos).
- **Paginación:** server-side (`page`, `pageSize`, máx. 100) en listados (desde Fase 2).
- **Header de traza:** las respuestas incluyen `x-request-id` (útil para soporte).

## Design tokens (marca Nummo)

Mapear a tokens **semánticos** (no "blue-500" como significado). Tema Light/Dark/System con CSS variables.

| Token                           | Color                 |
| ------------------------------- | --------------------- |
| primary (navy) / primary-action | `#1E293B` / `#2563EB` |
| accent / success                | `#10B981`             |
| chart-alt                       | `#8B5CF6`             |
| background                      | `#F8FAFC`             |
| border                          | `#E2E8F0`             |
| destructive                     | rojo estándar         |

Tipografía: **Sora** (títulos) + **Inter** (cuerpo). **Mobile-first** obligatorio (baseline 360–390 px). Tablas → cards en móvil.

## Stack acordado (front)

React 19.2 · Vite 8.1 · React Router 8 · Tailwind 4.2 · shadcn/ui (CLI v4) · TanStack Query v5 · TanStack Table v9 · Zustand (solo UI) · React Hook Form · Zod 4 · Sonner · Orval.
