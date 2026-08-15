# Nummo — Frontend (chat de arranque)

> Pega este archivo (o di "sigue START-HERE.md") en un **nuevo chat de Claude Code abierto en `C:\Dev\Projects\React\nummo_front`**. Es el chat dedicado al frontend; el backend se construye en un chat aparte sobre `C:\Dev\Projects\Node\nummo-api`.

## Contexto

**Nummo** es un sistema web genérico multiempresa/multisede de administración financiera y cartera (primer caso: jardín infantil). Trabajamos en **dos repos separados sincronizados por un contrato OpenAPI**. Tú construyes **este** repo (React). El **backend está COMPLETO (V1, Fases 0–8)**: auth + multi-tenancy, contactos/maestros, cartera con mora, pagos, gastos/egresos, caja/transferencias y reportes. Contrato congelado en **v1.0.0 (73 endpoints)**.

- **Backend:** `C:\Dev\Projects\Node\nummo-api`, corre en `http://localhost:4010` (`pnpm dev` allá; DB en Docker).
- **Contrato (fuente de verdad):** `./contract/openapi.json` (copiado aquí) y en vivo en `http://localhost:4010/openapi.json`. Regeneras tu cliente desde ahí.
- **Estado de sync:** lee **`./contract/SYNC-STATUS.md`** (resumen de todo lo disponible y qué falta).
- **Handoffs con endpoints/flujos/tokens:** `./contract/HANDOFF-fase-0.md` … `HANDOFF-fase-8.md`. **Léelos por área.**

## Stack (acordado, seguir tal cual)

React 19.2 · Vite 8.1 · TypeScript strict · React Router 8 (`react-router` + `react-router/dom`) · Tailwind CSS 4.2 · shadcn/ui (CLI v4) · TanStack Query v5 · TanStack Table v9 · Zustand (solo UI) · React Hook Form · Zod 4 · Sonner · **Orval** (genera cliente + hooks de TanStack Query desde `openapi.json`). Tests: Vitest + Testing Library, Playwright (e2e). pnpm vía corepack.

## Reglas no negociables (del doc del proyecto)

- **Mobile-first**: cada pantalla se diseña primero a 360–390 px; tablas → cards en móvil (TanStack Table headless). Probar 360/768/1024/1440.
- **Design tokens semánticos** (nada de "blue-500" como significado); tema **Light/Dark/System** con CSS variables. Paleta: primary `#1E293B`/`#2563EB`, accent/success `#10B981`, chart-alt `#8B5CF6`, background `#F8FAFC`, border `#E2E8F0`. Fuentes: **Sora** (títulos) + **Inter** (cuerpo).
- **TanStack Query** = estado del servidor (no copiar a Zustand). **useEffect** solo para sincronizar con sistemas externos, no para flujo de datos. Composición sobre props booleanas infinitas.
- **Auth por cookies HttpOnly + CSRF**: cliente HTTP con `credentials: 'include'`; en dev, **proxy de Vite** `'/api' -> http://localhost:4010` para mismo origen. Antes de cada mutación manda `x-csrf-token` (obtenido de `GET /api/v1/auth/csrf`); **re-pide el token tras login/logout** (es session-bound). Detalle en el handoff Fase 1.
- Validación cliente con Zod (formularios), pero el backend revalida (el front nunca es frontera de seguridad).

## Qué hacer

1. **Primero un PLAN por fases** (como hizo el backend): Fase 0 front (scaffold Vite+React+TS, Tailwind 4 + tokens + tema, shadcn init, React Router con layout mobile-first, QueryClient + Sonner, Orval configurado apuntando a `./contract/openapi.json`, página `/health` que consume el back) → Fase 1 front (Login + logout, `ProtectedRoute`, **selector de organización** desde `GET /organizations`, shell de **Configuración**: empresa, sedes, miembros con roles, tema). Presenta el plan y espera aprobación.
2. Luego construir paso por paso, **testeable en cada paso** (a 360px primero), regenerando el cliente con `pnpm api:gen` cuando cambie el contrato.
3. Demo para probar login: **`demo@nummo.app` / `Demo1234!`** (con el back corriendo + `pnpm seed`).

## Sincronización

El backend ya cerró **todas sus fases (V1)**: `openapi.json` aquí incluido está en **v1.0.0 con 73 endpoints** (auth, orgs, contactos/maestros, cartera, pagos, mora, gastos/egresos, caja/transferencias, reportes). Corre `pnpm api:gen` para regenerar el cliente. Detalle en **`./contract/SYNC-STATUS.md`**. Si el backend hace algún ajuste puntual, se recopiará `openapi.json` y se actualizará ese archivo.
