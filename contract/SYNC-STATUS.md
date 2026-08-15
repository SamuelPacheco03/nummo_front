# SYNC-STATUS — Backend → Frontend

**Fecha:** 2026-08-15 · **Estado del backend: V1 COMPLETO (Fases 0–8) + verticalización + config IA.**

## 🤖 Configuración del asistente IA (BYOK) — para construir la pantalla de ajustes

El dueño/administrador elige **proveedor + modelo + su API key** (BYOK). Endpoints nuevos, solo **OWNER/ADMIN** (regenera con `pnpm api:gen`). La API key **se guarda cifrada y NUNCA se devuelve** — solo `apiKeyLast4` (últimos 4 caracteres).

- `GET /api/v1/organizations/:orgId/assistant/settings` → `{ activeProvider, providers[], catalog[] }`
  - `catalog`: `[{ provider, label, suggestedModels[] }]` — los 4 proveedores (`anthropic`, `openai`, `google`, `deepseek`) con etiqueta y modelos sugeridos. **`model` es texto libre**; los sugeridos son solo para el dropdown.
  - `providers`: los configurados, enmascarados: `{ provider, model, apiKeyLast4, isActive, createdAt, updatedAt }`.
  - `activeProvider`: proveedor activo o `null`.
- `PUT /api/v1/organizations/:orgId/assistant/providers/:provider` — body `{ model, apiKey, activate? }`. Crea/actualiza la credencial. El **primer** proveedor configurado queda activo automáticamente; usa `activate: true` para cambiar el activo. Devuelve la credencial enmascarada.
- `POST /api/v1/organizations/:orgId/assistant/providers/:provider/activate` — marca ese proveedor como activo.
- `DELETE /api/v1/organizations/:orgId/assistant/providers/:provider` — elimina la credencial (204).
- `:provider` ∈ `anthropic | openai | google | deepseek`. Las mutaciones requieren `x-csrf-token`.

**UX sugerida:** pantalla "Asistente / IA" en Configuración → una tarjeta por proveedor (desde `catalog`) con su estado (configurado/activo), campo de modelo (con sugerencias) y campo de API key **write-only** (mostrar `•••• {last4}` si ya existe), más botones "Activar" y "Eliminar". Nota: el **chat aún no existe**; esto es solo la configuración para cuando se construya.

## 🆕 Verticalización: tiendas, finanzas personales y montos únicos

El sistema ya no sirve solo para colegios. Cambios nuevos — regenera el cliente con `pnpm api:gen`:

- **Tipo de organización** — `organizations.type` = `SCHOOL | SHOP | PERSONAL | GENERIC` (default `GENERIC`). `POST /organizations` y `PATCH /organizations/:orgId` aceptan `type`; el objeto `Organization` lo devuelve.
- **Plantillas de datos maestros** — `POST /api/v1/organizations/:orgId/apply-template` (OWNER/ADMIN, **idempotente**). Crea conceptos, categorías, métodos de pago y cuentas por defecto según el vertical. Body `{ "type"?: ... }` para forzar un vertical; si se omite, usa el `type` de la organización. Responde `{ billingConcepts, expenseCategories, paymentMethods, financialAccounts }` (cuántos creó; re-llamar devuelve ceros). **Flujo sugerido:** al crear la org el usuario elige el tipo → el front llama `apply-template` → ya hay datos para empezar a operar.
- **Gasto de negocio vs. personal** — `expense_categories.scope` = `BUSINESS | PERSONAL` (default `BUSINESS`). Create/Update lo aceptan; list/get lo devuelven. Sirve para separar "gastos del negocio" de los "gastos personales del dueño" (p. ej. un filtro o reporte por `scope`).
- **Ingresos y egresos ÚNICOS (no recurrentes)** — ya estaban soportados y funcionan para tiendas/personal:
  - **Venta / ingreso directo:** `POST /payments` con `purpose: "DIRECT_INCOME"` + `directBillingConceptId` (sin cuenta por cobrar; `payerContactId` opcional → cliente anónimo).
  - **Gasto / egreso directo:** `POST /disbursements` con `purpose: "DIRECT_EXPENSE"` + `directExpenseCategoryId` (sin cuenta por pagar; `supplierContactId` opcional).
  - Ambos entran en flujo de caja, saldos de cuenta, movimientos e `income-by-concept` / `expenses-by-category`.

## ✅ Completado: página de registro (`/register`)
El alta de cuentas es **registro público** (decidido). **Implementado en el front** (commit `4de5437`): pantalla `/register`, `AuthLayout` compartido con login, enlaces de ida y vuelta login↔registro, pista en el modal "Agregar miembro" y tests. Lo pedido, ya cubierto:

- ✅ `POST /api/v1/auth/register` — body `{ email, password, fullName }` (password **mín. 8**), con `x-csrf-token` automático. Devuelve **201** con el `User`.
- ✅ **No** inicia sesión automáticamente: tras el 201 redirige a **login** con el email precargado + toast.
- ✅ Recién registrado el usuario **no tiene organización** → no ve datos hasta que un **owner lo agregue** en "Agregar miembro" por su email (nota visible en la propia pantalla).
- ✅ Flujo completo: persona se registra en `/register` → le pasa su email al owner → el owner la agrega y le asigna rol.
- ✅ Enlace **"¿No tienes cuenta? Regístrate"** en el login y pista de registro en el modal "Agregar miembro".
- ✅ **Rate-limit** (429) manejado con mensaje amable (vía `getErrorMessage`).

## Aviso
El backend terminó todas sus fases. El contrato `openapi.json` está **congelado como v1.0.0** con **73 endpoints**. Regenera tu cliente:

```bash
pnpm api:gen
```

(Apunta a `./contract/openapi.json` o, con el back corriendo, a `http://localhost:4010/openapi.json`.)

- **Back corriendo:** `http://localhost:4010` (en `nummo-api`: `pnpm dev` + `pnpm seed`; DB en Docker).
- **Login demo:** `demo@nummo.app` / `Demo1234!`
- **Docs interactivos:** `http://localhost:4010/docs` (Scalar).

## Handoffs disponibles (léelos por área)
`HANDOFF-fase-0..8.md` en esta carpeta. Resumen de lo que ya puedes construir:

| Área | Endpoints base | Handoff |
|---|---|---|
| Auth + sesión (cookie HttpOnly + CSRF) | `/auth/*` | 1 |
| Organizaciones, sedes, miembros, settings | `/organizations/*` | 1 |
| Contactos (+ relaciones) y maestros | `/contacts`, `/billing-concepts`, `/expense-categories`, `/payment-methods`, `/financial-accounts` | 2 |
| Cartera (cobros recurrentes) | `/billing-agreements`, `/receivables`, `/interest-policies` | 3 |
| Pagos (abono/anticipo/reversión, Idempotency-Key) | `/payments` | 4 |
| Mora automática (causar, condonar, accruals) | `/receivables/accrue-interest`, `/receivables/{id}/waivers`, `/receivables/{id}/accruals` | 5 |
| Gastos y egresos | `/expense-schedules`, `/expenses`, `/disbursements` | 6 |
| Caja: transferencias, saldos, movimientos | `/financial-accounts/balances`, `/financial-accounts/transfers`, `/financial-movements` | 7 |
| Reportes (dashboard) | `/reports/{cashflow,receivables-summary,payables-summary,top-debtors,upcoming-receivables,income-by-concept,expenses-by-category}` | 7 |
| Endurecimiento (ops) | `GET /health`, `GET /metrics` | 8 |

## Cambios importantes de Fase 8 para el front
- **Rate limit en login/register**: maneja **HTTP 429** (`{ error: { code: 'RATE_LIMITED' } }`) con mensaje amable/backoff.
- **413** si el body supera 1 MB.
- Recuerda: `x-csrf-token` en cada mutación y **re-pedir el token tras login/logout** (session-bound); cliente con `credentials: 'include'`; dinero como **string decimal**.

## Datos demo listos (tras `pnpm seed`)
Org "Jardín Infantil Demo" con: contactos + relación, cartera con **mora causada** y un **abono** (PARTIAL), un **gasto** con egreso parcial, una **transferencia** Caja→Banco, y saldos/movimientos/reportes cuadrando. Ideal para el dashboard.

## Qué falta (lado front — tu Fase 8)
Cuando termines las pantallas de negocio: **E2E Playwright** del flujo maestro (cliente → acuerdo → mensualidad → abono → mora → condonar; gasto recurrente → egreso; transferencia; y que el **dashboard cuadre** con los movimientos) + **QA responsive** 360/390/768/1024/1440 + **accesibilidad** (foco, labels, contraste).

## Sincronización a futuro
El contrato ya no cambiará salvo ajustes puntuales. Si el backend hace un cambio, se copiará `openapi.json` aquí y se actualizará este archivo — vuelve a correr `pnpm api:gen`.
