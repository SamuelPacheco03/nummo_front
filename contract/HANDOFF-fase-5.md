# Handoff — Fase 5 (backend → frontend)

Mora automática (intereses) lista. Contrato actualizado: **49 endpoints** (`pnpm api:gen`). El motor de interés es **simple (no compuesto)**, configurable por política, e **idempotente**: causar dos veces el mismo día no vuelve a cobrar.

## Endpoints nuevos (bajo `/api/v1/organizations/{orgId}/…`, tag `Receivables`)

- `POST /receivables/accrue-interest` — **causar mora ahora** para toda la org (OWNER/ADMIN/ACCOUNTANT). También corre a diario en el worker. Devuelve un resumen:
  ```ts
  { organizations, candidates, charged, chargedAmount, skipped }
  ```
- `GET /receivables/{id}/accruals` — historial de causaciones de una cuenta:
  ```ts
  [{ id, receivableId, interestPolicyId, adjustmentId, accrualDate, daysOverdue, baseAmount, rateValue, amount, createdAt }]
  ```
- `POST /receivables/{id}/waivers` — **condonar interés** (OWNER/ADMIN/ACCOUNTANT). Body `{ amount, reason? }` → devuelve el ajuste `WAIVER` creado. Tope: no puede exceder el interés causado pendiente (si excede → **422**).

## Conceptos clave

- **Interés simple, acumulado**: el motor calcula el interés *total que debería existir* a la fecha y cobra solo el **delta** contra lo ya causado. Correr el job dos veces el mismo día → `charged: 0`. Doble defensa: `UNIQUE(receivable, accrual_date)` + advisory lock por cuenta.
- **Métodos** (`interest_policies.calculationMethod`; `rateValue` es un **porcentaje**):
  - `DAILY_SIMPLE_PERCENT` — `rateValue`%/día (p.ej. `0.05` = 0.05%/día).
  - `MONTHLY_SIMPLE_PRORATED` — `rateValue`%/mes prorrateado por `días/30`.
  - `FIXED_ONCE` — cargo único de `rateValue`% al entrar en mora.
- **Gracia**: los `graceDays` son libres; el interés empieza el día siguiente a `dueDate + graceDays`.
- **Base** (`interest_policies.baseType`):
  - `ORIGINAL_AMOUNT` — sobre el valor original, fijo.
  - `OUTSTANDING_NON_INTEREST` — principal + ajustes no-interés − pagos (piso 0). Ej.: una cuenta de 550.000 con abono de 200.000 causa sobre **350.000**.
- **Topes**: `capAmount` (absoluto) y `capPercentage` (% de la base); gana el más estricto.
- **Se refleja en la vista**: las causaciones son ajustes `INTEREST` → `v_receivable_balances.interestTotal` y ya suman al `balance`. `OVERDUE` sigue teniendo prioridad sobre `PARTIAL`.
- **Condonar (WAIVER)**: ajuste negativo que baja el saldo **sin editar historia**; no reduce `interestTotal` (es otro tipo) y está topado al interés pendiente.
- **Qué causa mora**: solo cuentas cuyo **acuerdo** apunta a una política de interés **activa**. Las cuentas manuales (matrícula sin acuerdo) no causan mora.

## Permisos (RBAC)

- Causar mora, condonar: **OWNER/ADMIN/ACCOUNTANT**.
- Leer accruals: cualquier miembro.

## Qué construir en el front (Fase 5)

- **Detalle de cuenta por cobrar**: mostrar la mora (interés acumulado del `balance`), la lista de **causaciones** (`GET …/accruals`) y una acción **"Condonar interés"** (`POST …/waivers`, con monto y motivo).
- **Cartera**: los badges y saldos ya incluyen la mora automáticamente. Opcional: botón **"Causar mora"** (`POST /receivables/accrue-interest`) para admins (equivalente a lo que hace el worker a diario).
- **Políticas de interés** (Configuración, ya existían desde Fase 3): al crear/editar mostrar método, tasa, días de gracia, base y topes — el cálculo ya está vivo.
- Demo tras `pnpm seed` + generar + causar mora (o el worker): la org demo muestra mora real (ej.: cuenta con abono → base 350.000, 64 días, 0.05%/día → **11.200** de interés).

## Worker / jobs

El worker diario corre, en orden: `generate-recurring-receivables` → `accrue-overdue-interest` (cada uno por TZ de la org). One-off para probar: `pnpm job:interest`.

## Sync

`openapi.json` regenerado (49 paths) y copiado a `nummo_front/contract/`. Corre `pnpm api:gen` en el front.

## Siguiente
Fase 6 (Gastos y egresos): `expense_schedules`, `expenses`, `disbursements` (+ allocations), movimientos OUT, `v_expense_balances`, worker `generate-recurring-expenses` (idempotente) y reversión de egresos.
