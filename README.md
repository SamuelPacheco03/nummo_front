# Nummo — Frontend

Administración financiera y cartera multiempresa (React). Consume la API de `nummo-api`
mediante un contrato OpenAPI. Ver `START-HERE.md` y `contract/HANDOFF-fase-*.md`.

> **Antes de tocar código, lee [`context.md`](./context.md).** Es la fuente de verdad del
> proyecto: producto, UX, sistema visual, stack, arquitectura, convenciones de código,
> inventario de componentes y el plan de rediseño por fases. `CLAUDE.md` resume el protocolo
> para sesiones de Claude Code.

## Stack

React 19 · Vite 8 · TypeScript strict · React Router 8 · Tailwind CSS 4 · shadcn/ui ·
TanStack Query v5 · TanStack Table v9 · Zustand (solo UI) · React Hook Form · Zod 4 ·
Sonner · Orval (cliente + hooks desde OpenAPI). Tests: Vitest + Testing Library.

## Requisitos

- Node 20+ y pnpm (vía corepack).
- Backend `nummo-api` en `http://localhost:4010` para datos en vivo (`pnpm dev` + `pnpm seed`
  en ese repo). El proxy de Vite mantiene el mismo origen para cookies + CSRF.

## Scripts

```bash
pnpm dev        # servidor de desarrollo (http://localhost:5173)
pnpm build      # typecheck + build de producción
pnpm preview    # sirve el build
pnpm typecheck  # tsc -b --noEmit
pnpm test       # Vitest (una pasada)
pnpm test:watch # Vitest en watch
pnpm lint       # oxlint
pnpm api:gen    # regenera el cliente tipado desde contract/openapi.json (Orval)
pnpm icons:gen  # regenera favicons + iconos PWA desde brand/logo_nummo.png
```

Al cerrar cada fase el backend actualiza `openapi.json`: copia el nuevo a `./contract/`
y corre `pnpm api:gen`. La salida (`src/api/generated/**`) **no se edita a mano**.

## Estructura

```
src/
  api/
    http-client.ts      # mutator de Orval: credentials:include + x-csrf-token + ApiError
    generated/          # cliente + hooks generados (Orval) — no editar
  app/
    layout/app-shell.tsx # consola: sidebar (drawer en móvil) + header + Outlet
    providers.tsx        # QueryClientProvider + ThemeProvider + Toaster + handler 401
    router.tsx           # /login público + rutas protegidas (code-split con lazy)
  components/            # page-header, pagination, search-input, ui/ (shadcn a mano)
  features/
    auth/                # useAuth/useLogin/useLogout, ProtectedRoute, LoginPage, UserMenu
    organizations/       # useCurrentOrg, OrgSwitcher, roles (RBAC), store selectedOrgId
    config/              # empresa, sedes, miembros, apariencia (tema)
    contacts/            # lista+búsqueda+paginación, form persona/empresa, detalle+relaciones
    masters/             # MasterCrud genérico: conceptos, categorías, métodos, cuentas
  lib/
    csrf.ts             # token CSRF (session-bound; re-pedir tras login/logout)
    errors.ts           # getErrorMessage/getErrorCode desde ApiError
    query-client.ts · utils.ts (cn) · format.ts (initials)
  pages/                # home, health (ruta /estado)
  pwa/                  # service worker, prompt de instalación, aviso de "sin conexión"
  stores/theme.ts       # Zustand (SOLO estado de UI)
```

> **shadcn/ui:** el CLI de shadcn falla en este entorno (bug de `fs-extra` con Node 24),
> así que los componentes de `components/ui/` están escritos a mano según la fuente canónica
> (new-york, Tailwind v4). Agrega nuevos componentes de la misma forma.

## PWA (app instalable)

Nummo se instala como aplicación (escritorio, Android e iOS) vía `vite-plugin-pwa`.

- **Manifest e iconos**: se declaran en `vite.config.ts`. El original de marca vive en
  `brand/logo_nummo.png` (fuera de `public/`, para que los 774 KB no viajen al deploy);
  los derivados —favicons, `apple-touch-icon`, iconos `any` y `maskable`, y el
  `public/logo-mark.png` transparente que usa la UI— los produce `pnpm icons:gen`.
  Si cambia el logo: reemplaza el PNG de `brand/` y vuelve a correr ese script.
- **Caché**: Workbox precachea el shell (JS, CSS, HTML, fuentes, iconos) y usa
  `navigateFallback`, así que las rutas profundas abren sin red. Todo lo que cuelga de
  `/api`, `/health`, `/openapi.json` y `/docs` va con `NetworkOnly`: los datos
  financieros y la sesión **nunca** se cachean.
- **Actualizaciones**: `registerType: 'prompt'`. Al detectar una versión nueva sale un
  toast con "Actualizar" y se recarga solo si el usuario lo pide (nadie pierde un
  formulario a medias). `PwaUpdater` además comprueba si hay versión nueva cada hora.
- **Instalación**: `InstallAppButton` (pie del sidebar) usa el prompt nativo donde existe;
  en iOS, donde no hay `beforeinstallprompt`, abre las instrucciones de "Añadir a
  pantalla de inicio".
- **En desarrollo el service worker está apagado** (ensucia el HMR). Para probarlo:
  `pnpm build && pnpm preview`, o bien `VITE_PWA_DEV=true pnpm dev`.

## Convenciones

- **Mobile-first** (baseline 360–390 px); tablas → cards en móvil.
- **Design tokens semánticos** (variables CSS): `bg-primary`, `text-muted-foreground`, etc.
  Tema Light/Dark/System. Fuentes Sora (títulos) + Inter (cuerpo), self-hosted.
- **TanStack Query** = estado del servidor (no se copia a Zustand).
- **Dinero** llega como string decimal; nunca calcular saldos como fuente de verdad.
- La ruta de página de salud es `/estado` (distinta del path del API `/health`, que el
  proxy reenvía al backend).
