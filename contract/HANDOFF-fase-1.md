# Handoff — Fase 1 (backend → frontend)

Auth + multi-tenancy is live. Regenerate the typed client from `openapi.json` (16 paths, `cookieAuth` scheme) with `pnpm api:gen`.

## Auth flow (cookies + CSRF) — important

1. On app load (and after login/logout), `GET /api/v1/auth/csrf` → `{ csrfToken }` (also sets a CSRF cookie).
2. Send **`x-csrf-token: <token>`** on every mutation (POST/PUT/PATCH/DELETE). Safe GETs need no token.
3. HTTP client must use **`credentials: 'include'`** so the session + CSRF cookies flow. In dev, the Vite proxy keeps front (5173) and api (4010) same-origin.
4. The CSRF token is **session-bound**: after `login` or `logout` the session changes, so **re-fetch `/auth/csrf`** before the next mutation.

Demo login (from `pnpm seed`): **demo@nummo.app / Demo1234!**

## Endpoints

**Auth** (`Auth` tag)
- `GET /api/v1/auth/csrf` → `{ csrfToken }`
- `POST /api/v1/auth/register` `{ email, password(≥8), fullName }` → 201 `User`
- `POST /api/v1/auth/login` `{ email, password }` → 200 `User` (sets session cookie)
- `POST /api/v1/auth/logout` → 204
- `GET /api/v1/auth/me` → 200 `User`
- `GET /api/v1/auth/sessions` → `Session[]` · `DELETE /auth/sessions/{id}` · `POST /auth/sessions/revoke-others`

**Organizations** (`Organizations` tag) — all require an active session; org-scoped routes require membership in `:orgId`.
- `POST /api/v1/organizations` `{ name, legalName?, taxId?, defaultCurrency?, timezone?, locale? }` → 201 `{ organization, role }` (caller becomes OWNER)
- `GET /api/v1/organizations` → `{ organization, role }[]` (the org switcher list)
- `GET|PATCH /api/v1/organizations/{orgId}` (PATCH: OWNER/ADMIN)
- `GET|PUT /api/v1/organizations/{orgId}/settings` (PUT: OWNER/ADMIN) — `themeMode`, `accentToken`, `dueReminderDays`, `interestJobLocalTime`, `uiConfig`
- `GET|POST /api/v1/organizations/{orgId}/branches` · `GET|PATCH /branches/{branchId}` (writes: OWNER/ADMIN)
- `GET|POST /api/v1/organizations/{orgId}/members` (add by email) · `PATCH|DELETE /members/{membershipId}` (OWNER/ADMIN)

## Conventions

- **Errors:** `{ error: { code, message, details?, requestId } }`. Codes: `VALIDATION`(422), `UNAUTHENTICATED`(401), `FORBIDDEN`(403), `NOT_FOUND`(404), `CONFLICT`(409), `RATE_LIMITED`(429), `INTERNAL`(500).
- **Roles:** OWNER/ADMIN manage org/settings/branches/members; ACCOUNTANT/OPERATOR/VIEWER are read-only in this phase. Last OWNER cannot be demoted/removed.
- **Adding members:** the target user must already have registered (no email invitations in V1) → otherwise 422.
- Dates are ISO 8601 strings; ids are UUID v7.

## What the front builds in Fase 1

- **Login** screen (+ logout); `ProtectedRoute` guard that redirects to login on 401.
- **Org context / switcher** from `GET /organizations`; store the selected orgId (URL or Zustand UI state).
- **Configuración** shell: organization (name, tz, locale, status), **sedes** (branches CRUD), **usuarios/miembros** (list, add by email, change role, remove — OWNER/ADMIN only), and **tema** (Light/Dark/System bound to settings.themeMode).
- Gate management actions in the UI by the current membership `role` (but the API is the real guard).

Mobile-first as always (360–390 px first). Tokens/brand: see `HANDOFF-fase-0.md`.
