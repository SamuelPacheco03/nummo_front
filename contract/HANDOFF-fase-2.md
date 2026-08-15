# Handoff — Fase 2 (backend → frontend)

Contactos + maestros están listos. Contrato actualizado: **28 endpoints** en `openapi.json` (regenera tu cliente con `pnpm api:gen`).

## Endpoints nuevos (todos bajo `/api/v1/organizations/{orgId}/…`, requieren sesión + membresía)

- **Contacts** (`Contacts`): `GET|POST /contacts`, `GET|PATCH|DELETE /contacts/{contactId}` (DELETE = archivar). Relaciones: `GET|POST /contacts/{contactId}/relationships`, `DELETE …/relationships/{relationshipId}`.
- **Billing concepts** (`Billing`): `GET|POST /billing-concepts`, `GET|PATCH /billing-concepts/{id}`.
- **Expense categories** (`Expenses`): `GET|POST /expense-categories`, `GET|PATCH /expense-categories/{id}`.
- **Payment methods** (`Finances`): `GET|POST /payment-methods`, `GET|PATCH /payment-methods/{id}`.
- **Financial accounts** (`Finances`): `GET|POST /financial-accounts`, `GET|PATCH /financial-accounts/{id}`.

## Paginación / búsqueda (server-side)

Los `GET` de lista devuelven un envoltorio **`{ data, page, pageSize, total, totalPages }`**. Query params: `page` (≥1), `pageSize` (1–100), `q` (búsqueda), `sort` (`name`|`createdAt`), `order` (`asc`|`desc`), `isActive` (`true`/`false`). Filtros extra: contacts `contactType`; payment-methods `methodType`; financial-accounts `accountType`. Úsalo con TanStack Table (server-side) → cards en móvil.

## Shapes clave

- **Contact**: `contactType` `PERSON`|`COMPANY`, `displayName` (derivado), `firstName/lastName/companyName`, `documentType/documentNumber`, `email/phone/address/notes`, `isActive`. Regla: PERSON requiere `firstName`; COMPANY requiere `companyName` (si no → 422). Documento único por org (duplicado → 409).
- **ContactRelationship**: `{ relationshipType, isPrimary, direction: 'OUTGOING'|'INCOMING', counterpart: { id, displayName, contactType } }`. Listar por contacto devuelve ambas direcciones.
- **BillingConcept**: `code?`, `name`, `description?`, `defaultAmount` (string decimal, p.ej. `"550000.00"`, opcional).
- **PaymentMethod**: `name`, `methodType` `CASH|BANK_TRANSFER|CARD|DIGITAL_WALLET|OTHER`.
- **FinancialAccount**: `branchId?`, `name`, `accountType` `CASH|BANK|DIGITAL_WALLET|OTHER`, `currency` (3 letras, default COP), `openingBalance` (string), `openingBalanceDate` (`YYYY-MM-DD`). Los **saldos reales** se calcularán desde movimientos (Fase 4/7), no de este campo.

## Permisos (RBAC)

- **Contactos**: leer = cualquier miembro; crear/editar/archivar = OWNER/ADMIN/ACCOUNTANT/OPERATOR (no VIEWER).
- **Maestros** (conceptos, categorías, métodos, cuentas): leer = cualquier miembro; crear/editar = **OWNER/ADMIN** (configuración). El backend es el guard real; refléjalo en la UI.
- Dinero siempre como **string**; nunca calcular saldos como fuente de verdad en el front.

## Qué construir en el front (Fase 2)

- **Contactos**: listado con búsqueda + paginación (tabla→cards en móvil), alta persona/empresa (form RHF+Zod en una columna, campos condicionales por tipo), detalle con **relaciones** (agregar/quitar; mostrar dirección y contraparte), archivar.
- **Configuración → Maestros**: pantallas CRUD para conceptos de cobro, categorías de gasto, métodos de pago y cuentas (caja/banco/billetera). Selects de tipo con los enums de arriba.
- Datos demo tras `pnpm seed` (org "Jardín Infantil Demo"): 2 conceptos, 3 categorías, 2 métodos, 2 cuentas, 2 contactos + 1 relación.
