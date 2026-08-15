# Handoff — Fase 8 (backend → frontend)

Endurecimiento del backend. **No agrega endpoints de negocio** (el contrato de negocio queda en 73 paths, ahora `info.version: 1.0.0` — V1 completa). Cambios relevantes para el front:

## Lo que cambia para el front
- **Rate limiting de auth**: `POST /auth/login` y `/auth/register` están limitados (por defecto 10 intentos / 15 min por IP). Maneja **HTTP 429** en el login con un mensaje amable (`{ error: { code: 'RATE_LIMITED' } }`) y, si aplica, backoff. En el entorno de test del backend el limitador se desactiva; en dev/prod está activo.
- **Límite de body** (1mb por defecto): payloads enormes devuelven **413**.
- **CORS**: sigue restringido a `CORS_ORIGIN` (dev: `http://localhost:5173`) con credenciales.
- El resto del contrato (auth, cartera, pagos, gastos/egresos, caja, reportes) **no cambia**.

## Endpoints operativos (no de negocio; no requieren estar en la UI)
- `GET /health` — liveness/readiness + estado de DB (ya existía).
- `GET /metrics` — conteo de requests por clase de status, error rate y latencia p50/p95/p99. En prod se protege con `METRICS_TOKEN` (header `x-metrics-token`). No es para la UI del usuario final.

## Operación (backend)
- **Backups/restore**: `bash scripts/backup.sh` / `bash scripts/restore.sh`; procedimiento y simulacro en `docs/operations.md`.
- **Migraciones**: forward-only + forward-fix (ver `docs/operations.md`).
- **Seguridad**: checklist por entorno en `docs/security.md` (secretos, HTTPS/cookies Secure, límites, backups).
- **Slow queries**: Postgres registra las > `SLOW_QUERY_MS` (docker-compose); jobs del worker registran su duración.

## Qué falta en el front para cerrar Fase 8 (chat del front)
- **E2E Playwright** del flujo maestro: cliente → acuerdo → mensualidad (generar) → abono → mora (causar) → condonar; gasto recurrente → egreso; transferencia; y verificación del **dashboard** (KPIs cuadran con los movimientos).
- **QA responsive** 360/390/768/1024/1440 + navegación por teclado.
- **Accesibilidad**: foco visible, labels, contraste (tokens de marca), estados loading/empty/error/success.

## Estado del proyecto
Backend **V1 funcional-completo** (Fases 0–8): 73 endpoints, 62 tests, worker con 3 jobs idempotentes, métricas, backups probados. `openapi.json` (v1.0.0) sincronizado en `nummo_front/contract/`. Corre `pnpm api:gen` en el front.
