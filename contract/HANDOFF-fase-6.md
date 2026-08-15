# Handoff — Fase 6 (backend → frontend)

Gastos y egresos listos. Contrato actualizado: **63 endpoints** (`pnpm api:gen`). Es el espejo del lado de cuentas por pagar de lo que ya tenías en cartera (Fase 3) + pagos (Fase 4): mismos patrones, mismos shapes.

## Endpoints nuevos (bajo `/api/v1/organizations/{orgId}/…`)

### Gastos recurrentes — tag `Expenses`
- `GET|POST /expense-schedules` — acuerdos de gasto recurrente (proveedor + categoría + monto + día). `GET|PATCH /expense-schedules/{id}` y acciones `POST …/{id}/pause`, `/resume`, `/end`.

### Gastos (payables) — tag `Expenses`
- `GET /expenses` — **paginado desde `v_expense_balances`** (filtros: `displayStatus`, `supplierContactId`, `expenseCategoryId`, `dueBefore`, `dueAfter`, `order`).
- `POST /expenses` — crear gasto **manual**.
- `POST /expenses/generate` — **generar gastos** vencidos de los schedules (idempotente). También corre a diario en el worker.
- `GET /expenses/{id}` — detalle `{ expense, balance }`.
- `POST /expenses/{id}/cancel`, `POST /expenses/{id}/write-off`.

### Egresos — tag `Disbursements`
- `GET /disbursements` — paginado (filtros: `supplierContactId`, `status`, `purpose`, `order`).
- `POST /disbursements` — **registrar egreso** en una sola transacción (movimiento OUT + disbursement + allocations + auditoría). Header **`Idempotency-Key`** soportado.
- `GET /disbursements/{id}` — detalle `{ disbursement, allocations[], unallocated }`.
- `POST /disbursements/{id}/allocations` — aplicar un **anticipo a proveedor** a gastos.
- `POST /disbursements/{id}/reverse` — reversar (movimiento `REVERSAL` + `status=REVERSED`, sin borrar historia).

## Conceptos clave (idénticos al lado de ingresos)

- Un **schedule** genera `expenses` mensuales de forma **idempotente** (única por schedule+período), con la misma matemática de recurrencia (día 29/30/31, TZ de la org).
- **Saldo y estado derivados** por `v_expense_balances` (fuente única): `balance = original − paid` (de disbursements `POSTED`), `displayStatus ∈ PENDING | PARTIAL | OVERDUE | PAID | CANCELLED | WRITTEN_OFF`.
- **Purposes** de egreso:
  - `EXPENSE` → paga gastos; envía `allocations: [{ expenseId, amount }]` (parcial, total o repartido).
  - `ADVANCE` → **anticipo a proveedor**: sin asignar; queda como crédito (`unallocated.unallocatedAmount`) y se aplica luego con `POST …/allocations`.
  - `DIRECT_EXPENSE` → egreso directo sin gasto previo; requiere `directExpenseCategoryId`.
- **Idempotencia**: `Idempotency-Key` (UUID por intento) hace el registro seguro ante reintentos.
- Dinero siempre **string decimal** (`"550000.00"`).

## Permisos (RBAC)
- Registrar egreso, aplicar anticipo, crear gasto manual: **OWNER/ADMIN/ACCOUNTANT/OPERATOR**.
- Schedules (CRUD/pause/resume/end), generar, cancelar/write-off, reversar: **OWNER/ADMIN/ACCOUNTANT**.
- Leer: cualquier miembro.

## Qué construir en el front (Fase 6)
- **Gastos**: listado desde `GET /expenses` con filtros por estado/categoría/proveedor/fecha (tabla→cards en móvil, badges por estado). Botón **"Generar gastos"** (`POST /expenses/generate`).
- **Registrar egreso**: form (proveedor, cuenta origen `financialAccountId`, método, monto, referencia) + selector de gastos abiertos del proveedor para aplicar (parcial/total). Enviar `Idempotency-Key`.
- **Anticipo a proveedor** (`purpose=ADVANCE`) → aplicar después. **Detalle de egreso** con botón **Revertir**.
- **Gastos recurrentes**: crear/editar/pausar/reanudar/finalizar schedules.

## Sync
`openapi.json` regenerado (63 paths) y copiado a `nummo_front/contract/`. Corre `pnpm api:gen`. Nuevos hooks: `useExpenses…`, `useExpenseSchedules…`, `useDisbursements…`.

## Siguiente
Fase 7 (Caja, transferencias, dashboard y reportes): `account_transfers`, `v_financial_account_balances`, endpoints de reportes (cashflow, cartera, CxP, saldos, movimientos).
