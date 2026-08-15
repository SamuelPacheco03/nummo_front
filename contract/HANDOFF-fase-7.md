# Handoff — Fase 7 (backend → frontend)

Caja, transferencias, dashboard y reportes. Contrato actualizado: **73 endpoints** (`pnpm api:gen`). Esta fase habilita el **dashboard** completo: saldos por cuenta, movimientos, transferencias internas y agregaciones.

## Endpoints nuevos

### Caja / tesorería — tag `Finances`
- `GET /financial-accounts/balances` — saldo por cuenta desde `v_financial_account_balances` (`openingBalance + totalIn − totalOut = balance`).
- `GET|POST /financial-accounts/transfers` — transferencias internas. `POST` (OWNER/ADMIN/ACCOUNTANT) crea **TRANSFER_OUT + TRANSFER_IN en una transacción**: mueve dinero entre cuentas **sin cambiar el ingreso/egreso neto**. Body: `{ fromAccountId, toAccountId, amount, currency?, transferredAt?, reference?, notes? }`.
- `GET /financial-movements` — **libro de movimientos** paginado (filtros: `financialAccountId`, `direction` IN/OUT, `movementType`, `from`, `to`, `order`).

### Reportes — tag `Reports` (bajo `/reports/…`, solo lectura)
- `GET /reports/cashflow?from&to` — `{ from, to, current:{income,expense,net}, previous:{…} }`. Compara con el **período anterior** de igual duración. Por defecto: mes en curso. Las transferencias **no** cuentan como ingreso/egreso; las reversiones restan.
- `GET /reports/receivables-summary` — `{ totalOutstanding, overdueAmount, overdueCount, pendingCount, partialCount }`.
- `GET /reports/payables-summary` — `{ totalOutstanding, overdueAmount, overdueCount }`.
- `GET /reports/top-debtors?limit` — top pagadores por saldo **vencido** (`{ payerContactId, displayName, overdueBalance, overdueCount }`).
- `GET /reports/upcoming-receivables?days&limit` — cuentas por cobrar que vencen en los próximos N días.
- `GET /reports/income-by-concept?from&to` — ingresos agrupados por concepto (`[{ id, name, amount }]`).
- `GET /reports/expenses-by-category?from&to` — egresos agrupados por categoría.

## Conceptos clave
- **Saldo de cuenta** = saldo de apertura + movimientos IN − movimientos OUT (todo desde el ledger `financial_movements`, fuente única). Un pago suma a la cuenta destino; un egreso resta de la cuenta origen; una transferencia mueve entre dos cuentas.
- **Transferencia** = dos movimientos enlazados en una sola transacción (fila `account_transfers`). No altera el neto global.
- **Cashflow**: `income` = pagos (menos sus reversiones), `expense` = egresos (menos reversiones), `net = income − expense`. `from`/`to` son fechas `YYYY-MM-DD` (inclusivas).
- Fechas/dinero: dinero como **string decimal**; fechas ISO.

## Permisos (RBAC)
- Registrar transferencia: **OWNER/ADMIN/ACCOUNTANT**.
- Leer balances, movimientos, transferencias, reportes: cualquier miembro.

## Qué construir en el front (Fase 7)
- **Dashboard**: tarjetas de KPIs (cashflow del período con comparación, cartera vencida, CxP), lista de **saldos por cuenta**, **movimientos recientes**, **top deudores** y **próximas a vencer**. Gráficas: ingresos por concepto / egresos por categoría.
- **Cuentas**: saldos (`/financial-accounts/balances`) + acción **Transferir** (`POST /financial-accounts/transfers`).
- **Movimientos**: tabla filtrable (`/financial-movements`).
- **Reportes**: vistas por período con selector de fechas (los endpoints aceptan `from`/`to`).
- Demo tras `pnpm seed`: 2 cuentas (Caja +100.000, Banco Principal −400.000 tras un traslado demo), 4 movimientos, cartera vencida y CxP con saldo.

## Sync
`openapi.json` regenerado (73 paths) y copiado a `nummo_front/contract/`. Corre `pnpm api:gen`. Nuevos hooks `useReports…`, `useFinancialAccountsTransfers…`, `useFinancialMovements…`.

## Siguiente
Fase 8 (Endurecimiento): revisión de seguridad, backups + restore, métricas, E2E Playwright del flujo maestro, QA responsive/a11y, OpenAPI final. (Reportes por sede/tercero y adjuntos quedan como extensiones opcionales.)
