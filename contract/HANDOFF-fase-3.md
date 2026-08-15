# Handoff — Fase 3 (backend → frontend)

Cartera (cobros recurrentes) lista. Contrato actualizado: **42 endpoints** (`pnpm api:gen`). Primera fase con lógica financiera real: recurrencia, estados derivados y vista de saldos.

## Endpoints nuevos (bajo `/api/v1/organizations/{orgId}/…`)

- **Interest policies** (`Billing`): `GET|POST /interest-policies`, `GET|PATCH /interest-policies/{id}`.
- **Billing agreements** (`Billing`): `GET|POST /billing-agreements`, `GET|PATCH /billing-agreements/{id}`, y acciones `POST …/{id}/pause`, `/resume`, `/end`.
- **Receivables** (`Receivables`):
  - `GET /receivables` — **paginado desde `v_receivable_balances`** (filtros: `displayStatus`, `payerContactId`, `billingConceptId`, `dueBefore`, `dueAfter`, `order`).
  - `POST /receivables` — crear cuenta por cobrar **manual** (p.ej. matrícula).
  - `POST /receivables/generate` — **generar mensualidades** vencidas de la org (idempotente). También lo corre el worker a diario.
  - `GET /receivables/{id}` — detalle: `{ receivable, balance, adjustments[] }`.
  - `POST /receivables/{id}/adjustments` — descuento/ajuste manual (DISCOUNT/MANUAL_ADD/MANUAL_SUBTRACT).
  - `DELETE /receivables/{id}/adjustments/{adjustmentId}` — reversar ajuste (sin borrar historia).
  - `POST /receivables/{id}/cancel`, `POST /receivables/{id}/write-off`.

## Conceptos clave

- Un **acuerdo** (agreement) define pagador/beneficiario/concepto/monto/día de vencimiento/política. El **worker diario** (o el botón "generar") crea las `receivables` mensuales de forma **idempotente** (única por acuerdo+período).
- El **saldo y el estado son derivados** por `v_receivable_balances` (fuente única, spec §20): `originalAmount + adjustmentsTotal − paidTotal = balance`, y `displayStatus ∈ PENDING | PARTIAL | OVERDUE | PAID | CANCELLED | WRITTEN_OFF`. En Fase 3 `paidTotal` es 0 (los pagos llegan en Fase 4; ahí aparece PARTIAL).
- **Descuentos** = ajuste negativo trazable; **no se edita** el valor original.
- Dinero siempre **string decimal** (`"550000.00"`). No calcular saldos en el front como fuente de verdad.

## Permisos (RBAC)

- Interest policies: **OWNER/ADMIN**.
- Agreements: **OWNER/ADMIN/ACCOUNTANT** (crear/editar/pause/resume/end).
- Receivables: crear manual + agregar ajuste = OWNER/ADMIN/ACCOUNTANT/OPERATOR; reversar ajuste, cancelar, write-off y **generate** = OWNER/ADMIN/ACCOUNTANT. Leer = cualquier miembro.

## Qué construir en el front (Fase 3)

- **Cartera**: listado desde `GET /receivables` con filtros por estado (`displayStatus`), pagador, concepto y rango de vencimiento; tabla→cards en móvil; badges por estado (vencido/pendiente/…). Botón **"Generar mensualidades"** (`POST /receivables/generate`).
- **Detalle de cuenta por cobrar**: valor original, ajustes (con reversar), saldo, estado y fechas.
- **Acuerdos recurrentes**: crear (pagador/beneficiario/concepto/monto/día/política/fechas), pausar/reanudar/finalizar.
- **Políticas de interés**: CRUD simple en Configuración (el cálculo de mora llega en Fase 5).
- Demo tras `pnpm seed` + `pnpm job:receivables` (o el botón generate): un acuerdo "Mensualidad María Gómez" con sus receivables.

## Siguiente
Fase 4 (Pagos) reemplaza `v_receivable_balances` para incluir `paid_total` (aparecerá `PARTIAL`/`PAID` reales) y agrega registrar pago/abono/anticipo + reversión.
