# Handoff — Fase 10 (identidad visual de las maestras + auto-registro de recurrentes)

Dos cosas que no se parecen pero llegan juntas porque tocan el mismo par de tablas: que un concepto de cobro y una categoría de gasto **se vean** (icono, color, orden propio), y que un recurrente **se registre solo** el día que toca.

| Fase | Alcance | Estado |
| --- | --- | --- |
| **1** | Icono, color y orden en conceptos y categorías | ✅ hecha |
| **2** | Auto-registro de gastos recurrentes | ✅ hecha |
| **3** | Auto-registro de ingresos recurrentes (acuerdos) | ✅ hecha |
| **4** | `supplierName` / `payerName`: alta de recurrente sin pasar por contactos | ✅ hecha |

---

## Decisiones tomadas antes de escribir código

**Nummo no mueve dinero real, registra.** Eso no es una limitación de la fase: es lo que hace honesto el nombre del modo. El recurrente no «cobra», **auto-registra** un egreso que ya ocurrió afuera (Netflix debitó la tarjeta, el banco cobró la cuota). Por eso el enum es `AUTO_RECORD` y no `AUTO_CHARGE`. El día que exista pasarela, `GATEWAY` es un valor más del mismo enum y ninguna ruta cambia.

**El auto-registro no se vende por plan.** Está en el terreno de lo básico —media docena de apps lo dan gratis— y encima roza el bucle central, que CLAUDE.md dice que no se gatea nunca. No hay clave nueva en `FEATURES` ni `requireFeature` en la ruta.

**Los ingresos van después.** Auto-registrar un ingreso marca una deuda como pagada, y eso apaga mora, interés y recordatorios de ese cliente. La maquinaria es la misma en espejo.

> Está **construida** (fase 3) pero eso no cambia la decisión de despliegue: nace apagada en cada acuerdo, así que activarla sigue siendo un acto deliberado por acuerdo y por organización. Lo que conviene esperar es la recomendación en la UI, no el código.

---

## Fase 1 — icono, color y orden (hecha)

### Por qué columnas y no un `jsonb metadata`

La regla ya estaba escrita en el proyecto, en dos sitios: `organization_settings.accent_token` es un `varchar`, no un jsonb; y el comentario de `role_permissions` explica por qué esa tabla no es un array jsonb — «para que un permiso que sale del catálogo se pueda encontrar, y quitar, con una query».

De ahí sale el criterio: **jsonb es para valores cuyas claves el código no conoce** (`audit.before/after`, `notifications.payload`, `plans.features`, `settings.ui_config`). `icon` y `color` los lee el backend, salen en el DTO, viajan en `openapi.json` y los va a mencionar Numi. Eso es una columna.

### Lo que cambió

Tres columnas nuevas en `billing_concepts` y en `expense_categories`:

| Columna | Tipo | Para qué |
| --- | --- | --- |
| `icon` | `varchar(60)` | Clave del catálogo `ICON_KEYS`. Null = sin icono |
| `color` | `varchar(40)` | Token de `ACCENT_TOKENS`. Null = color por defecto del tema |
| `position` | `smallint not null default 0` | Orden propio del usuario. Es el orden **por defecto** de las dos listas |

Y de paso, dos asimetrías que sobraban: `expense_categories` no tenía `updated_at` (era la única maestra sin él) y `billing_concepts` no tenía único por nombre (las categorías sí).

### El catálogo vive en `src/shared/ui/icon.ts`

`ICON_KEYS` y `ACCENT_TOKENS`, con el patrón `as const` + tipo derivado de siempre. Está en `shared` porque lo nombran dos módulos —conceptos y categorías— y mañana lo querrán métodos de pago y cuentas.

Es un catálogo y no un string libre por la misma razón que todos los demás: el frontend tiene que mapear cada clave a un glifo de verdad, así que un valor que nadie puede nombrar en TypeScript no se puede dibujar. Publicado como `z.enum`, **la lista entera viaja en el contrato** y el cliente se tipa desde ahí en vez de mantener su propia copia.

**Sin `enumCheck` en la base, a propósito**, y esto se aparta de lo que dice CLAUDE.md para los enums de negocio. Dos razones: el set crece cada vez que una vertical necesita un glifo nuevo, y un `CHECK` convertiría cada icono en una migración; y lo que cuesta un valor inválido aquí es un icono de reemplazo, no un saldo mal calculado. La guarda que importa —que no entre basura— ya está en el DTO. Es el mismo criterio que dejó `accent_token` como varchar pelado.

### Lo que cambia para el front

- `BillingConcept` y `ExpenseCategory` traen `icon`, `color` y `position`. `ExpenseCategory` además `updatedAt`.
- Los dos `POST` y los dos `PATCH` los aceptan. `icon` y `color` salen en el contrato como **enum cerrado**: la paleta y el set de iconos se leen de `openapi.json`, no se hardcodean.
- **El orden por defecto de las dos listas cambió** de `name` a `position` (con `name` como desempate). `?sort=name` y `?sort=createdAt` siguen ahí.
- Reordenar es un `PATCH` por elemento movido con su `position` nueva. No hay endpoint de reordenamiento masivo: con listas de 10-30 elementos no lo vale.
- Las organizaciones nuevas nacen con icono y color puestos: `ORG_TEMPLATES` los trae por vertical. Las que ya existían quedan con `null` y `position: 0` — la lista se ve exactamente igual que antes hasta que alguien los ponga.

### Al desplegar

`pnpm db:migrate`. La migración añade un **único por (organization_id, name) en `billing_concepts`**, así que si alguna organización tiene dos conceptos con el mismo nombre, falla. Compruébalo antes:

```sql
SELECT organization_id, name, count(*) FROM billing_concepts GROUP BY 1,2 HAVING count(*) > 1;
```

### Un bug de años que salió al tirar de este hilo

El único nuevo por nombre no daba 409 sino **500**. La causa no era el índice: `isUniqueViolation` leía `err.code`, y Drizzle 0.45 envuelve el error del driver en uno suyo que lleva el SQL pero no el SQLSTATE. Es decir, **ninguna** violación de único del proyecto se estaba reconociendo — doce sitios, incluido `idempotency-store.reserve()`, cuyo camino de replay es literalmente «el insert perdió la carrera, así que la clave es de otro». Con el detector ciego, dos peticiones simultáneas con la misma `Idempotency-Key` reventaban en vez de reproducirse.

Arreglado en `@/shared/db/errors`: ahora recorre la cadena de `cause` (acotada, por si alguien encadena un error consigo mismo). Cubierto en `tests/unit/db-errors.test.ts`.

Lo que **no** era un bug, ya que estábamos: el 500 devolvía el SQL y los parámetros en el cuerpo. Está gateado a no-producción (`config.isProd || exposeErrorDetails`), así que se queda como está.

### Pendiente relacionado, no hecho

`organization_settings.accent_token` sigue siendo un string libre. Aplicarle `ACCENT_TOKENS` es una línea en el DTO, pero **endurece un endpoint que ya existe** (empezaría a rechazar valores fuera del catálogo), así que va como decisión aparte y no colada en esta fase.

---

## Fase 2 — auto-registro de gastos recurrentes (hecha)

El caso: tengo un recurrente «Netflix» en la categoría Diversión. Netflix se cobra solo. Quiero que llegado el día quede registrado sin que yo entre a la app.

### Dónde vive la configuración

**En un endpoint propio**, no como un campo más del `PATCH` del recurrente. Es el mismo argumento que ya se hizo con `approval-policy`: apagar —o encender— un control financiero no puede ser un campo que alguien limpia sin querer al cambiar otra cosa.

```
PUT /organizations/:orgId/expense-schedules/:id/auto-charge
csrfProtection → requireAuth → requireTenant → requirePermission('disbursements.create')
```

El permiso **no** es `expense_schedules.manage`: encender el auto-registro delega en la máquina la autoridad de sacar plata de una cuenta, y quien puede editar un recurrente pero no registrar egresos no debería ganarla por esta puerta. Un solo guard, el fuerte — `route-inventory.ts` toma el primero que encuentra, así que dos guards en cadena se aplicarían pero el contrato solo anunciaría uno.

### Modelo

En `expense_schedules`:

```
auto_charge_mode              varchar(20) not null default 'OFF'   -- OFF | AUTO_RECORD
auto_charge_account_id        uuid → financial_accounts
auto_charge_payment_method_id uuid → payment_methods
auto_charge_start_date        date        -- fecha local de la org al encenderlo
auto_charge_enabled_by        uuid → users
```

Con un `CHECK` en el espíritu de `disbursements_movement_check`: o el modo es `OFF`, o los otros cuatro están completos. Que el estado imposible no sea representable.

En `disbursements`, la garantía de idempotencia:

```
auto_charged_expense_id uuid → expenses
+ uniqueIndex parcial where auto_charged_expense_id is not null
```

Esto es lo que hace el job re-ejecutable **por construcción**, igual que `ux_expenses_schedule_period` hace idempotente al generador. Nunca «¿ya corrí hoy?» como única guarda.

Consecuencia deliberada: si un auto-registro se **reversa** o se **rechaza**, el índice impide que el job lo rehaga. Correcto — lo que un humano deshizo no se rehace solo al día siguiente.

### El job

Nuevo `run-auto-charges`, en la cadena diaria **después** de los generadores: no se puede pagar lo que no se ha generado.

```
generate-recurring-receivables → accrue-overdue-interest → generate-recurring-expenses → run-auto-charges
```

Selecciona, por organización y en **su** fecha local: gastos `OPEN`, con saldo > 0, cuyo recurrente esté en `AUTO_RECORD`, vencidos a hoy, dentro de la ventana `[auto_charge_start_date, hoy-31d]`, y sin desembolso automático previo.

**Una transacción por cargo, no por organización**: un recurrente con la cuenta archivada no puede tumbar los otros once. Es la misma decisión que ya tomaron los generadores al commitear cada cuenta por separado.

### Las siete invariantes

1. **Idempotencia por índice único**, no por marcador de ejecución.
2. **Lock y releer dentro.** `expenses.lockAll` en el mismo `LOCK_NS.expense` que usa el camino manual, y se registra el **saldo leído dentro de la transacción**, no el `agreed_amount` del recurrente: si alguien lo pagó a mano ayer, el saldo es 0 y no pasa nada.
3. **El umbral de aprobación sigue vigente.** Por encima del umbral el job crea un `PENDING_APPROVAL` **sin movimiento**. Un cargo automático no es una puerta trasera al control de aprobaciones. Y como `created_by` es `null`, el check de «quien registra no aprueba» pasa para cualquier aprobador: sale gratis.
4. **Sin retroactividad.** `auto_charge_start_date` + ventana máxima de 31 días. Encender el auto-registro en un recurrente con ocho meses abiertos no dispara ocho cargos; lo que queda fuera de la ventana genera un aviso, no un movimiento.
5. **Actor sistema.** `created_by: null`, y la auditoría (`DISBURSEMENT_AUTO_CHARGED`) guarda en `after` quién lo encendió. La pregunta que hay que poder responder meses después es *quién autorizó que esto se registrara solo*.
6. **Los fallos son ruidosos.** Cuenta inactiva, moneda distinta, método borrado → tipo nuevo `auto_charge.failed`, con `disbursements.read` como permiso requerido. Una automatización que falla en silencio es peor que no tenerla.
7. **Reversible por el camino de siempre.** No hay «anular cargo automático»: es `disbursements.reverse`, la historia es inmutable y ya está construido.

### Saldo insuficiente: se registra igual

Las cuentas financieras son un libro mayor, no un banco. Netflix te cobra aunque estés en rojo, y ocultarlo sería mentirle al saldo. `scan-low-balance` ya avisa. Cero código nuevo.

### Cómo quedó escrito

El job **no** reimplementa nada: llama a `disbursements.autoRecord`, un caso de uso nuevo que comparte transacción, lock, umbral y reglas de asignación con `register`. Un job con su propia copia de esas reglas es un job que se separa de ellas.

`autoRecord` no recibe importe. La suma es lo que el gasto deba cuando la transacción lo lee bajo el lock, porque dejar que el llamante la nombre es dejar que un número viejo decida cuánto dinero se movió.

`expense-schedule.use-cases` pasó de `withTransaction` a `UnitOfWork` inyectado, que es lo que permitió probar todo esto sin Postgres.

### Sobre el test de concurrencia: lo que prueba y lo que no

Se intentó lo que pedía este documento —el job contra un egreso manual por el mismo gasto— y **pasa igual con el lock quitado**, así que como prueba del lock no vale. El motivo: el job arranca leyendo todas las organizaciones, y para cuando entra en su transacción las peticiones manuales —que toman su propio lock y se serializan entre ellas— ya commitearon. Ni con cuatro peticiones en vuelo se consigue el entrelazado de forma fiable.

Lo que sí falla al quitar el lock, y de forma determinista, es la aserción de **orden** en `tests/unit/auto-charge-record.test.ts`: `lock` y después `read`. Un saldo leído antes del lock es exactamente el dato viejo del que el lock protege, así que invertir esas dos líneas deja el código idéntico y sin garantía; esa aserción lo caza.

El test de integración se queda como red de regresión sobre el resultado —el gasto se paga una vez, no dos— con esa distinción escrita en el propio test, para que nadie lo lea como lo que no es.

### Lo que no se hizo, y por qué

El aviso de «se quedó fuera de la ventana» que este documento pedía. Un gasto que cae fuera del retroceso sigue abierto y vencido, así que **`scan-payable-reminders` ya avisa de él**: un segundo aviso por el mismo hecho es ruido, y encima diario. `auto_charge.failed` queda solo para fallos de verdad —hoy, la cuenta de origen archivada después de armar, y cualquier error inesperado al escribir.

### Tests

- `tests/unit/auto-charge.test.ts` — la ventana por sus bordes (8).
- `tests/unit/auto-charge-record.test.ts` — saldo bajo lock, orden del lock, umbral sin movimiento, choque del índice único (8).
- `tests/unit/auto-charge-job.test.ts` — día local, conteos, cuenta archivada, aislamiento de fallos (5).
- `tests/integration/auto-charge.test.ts` — endpoint, idempotencia de la segunda pasada, umbral, moneda cruzada, apagado, RBAC y la carrera (7).

---

## Fase 3 — ingresos (hecha)

La misma maquinaria en espejo: `payments.auto_charged_receivable_id` con su único parcial, `billing_agreements` con las mismas cinco columnas y su `CHECK`, `PUT .../billing-agreements/:id/auto-charge` con **`payments.create`**, el job `run-auto-collections` detrás del de egresos, y `auto_collect.failed`.

La advertencia que hay que poner en la UI: sirve para plata que **sabes** que entra (una transferencia fija, un arriendo que recibes por domiciliación), no para «ojalá pague». Auto-registrar un ingreso apaga la mora de ese cliente.

**Dos asimetrías con el lado egresos, deliberadas:**

- **No hay umbral de aprobación.** El umbral es un control sobre el dinero que sale y no tiene nada que decir sobre el que entra. Lo que este lado necesita es contención al encenderlo, y por eso nace apagado.
- **Se cobra el saldo de `v_receivable_balances`**, que ya incluye ajustes e intereses devengados. Un acuerdo que se cobra solo cobra lo que se debe hoy, mora incluida, no lo que se pactó hace meses.

### El vocabulario se mudó a `shared`

`AUTO_CHARGE_MODES`, las reglas de ventana y los esquemas Zod viven ahora en `src/shared/auto-charge/`, con la misma forma que `shared/money` (`auto-charge.ts` + `auto-charge-schema.ts`). Lo obligó la fase 3 y es la definición correcta: un gasto que se paga solo y un acuerdo que se cobra solo son la misma instrucción permanente en direcciones opuestas, así que el contrato lo dice **una vez** —`AutoCharge` y `SetAutoCharge` son un solo esquema— y el frontend necesita un solo componente. Dos `.meta({ id })` del mismo concepto habrían chocado en `openapi.json`, que es el contrato diciendo lo mismo.

---

## Fase 4 — alta de recurrente sin pasar por contactos (hecha)

Hoy `CreateExpenseSchedule` exige `supplierContactId: z.uuid()`, así que dar de alta Netflix son dos peticiones y dos pantallas: primero crea el proveedor, después el recurrente. Con nueve suscripciones son nueve desvíos a un formulario que a nadie le interesa llenar. Numi tiene el mismo problema: su tool dice «obtén los identificadores con find_contact», y si el contacto no existe la conversación se traba.

**La base de datos no cambia.** `supplier_contact_id` sigue `notNull` con su FK: `v_expense_balances` lo expone, hay un índice por proveedor y los reportes agrupan por él. Un null ahí dejaría «¿cuánto le pago a cada proveedor al año?» con un agujero permanente.

Lo que cambia es **quién lo rellena**. El DTO acepta uno u otro, nunca los dos:

```ts
supplierContactId: z.uuid().optional(),
supplierName: z.string().trim().min(1).max(200).optional(),
// .refine(uno xor el otro)
```

Y el caso de uso resuelve el nombre a un id dentro de la misma transacción: busca un contacto `COMPANY` con ese nombre en la organización y lo crea si no está. Find-or-create es un check-then-act, así que va detrás de un `advisoryXactLock(LOCK_NS.contact, orgId|nombre)`: `contacts` no tiene único por nombre (solo por documento), y sin lock un doble clic deja dos «Netflix».

Tres detalles:

- **El atajo crea siempre un `COMPANY`**, a propósito. El `CHECK` de contactos exige `company_name` para COMPANY y `first_name` para PERSON, y partir «Juan Pérez» por adivinanza es la clase de heurística que envejece mal. El atajo cubre el caso que lo motiva —una marca que te cobra—; una persona con documento y teléfono sigue por el formulario completo, que es donde esos datos importan.
- **Sí, es una puerta lateral para crear contactos, y aquí se deja abierta.** Es el mismo análisis que en la fase 2 con conclusión contraria, y la diferencia es la que vale: encender el auto-registro delega autoridad para gastar; un contacto es una etiqueta inerte. En los cinco roles predefinidos ni se nota — `ACCOUNTANT` ya trae `contacts.write` desde `OPERATOR`.
- **Una sola transacción.** Contacto y recurrente entran o no entran juntos; con dos peticiones, si la segunda falla queda un contacto huérfano que nadie recuerda haber creado.

El mismo patrón, idéntico, para `billing_agreements.payerContactId` con `payerName`.

### Cómo quedó

El resolutor vive en `contacts/application/counterpart-resolver.ts` y **no** en un adaptador, y esa ubicación es la decisión que importa: crear un contacto no es solo un insert, gasta el cupo `max_contacts` de la organización. Un atajo que se saltara ese control sería una forma de crear contactos por encima del tope del plan, así que llama al mismo `limits.ensureRoom` dentro de la misma transacción que el caso de uso normal. La auditoría marca `source: 'recurring-agreement'`, que es la pregunta que alguien se hará meses después al ver una fila que nadie recuerda haber creado.

El lock (`LOCK_NS.contact`, nuevo) va por organización **y nombre**: dos proveedores distintos creándose a la vez no tienen por qué esperarse.

Numi también lo aprovecha: sus dos tools de recurrentes ya no exigen resolver el contacto antes, así que «créame un recurrente de Netflix por 44.900 el día 5» se resuelve en un solo tool call.

**El test de la carrera aquí sí prueba el lock**, a diferencia del de la fase 2: se comprobó quitándolo y se pone rojo con dos contactos. Las dos peticiones son idénticas, así que se entrelazan solas.

### Tests

- `tests/integration/auto-collect.test.ts` — endpoint, idempotencia, sin umbral, moneda cruzada, apagado, RBAC (5).
- `tests/unit/payment-use-cases.test.ts` — `autoRecord`: orden del lock, saldo bajo lock, saltos, choque del índice (+4).
- `tests/integration/counterpart-by-name.test.ts` — alta por nombre, reutilización insensible a mayúsculas, la carrera, el XOR, y el espejo en cartera (5).
