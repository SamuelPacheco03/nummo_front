# Handoff — Fase 4 (backend → frontend)

Pagos listos. Contrato actualizado: **46 endpoints** (`pnpm api:gen`). Esta fase "cierra el círculo" de la cartera: ahora `v_receivable_balances` incluye `paid_total`, así que aparecen los estados **PARTIAL** y **PAID** reales.

## Endpoints nuevos (bajo `/api/v1/organizations/{orgId}/…`, tag `Payments`)

- `GET /payments` — **paginado** (filtros: `payerContactId`, `status` ∈ `POSTED|REVERSED`, `purpose` ∈ `RECEIVABLE|ADVANCE|DIRECT_INCOME`, `order` def. `desc`).
- `POST /payments` — **registrar pago**. Una sola transacción: `financial_movement` (IN) + `payment` + `payment_allocations` + auditoría. Acepta header **`Idempotency-Key`** (opcional pero recomendado).
- `GET /payments/{id}` — detalle: `{ payment, allocations[], unallocated }`.
- `POST /payments/{id}/allocations` — **aplicar un anticipo/crédito** a una o varias receivables (para pagos `ADVANCE` o saldo sin asignar).
- `POST /payments/{id}/reverse` — **reversar** (movimiento `REVERSAL` + `status=REVERSED`; **no borra historia**; el saldo de la cartera se recalcula).

## Shapes clave

```ts
PaymentDetail = {
  payment: {
    id, payerContactId, paymentMethodId, financialMovementId,
    directBillingConceptId, purpose, receivedAt, amount, reference,
    notes, status, createdAt
  },
  allocations: [{ id, receivableId, amount, allocatedAt }],
  unallocated: { amount, allocatedAmount, unallocatedAmount }   // todo string decimal
}
```

`POST /payments` (body `RegisterPayment`):
```ts
{
  paymentMethodId, financialAccountId,       // requeridos
  payerContactId?, purpose?='RECEIVABLE',
  directBillingConceptId?,                    // requerido solo si purpose=DIRECT_INCOME
  receivedAt?, amount, reference?, notes?,
  allocations?: [{ receivableId, amount }]    // válido para RECEIVABLE
}
```
Devuelve **201** con `PaymentDetail`.

## Conceptos clave

- **Purposes**:
  - `RECEIVABLE` → paga obligaciones; envía `allocations` para aplicarlo (abono parcial o pago total, o distribuido a varias receivables).
  - `ADVANCE` → **anticipo**: no se asigna al registrar; queda como crédito (`unallocated.unallocatedAmount`) y luego se aplica con `POST /payments/{id}/allocations`.
  - `DIRECT_INCOME` → ingreso directo sin receivable; requiere `directBillingConceptId`.
- **Estados derivados reales**: `v_receivable_balances` ahora resta `paid_total` (allocations de pagos `POSTED`). Verás `PARTIAL` (abono, aún con saldo y no vencida) y `PAID` (saldo 0). `OVERDUE` tiene prioridad sobre `PARTIAL` si ya pasó el vencimiento.
- **Idempotencia**: envía `Idempotency-Key` (un UUID por intento del usuario). Reintento con **misma key + mismo body** → replica el mismo 201 (no duplica). Misma key + body distinto o petición aún en curso → **409**.
- **Reversión**: no se edita ni borra; genera movimiento `REVERSAL` y marca `status=REVERSED`. La allocation deja de contar → el saldo de la receivable vuelve a subir.
- Cada asignación valida que **no exceda el saldo** de la receivable ni el monto disponible del pago. Todo dinero es **string decimal** (`"200000.00"`).

## Permisos (RBAC)

- Registrar pago, aplicar anticipo, listar, ver detalle: **OWNER/ADMIN/ACCOUNTANT/OPERATOR**.
- Reversar: **OWNER/ADMIN/ACCOUNTANT**.
- Leer requiere sesión + membresía en la org.

## Qué construir en el front (Fase 4)

- **Registrar pago**: form (pagador, cuenta destino `financialAccountId`, método `paymentMethodId`, monto, referencia, fecha). Para `RECEIVABLE`, selector de obligaciones abiertas del pagador con montos a aplicar (abono parcial o total, o repartir en varias). Enviar `Idempotency-Key` (genera un UUID al abrir el form; reutilízalo en reintentos).
- **Anticipo**: registrar con `purpose=ADVANCE` (sin allocations) → mostrar crédito disponible → pantalla/acción "aplicar anticipo" (`POST …/allocations`).
- **Detalle de pago**: cabecera + allocations + no asignado; botón **Revertir** (con confirmación).
- **Cartera**: ahora los badges `PARTIAL`/`PAID` funcionan de verdad; el detalle de receivable ya refleja `paid_total`/saldo.
- Demo tras `pnpm seed`: hay un **abono demo** aplicado a una receivable (verás `paid_total` > 0 y saldo parcial).

## Sync

`openapi.json` regenerado (46 paths) y copiado a `nummo_front/contract/`. Corre `pnpm api:gen` en el front para tipos + hooks nuevos (`usePayments…`).

## Siguiente
Fase 5 (Mora automática): motor de intereses por estrategia + worker `accrue-overdue-interest` (idempotente), ajustes `INTEREST`/`WAIVER` sobre la receivable.
