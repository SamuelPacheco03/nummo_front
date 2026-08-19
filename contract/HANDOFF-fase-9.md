# Handoff — Fase 9 (autorización: rol → permiso → entitlement → límite)

Nummo pasa de "app con roles" a "producto vendido por planes". Eso obliga a separar dos preguntas que hoy se mezclaban: **¿este usuario puede hacer X?** (permiso) y **¿esta empresa pagó por X?** (entitlement). Son independientes y fallan distinto.

El modelo objetivo tiene cuatro capas. **Las cuatro están construidas y mergeadas a `dev`.** Las ramas de fase ya se borraron; lo que sigue vivo es `dev`.

| Capa | Pregunta | Estado |
| --- | --- | --- |
| **Rol** | ¿Quién es en esta organización? | ya existía |
| **Permiso** | ¿Puede ejecutar esta acción? | ✅ Fase 1, en `dev` |
| **Entitlement** | ¿El plan de la org lo incluye? | ✅ Fase 2 |
| **Límite** | ¿Le queda cuota? | ✅ gauges (Fase 2) · ✅ flujo (Fase 3) |

Y la Fase 5 (roles propios de cada organización) también está hecha: es la que convierte el catálogo de permisos en algo que una organización puede recombinar.

## Lo que cambia para el front

Regenera el cliente antes de nada (`pnpm api:gen` contra el `openapi.json` de `dev`). El contrato pasó de 73 a **101 paths**.

**Lo que hay que manejar sí o sí**

- **`ORGANIZATION_SUSPENDED` (403) es un estado nuevo de la UI.** Una organización suspendida o archivada queda en **solo lectura**: todo GET sigue funcionando y **cualquier** mutación responde 403 con ese código. No es un error puntual de una pantalla, es un modo de la aplicación entera — conviene un banner persistente y los formularios deshabilitados, no un toast por cada intento. Solo la plataforma puede revertirlo; el OWNER ya no puede cambiar el estado de su propia organización.
- **`FEATURE_NOT_AVAILABLE` (403)** — el plan no lo incluye. `details: { feature, plan }`. La respuesta correcta no es «algo falló» sino «mejora tu plan».
- **`LIMIT_EXCEEDED` (409)** — se acabó el cupo. `details: { limit, max, used, plan?, period? }`. Se resuelve mejorando el plan **o** liberando espacio (archivar contactos, quitar miembros). `period` solo viene en las cuotas que se reinician cada mes.
- **`error.code` es ahora un enum cerrado** de diez valores en el contrato, así que un `switch` sobre él puede ser exhaustivo. `LimitExceededDetails` y `FeatureNotAvailableDetails` se publican como esquemas con nombre: no hay que adivinar la forma de `error.details` en los dos casos donde importa.

**La llamada que ahorra la mitad del trabajo**

`GET /organizations/:orgId/me/capabilities` → `{ organizationId, role, permissions[], planCode, features{}, limits{}, period, usage{} }`.

Una sola llamada al entrar a la organización y el front pinta menús, deshabilita acciones y muestra el upsell sin duplicar reglas. Detalles que evitan sorpresas:

- `permissions` sale como **enum tipado**, no `string[]`.
- `features` y `limits` traen **todas** las claves del catálogo. Un límite en `null` es «sin tope», nunca «no sé».
- `usage` trae **todas** las métricas del periodo en curso; una que nunca se usó es `0`, no una clave ausente. `period` dice a qué mes corresponde **en la zona horaria de la organización**, que no tiene por qué ser la del navegador.
- **Ocultar un botón no es autorización.** El backend vuelve a verificarlo todo; esto es solo para que la UI no ofrezca lo que va a fallar.

**Lo que el contrato te dice por operación**

`openapi.json` anota cada operación con **`x-required-permission`** (62 de ellas) y con **`x-required-feature`** donde el plan decide (hoy las seis de credenciales BYOK). Ambas se derivan del router real, así que no pueden desincronizarse. Es la fuente para decidir qué se muestra, en vez de hardcodear nombres de rol.

**Lo que NO cambió**

Los cinco roles pueden exactamente lo mismo que antes de todo esto. La migración de roles a permisos fue deliberadamente sin cambio funcional: si el front ya funcionaba, sigue funcionando salvo por los estados nuevos de arriba.

**Catálogo de planes, para la pantalla de precios**

`GET /api/v1/plans` → los planes en venta, en orden de presentación. No es tenant-scoped y pide sesión: la app vive detrás del login y los precios no se publican a quien encuentre la URL.

Devuelve solo los públicos y no archivados — hoy Free, Básico y Pro; **Empresa existe pero no está a la venta**, porque lo que justificaría su precio aún no está construido. Cada plan trae el catálogo **completo** de features y topes resueltos, igual que `capabilities`: lo que anuncia la tabla es exactamente lo que aplican los guards.

Ojo con `price`: **`null` significa «sin precio publicado» («consultar»), no gratis.** El plan Free trae `{ amount: "0.00", currency: "COP" }`. Los precios de Básico y Pro siguen sin definir, así que llegan en `null` hasta que se fijen desde la consola; la pantalla debe saber pintar ese caso.

**Superficie de superadmin**

`/api/v1/admin/*` (7 endpoints) es la consola de plataforma: listar organizaciones, cambiar su plan, aplicar overrides, suspender, y editar planes con su precio. Va **en la misma app, como ruta protegida**.

Para decidir si se ofrece esa ruta: `GET /api/v1/me/platform-access` → `{ isPlatformAdmin }`. Es su propio endpoint y no un campo de `/auth/me` para no hacer que `auth` —el módulo del que dependen todos— dependa de `platform`. Llámalo en paralelo con `/auth/me` al arrancar.

Es **orientativo**: sirve para no pintar un menú que va a fallar, no para autorizar. Cada petición a `/admin/*` lo vuelve a comprobar contra la tabla, así que un cliente que se mienta a sí mismo solo consigue un 403. Y ningún rol de organización da acceso: ser OWNER de la tuya no te hace superadmin.

## Lo que se hizo en la Fase 1 (commits en `dev`, merge `4e225ab`)

- `src/modules/organizations/domain/permission.ts` — catálogo cerrado de 53 permisos (`as const` + tipo derivado) y `OWNER_ONLY_PERMISSIONS`.
- `src/modules/organizations/domain/role-permissions.ts` — el mapa rol→permisos, escrito **en cascada** (`VIEWER ⊂ OPERATOR ⊂ ACCOUNTANT ⊂ ADMIN ⊂ OWNER`). Los tres conjuntos de roles que usaban los guards viejos ya estaban perfectamente anidados; escribirlo así es lo que hace la migración demostrablemente equivalente.
- `src/shared/http/rbac.ts` — `requireRole` **eliminado**, sustituido por `requirePermission(permission)`. Un permiso por guard: con varios la semántica AND/OR queda ambigua y la ruta deja de mapear a un permiso auditable. El handler se etiqueta con un símbolo (`PERMISSION_GUARD`) porque el inventario necesita el valor, no solo saber que hay guard.
- `src/app/middleware/tenant.ts` — `req.membership` incluye ahora `permissions`, resuelto de un `Set` congelado en memoria: **autorizar no cuesta ni una query**.
- Los 18 guards migrados en 14 routers, preservando quién pasaba en cada endpoint. Se partieron por acción donde el rol los mezclaba: `payments.create` ≠ `payments.reverse`, `contacts.write` ≠ `contacts.archive`. Hoy los tiene el mismo rol; existen para que un rol personalizado pueda distinguirlos sin volver a tocar rutas.
- Los tres POST del asistente (`/chat`, `/transcribe`, `/chat/audio`) llevan `assistant.use`, que tienen todos los roles. No cambia nada; los saca de ser una excepción invisible.
- **Numi ya no espeja roles a mano**: `write-tools.ts` mantenía `WRITE_ROLES`/`MANAGE_ROLES` con el comentario "mirrors the HTTP canOperate". Ahora cada tool declara el mismo permiso que su endpoint gemelo. Las 18 tools de lectura declaran su `.read`.
- `src/app/route-inventory.ts` — recorre el stack de Express y reporta cada ruta con su permiso. Lo consumen el test anti-drift y las anotaciones del OpenAPI.

### Los tests que sostienen esto

- `tests/integration/permissions-matrix.test.ts` — 34 endpoints × 5 roles. Solo comprueba 403-o-no-403, así que los cuerpos no necesitan ser válidos: lo que se prueba es el guard, no el caso de uso. **Verificado sensible**: cambiando un solo permiso de una ruta, falla y dice cuál.
- `tests/unit/route-guards.test.ts` — falla si una ruta que muta datos de una organización llega sin permiso (hoy son 61 y ninguna se escapa). Lleva dos aserciones de cordura (`routes.length > 80` y una ruta conocida) porque lee internals de Express: si un bump cambiara la forma del stack, el walker devolvería lista vacía y el test pasaría en verde sin probar nada. Incluye snapshot del mapa endpoint→permiso, para que cualquier cambio de autorización se vea en el diff de la PR.
- `tests/unit/role-permissions.test.ts` — compara, permiso a permiso, que los titulares son exactamente los de antes de la migración.
- `tests/unit/numi-write-tools.test.ts` — **no se tocó**. Que siga verde sin editarlo es la prueba de que el asistente ofrece las mismas herramientas. (`toolsForRole` se conservó delegando en `toolsFor`.)

## Lo que se hizo en la Fase 2

- `src/modules/platform/` completo: catálogo de `FEATURES` y `LIMIT_KEYS` (con su `kind`: gauge o counter), `PLAN_CODES`, y `mergeOverrides` descartando lo que no esté en el catálogo.
- Tablas `plans`, `subscriptions` (una activa por organización, índice único parcial) y `organization_entitlements`. Cambiar de plan cierra la suscripción anterior y abre otra: el histórico de planes queda consultable.
- `scripts/ops/seed-plans.ts` (`pnpm seed:plans`) siembra los cuatro planes **y hace el backfill en la misma corrida**, para que no exista el estado intermedio de planes sembrados sin entitlements. Es idempotente y no recalcula lo que ya existe: aplicar una edición de plan a los clientes actuales sigue siendo un acto deliberado (`recomputeForPlan`).
- `requireFeature` con su símbolo, igual que los permisos, así que el inventario de rutas lo ve y el OpenAPI lo anota. Los entitlements se resuelven _lazy_ y memoizados por petición.
- `FEATURE_NOT_AVAILABLE` (403) y `LIMIT_EXCEEDED` (409) en `domain-error.ts`.
- Gauges aplicados: `max_contacts`, `max_users` y `max_branches`, contando dentro de la misma transacción que la escritura, detrás de un advisory lock por organización+clave. Los contactos archivados no gastan cupo.
- Crear una organización abre su suscripción y su snapshot en la misma transacción. Contactos, miembros, sedes y organizaciones migraron de `withTransaction` a `UnitOfWork` inyectado.
- **327 tests verdes** (53 archivos). Los dos tests de concurrencia nuevos se verificaron quitando el lock: sin él, tres de cinco creaciones simultáneas pasan el tope.

### Lo que deliberadamente no se hizo

- **Numi no se gatea.** Chat y voz corren con los modelos de la plataforma en todos los planes; lo que vende `ai_byok` es traer tu propia llave, así que el guard está en las seis mutaciones de credenciales y en ninguna otra parte. Es también lo que hace que el riesgo del orden de despliegue sea estructuralmente imposible y no solo improbable.
- **Sin `setOverrides` ni superficie de administración**: los overrides se almacenan y se respetan en cada recompute, pero quien los escribe es la Fase 4.
- **Sin guards en los GET**, igual que en la Fase 1 y por la misma razón.

## Decisiones tomadas — no re-discutir

1. El módulo de planes se llama **`platform`**, nunca `billing`. `billing` ya significa "la organización factura a sus clientes" (conceptos, acuerdos, cartera). Mezclarlos sería el peor bug conceptual posible en un producto financiero.
2. Los planes viven **en una tabla**, no en una constante: hay que poder editar límites y features sin desplegar. Lo que **sí** es código es el *catálogo* de claves — `FEATURES` y `LIMIT_KEYS` como `as const` en `domain`, porque `requireFeature('custom_roles')` tiene que tipar. La tabla guarda los **valores** por plan, no inventa claves nuevas. Una clave que no esté en el catálogo se ignora al recomputar.
3. Los entitlements son un **snapshot materializado por organización**, recalculado al cambiar de plan — nunca un join por petición. Es lo que permite overrides por cliente (un Pro con 15 usuarios negociados) y respetar condiciones heredadas cuando cambies qué incluye un plan.

   Con los planes en tabla esto deja de ser solo una optimización y pasa a ser **la palanca de negocio**: editar la fila del plan no cambia nada para nadie hasta que alguien ejecuta `recomputeForPlan(code)`. Así puedes subir el tope de Pro y aplicarlo a todos, o bajarlo solo para los que entren desde ahora, sin que las organizaciones existentes se enteren. Que sea una acción deliberada del superadmin es la funcionalidad, no una molestia.
4. **El superadmin de plataforma no es un rol de organización.** Meterlo en el enum `ROLES` convertiría `PATCH /members/:id` en un vector de escalada de privilegios y rompería los invariantes de `countActiveOwners`. Va en `platform_admins`, con historia, y en su propia superficie `/api/v1/admin/*`.
5. Superadmin V1: ver organizaciones, cambiar plan, aplicar overrides, suspender. **Sin impersonación** por ahora.
6. Roles personalizados: **diseñados, no implementados**. El punto de extensión ya existe (`RequireTenantDeps` acepta un `PermissionResolver` opcional); ningún router cambiará cuando lleguen.
7. Un plan que no alcanza **no es un 402**. Proxies y clientes lo tratan de forma errática: es 403 `FEATURE_NOT_AVAILABLE` o 409 `LIMIT_EXCEEDED`, con `details` accionables.
8. Los GET siguen sin guard. Los cinco roles predefinidos tienen todos los `.read`, así que añadirlos hoy sería churn con riesgo y sin efecto. Se aplican con los roles custom, que es cuando alguien puede *no* tenerlos.

## Los planes (decididos)

Nummo es genérico: colegios, tiendas, personas y lo que venga. Los planes **no** se diferencian por vertical — el vertical (`ORGANIZATION_TYPES`) solo siembra datos maestros y es ortogonal al plan.

Se cobra por **capacidad**, con la IA como defensa de costo. La métrica principal es el número de clientes en cartera, porque es lo que mide el valor entregado: un colegio con 800 estudiantes recibe muchísimo más que una tienda con 30 clientes, y ambos pueden tener 2 usuarios.

| | Free | Básico | Pro | Empresa |
| --- | --- | --- | --- | --- |
| `max_contacts` | 30 | 200 | 1.500 | ∞ |
| `max_users` | 1 | 3 | 10 | ∞ |
| `max_branches` | 1 | 1 | 5 | ∞ |
| `ai_messages_monthly` | 50 | 300 | 1.500 | ∞ |
| `voice_minutes_monthly` | 10 | 30 | 150 | ∞ |
| `ai_byok` | ✗ | ✗ | ✓ | ✓ |
| `custom_roles` | ✗ | ✗ | ✓ | ✓ |

`∞` se representa como `null` en la columna `limits`.

Notas que importan al implementar:

- **La voz está en todos los planes**, con cuota. Se quiere que se pueda probar sin pagar: la transcripción cuesta centavos por minuto, así que 10 min/mes en Free es barato y es la mejor demo del producto. No hay bandera `ai_voice`; es un límite, no una feature.
- **No hay bandera `multi_branch`**: `max_branches: 1` ya impide multi-sede. Un booleano ahí sería redundante y una segunda fuente de verdad.
- **`max_organizations` no está en la tabla, a propósito.** Ver «Cuántas organizaciones puede crear alguien», más abajo: no es un límite de la organización, así que no vive en el plan de la organización.
- Por eso el mapa `features` arranca con **dos entradas reales** (`ai_byok`, `custom_roles`) y el peso lo llevan los límites, que son gauges sencillos sobre tablas que ya existen. `accounting`, `bank_reconciliation`, `approvals` y `api_access` se declaran en el catálogo en `false` para todos: existen como clave desde ya, se encienden cuando se construyan.
- **Empresa no es vendible todavía.** Lo que justificaría su precio —aprobaciones, auditoría consultable, API— no está construido. El código de plan existe; no lo pongas a la venta hasta que exista.
- **Lo que no se gatea nunca**, y esto es una regla del producto, no una decisión de precio: la integridad y la historia (reversas, ajustes, movimientos pasados), el bucle central (cartera, mora, recurrencia, pagos) y los reportes. Si alguien no puede corregir un error o ver su propio histórico porque no pagó, se rompe la confianza y probablemente una obligación legal. Y si el Free no hace el bucle central, nadie adopta y nadie sube de plan.
- **Al bajar de plan** se bloquea la creación, nunca se borra. Un colegio que baja de Pro con 800 contactos los conserva y los sigue viendo; simplemente no puede agregar más.

Cifras provisionales: se ajustan editando la fila del plan y decidiendo si se aplica a los existentes. Los precios en pesos siguen sin definir y no bloquean nada del backend.

## Cuántas organizaciones puede crear alguien

Esto **no es un límite de plan**, y confundirlo cuesta caro. Quien crea varias organizaciones suele ser: alguien con su negocio y sus finanzas personales (el vertical `PERSONAL` existe para eso), un contador con varios clientes, o un grupo con varias razones sociales. En los tres casos **cada organización trae su propia suscripción y su propio pagador**. Limitarlo sería cobrarle dos veces a quien más te aporta.

Lo único de lo que hay que defenderse es de multiplicar el plan gratis: 500 organizaciones Free son 25.000 mensajes de IA gratis al mes. Eso es **anti-abuso**, no precio, y va donde van los otros controles anti-abuso — la configuración, junto a los rate limits.

```
FREE_ORGANIZATIONS_PER_USER = 2
```

**Implementado así** (variable de entorno, no constante: es un dial que querrás mover mirando datos, y moverlo no debería ser un cambio de código). El conteo va con lock por `userId` dentro de la transacción que crea la organización, y una organización sin suscripción cuenta como gratis — si no, el tope sería inaplicable en la ventana anterior al backfill.

Se cuentan solo las organizaciones **activas donde el usuario es OWNER y cuyo plan es FREE**. Ser miembro de una organización ajena no cuenta. Las de pago no tienen tope: si la pagas, la tienes.

Propiedades que salen gratis de plantearlo así:

- El contador con ocho clientes de pago crea la novena sin pedir permiso.
- Si subes una de tus dos gratuitas a Básico, puedes crear otra gratuita: el sistema premia justo lo que quieres.
- Si alguien baja un plan y queda por encima del tope, conserva todo y no puede crear más — la misma regla de siempre: bloquear creación, nunca borrar.

**No declares `max_organizations` en la tabla de planes «por si acaso».** Una columna que existe y nadie lee es una trampa: dentro de seis meses alguien la ve muerta, cree que es un bug y la conecta mal, porque conceptualmente no tiene dónde encajar.

Si algún día vendes **Nummo para contadores** —un plan para quien administra la cartera de muchos clientes— eso sí es un plan a nivel de *cuenta*, otro sujeto (`user_entitlements` o similar) y con su propio diseño. Nada de lo que se decida ahora cierra esa puerta.

## Fase 2 — Entitlements y planes · ✅ hecha · en `dev`

Módulo nuevo `src/modules/platform/`:

- `domain/feature.ts` — catálogo cerrado de claves de feature (`as const` + tipo derivado, igual que `PERMISSIONS`).
- `domain/limit.ts` — claves de límite, y su `kind`: **gauge** (`max_contacts`, `max_users`, `max_branches`) o **counter** (`ai_messages_monthly`, `voice_minutes_monthly`). Se evalúan distinto; ver Fase 3.
- `domain/plan.ts` — solo `PLAN_CODES` y las invariantes. Los valores viven en la tabla.
- `domain/entitlements.ts` — `mergeOverrides(planFeatures, planLimits, overrides)`, y el descarte de claves fuera del catálogo.
- `shared/db/schema/platform.ts` — `plans(code PK, name, description, isPublic, sortOrder, features jsonb, limits jsonb, createdAt, updatedAt, archivedAt)`, `subscriptions` (una activa por org, `uniqueIndex` parcial con `where`) y `organization_entitlements(organizationId PK, planCode, features jsonb, limits jsonb, overrides jsonb, computedAt)`. Patrón de jsonb tipado ya existente en `organizations.ts` (`uiConfig`).
- `application/` — `EntitlementsReader.snapshot(orgId)`, `recomputeForOrg`, **`recomputeForPlan(code)`** (el que aplica una edición de plan a las organizaciones que lo tienen) y `changePlan` (dentro de `uow.run`: cambia suscripción + recomputa + audita, atómico).
- Los cuatro planes entran por **seed** (`scripts/ops/seed-plans.ts`), no por migración — misma convención que `scripts/seed.ts`. Editar un plan después es un UPDATE desde el panel de superadmin, no un deploy.
- `shared/http/entitlement-context.ts` + `requireFeature(feature)`. Orden final:
  `csrf → requireAuth → requireTenant → requirePermission → requireFeature → idempotency`.
  **Permiso antes que feature**: el permiso es un `Set` en memoria y la feature es una query, así que el barato va primero; y quien no tiene permiso no debería enterarse de qué incluye el plan. Ambos antes de `idempotency`, que reserva la clave en tabla — una petición que va a ser rechazada no debe quemar una `Idempotency-Key`.
- Los entitlements se resuelven **lazy**: `requireTenant` adjunta `req.resolveEntitlements` memoizada por request. Los endpoints sin feature siguen con cero queries extra.
- Errores nuevos en `domain-error.ts` + `ErrorCode`.
- Límites **gauge** (contar y comparar dentro del caso de uso, en la misma `uow.run` que la escritura): `max_contacts` en `contact.use-cases.ts`, `max_users` en `member.use-cases.ts`, `max_branches` en `branch.use-cases.ts`.
- **El tope de organizaciones gratuitas** (ver la sección propia, arriba) se valida en `organization.use-cases.ts create()`, que es donde todavía no hay `orgId` y por eso no cabe en middleware. Hace falta:
  - Un método de repositorio que cuente organizaciones activas donde el usuario es OWNER y el plan es `FREE`. Es una consulta **por usuario**, la excepción legítima a «toda consulta se filtra por `organizationId`»: aquí el sujeto es el usuario, no un tenant.
  - `LimitExceededError` (409) con `details`, y un mensaje accionable — la salida es mejorar el plan de alguna de las que ya tiene.
  - Migrar ese caso de uso de `withTransaction` a `uow` inyectado. Es la política de CLAUDE.md («se migran cuando los toques») y habilita probarlo sin Postgres.
  - Un advisory lock por `userId` (namespace nuevo en `LOCK_NS`) para que dos peticiones simultáneas no cuelen una organización de más. Más por consistencia con la regla del repo que por necesidad: a diferencia de los saldos, aquí un off-by-one no es un bug de dinero.
- `GET /organizations/:orgId/me/capabilities`.
- **Orden de despliegue**: migración → seed de planes → backfill de entitlements → recién entonces activar `requireFeature`. Con fallback a plan por defecto en `snapshot()` como red de seguridad, para que ninguna organización existente pierda acceso.

## Fase 3 — Límites de flujo · ✅ hecha · en `dev`

### Lo que se encontró al empezar, y hay que saber

El plan de esta fase daba por hecho que «chat y voz corren con los modelos de la plataforma en todos los planes». **No era cierto en el código**: `ActiveModelResolver` solo miraba las credenciales de la organización y, sin ninguna, el chat respondía «el asistente no está configurado». Es decir, Numi era BYOK-only en la práctica — y como BYOK pasó a ser Pro+ en la Fase 2, una organización Free no podía usar Numi en absoluto y `ai_messages_monthly: 50` no significaba nada.

Sin resolver eso, toda la fase habría sido código muerto: la cuota solo aplica a lo que paga la plataforma, y la plataforma no pagaba nada. Así que los resolvers ahora caen a la credencial de plataforma cuando la organización no trae la suya, y marcan la fuente (`PLATFORM` / `BYOK`).

- El chat ya tenía su credencial de plataforma declarada en configuración (`ANTHROPIC_API_KEY` + `ASSISTANT_MODEL`) pero **sin cablear**; ahora se usa.
- Para la voz hubo que añadir la equivalente: `ASSISTANT_VOICE_PROVIDER`, `ASSISTANT_VOICE_MODEL`, `ASSISTANT_VOICE_API_KEY`, opcionales. Sin ellas la voz sigue siendo BYOK-only, exactamente como antes: no cambia el comportamiento de nadie que no las configure. **Decisión pendiente tuya**: con qué proveedor y qué llave se paga la voz de los planes gratuitos.

### Lo que se hizo

- `usage_counters(organizationId, metric, period, usedCount)` con PK compuesta, y el tope **dentro** de la sentencia. La condición va en las dos ramas del upsert: sin ella, el primer consumo de un periodo entraría aunque superara el tope entero, porque en una fila que no existe no hay conflicto que dispare la guarda del `DO UPDATE`. Verificado quitándola: cinco peticiones simultáneas pasan las cinco.
- Periodo `YYYY-MM` derivado del `Clock` en la zona horaria de la organización; sin job de reseteo.
- **Chat**: cobra un mensaje antes de llamar al modelo, en un paso atómico que es la puerta y el cargo a la vez.
- **Voz**: comprueba la puerta antes de gastar una transcripción y anota los minutos después de que el proveedor responda, para no cobrar lo que falló. Se factura sobre `durationSeconds` del proveedor y **nunca** sobre el `audioSeconds` del cliente, que es falsificable — ese campo se queda donde estaba, decorando la onda.
- Minutos redondeados hacia arriba con mínimo de uno: una nota de diez segundos cuesta un minuto, y una ráfaga de notas de un segundo no sale gratis.
- **354 tests verdes** (56 archivos).

### Diseño original de la fase (referencia)

- `usage_counters(organizationId, metric, period, usedCount)` con el tope **dentro** de la sentencia:
  `INSERT … ON CONFLICT … DO UPDATE SET used_count = used_count + $n WHERE used_count + $n <= $max RETURNING used_count`. Sin fila devuelta ⇒ `LimitExceededError`. Atómico bajo `READ COMMITTED` y **sin advisory lock**: a diferencia de los saldos, aquí no se lee para decidir, la condición viaja en el `UPDATE`. Va dentro de la misma `uow.run` que la operación.
- **No hace falta job de reset mensual**: `period` (`'YYYY-MM'`) se deriva del `Clock` en la zona horaria de la organización, así que "resetear" es cambiar de clave.
- Métricas V1: `ai_messages_monthly` y `voice_minutes_monthly`. **Las dos existen en todos los planes**, incluido Free — cambia la cuota, no la disponibilidad. La voz se contabiliza por minutos redondeados hacia arriba del audio recibido (`audioSeconds` ya llega en `AudioChatInput`), y se consume **después** de transcribir con éxito: si el proveedor falla, no se le cobra al cliente un minuto que no usó.
- **BYOK**: si la organización trae su propia API key de IA, la cuota de mensajes no aplica — paga ella el LLM. `ai_byok` (feature) y `ai_messages_monthly` (límite) se evalúan por separado. Requiere que `ActiveModelResolver` distinga `PLATFORM` de `BYOK`.

## Fase 4 — Superadmin · ✅ hecha · en `dev`

### Lo que se encontró al empezar, y hay que saber

`SUSPENDED` existía en `ORGANIZATION_STATUSES` y **no lo aplicaba nada**: suspender habría sido un botón que no hace nada. Ahora una organización que no está activa queda en **solo lectura**, comprobado en `requireTenant` y no ruta por ruta.

Solo lectura y no bloqueo total es deliberado: sigue viendo y exportando su historia, que es justo lo que la regla de producto dice que no se gatea nunca. Suspender es una medida comercial o antiabuso; dejar a alguien fuera de su propia contabilidad no lo es.

De paso salió un autobloqueo: `UpdateOrganizationInput` aceptaba `status`, así que un OWNER podía suspenderse a sí mismo y quedarse sin forma de revertirlo (revertir es una mutación). El campo sale del DTO del tenant — **cambio de contrato**, está en `openapi.json`.

Y una limitación de la tabla de auditoría: `audit_logs.entity_id` es `uuid`, y un plan se identifica por código. El código viaja en el payload; la historia de un plan se consulta por `entity_type = 'plan'`. No pareció que un caso justificara migrar una columna central.

### Lo que se hizo

- `platform_admins` con historia: una revocación se conserva, no se borra, porque un acceso que puede desaparecer sin rastro no es auditable. Índice único parcial sobre las concesiones vivas.
- `requirePlatformAdmin` tras `requireAuth` y **fuera** de `requireTenant`, con su símbolo para el inventario. Cuesta una query por petición, a propósito: el acceso a los datos de todos los clientes tiene que poder revocarse en el acto.
- Superficie `/api/v1/admin/*`: listar organizaciones con plan, miembros, contactos y consumo del periodo; ver el detalle con sus overrides; cambiar de plan; negociar features y topes por cliente; suspender y reactivar; listar y guardar planes.
- `applyToExisting` es obligatorio y **sin default** al guardar un plan. Devuelve a cuántas organizaciones alcanzó.
- Alta del primer superadmin por script (`pnpm admin:grant <email> [--revoke]`), nunca por endpoint.
- El test anti-drift ahora falla si una ruta de `/admin` llega sin guard — incluidas las lecturas — o si el guard de plataforma aparece fuera de `/admin`.
- **375 tests verdes** (58 archivos).

### Diseño original de la fase (referencia)

`platform_admins(userId, grantedAt, grantedBy, revokedAt)`. Superficie `/api/v1/admin/*` con `requirePlatformAdmin`, que corre tras `requireAuth` y **no** pasa por `requireTenant`. Alta del primer superadmin por script (`scripts/create-admin.ts` sirve de precedente), nunca por endpoint. Toda acción auditada sin excepción.

Capacidades V1: listar organizaciones con su plan y su consumo, cambiar el plan de una, aplicar overrides por cliente, suspender y reactivar (reusa `organizations.status = SUSPENDED`, que ya existe).

Y, como los planes son filas: **editar planes desde aquí**. Al guardar un plan hay que preguntar explícitamente si se aplica a las organizaciones que ya lo tienen —eso es `recomputeForPlan(code)`— porque cambiar precios o topes sin querer para clientes existentes es de las pocas cosas realmente difíciles de deshacer. Si la respuesta es no, el cambio solo afecta a quien entre desde ahora, que es el comportamiento normal de *grandfathering*.

Cuando llegue la impersonación: time-boxed, motivo obligatorio, read-only, y **sin desactivar el filtro por `organizationId`** en los repositorios. Con permisos vacíos el read-only sale gratis del diseño de la Fase 1 (los GET no llevan guard, las mutaciones sí). Hará falta una columna `platformActorId` en `audit_logs` para no registrar un movimiento de soporte como si lo hubiera hecho el cliente.

## Después de la Fase 4 — lo que se añadió sobre la marcha

Ninguna de estas es una fase: son huecos que aparecieron al conectar el front y al releer el contrato, y están todas en `dev`.

- **Una sola forma para `LIMIT_EXCEEDED`.** Los gauges mandaban `{ limit, max, current, plan }` y los contadores `{ limit, max, used, period, plan }`: mismo código de error, dos contratos, y el front vive en otro repositorio. Ahora hay un constructor tipado en `domain/limit.ts` y la forma vieja no compila. Gana `used`, y `period` queda opcional (solo lo traen las cuotas que se reinician).
- **`error.code` es un enum cerrado** en el contrato, y `LimitExceededDetails` / `FeatureNotAvailableDetails` se publican como esquemas con nombre. El front puede hacer un `switch` exhaustivo y no tiene que adivinar la forma de `details` justo donde la respuesta correcta es «mejora tu plan» o «libera espacio».
- **La ventana medida viaja de la puerta al cargo.** `ensureRoom` devuelve el periodo y el tope que ya tuvo que resolver, y `record` los recibe. El ahorro de queries es lo de menos: las dos mitades de una operación medida se juzgan contra la misma ventana aunque el plan cambie en medio. La zona horaria se cachea cinco minutos en el adaptador.
- **`GET /api/v1/plans`** — catálogo público (solo planes públicos y no archivados), resuelto contra el catálogo de claves y no contra el parche guardado: lo que anuncia la página de precios es lo que aplican los guards. Detrás de `requireAuth`, porque la app vive detrás del login.
- **Los planes ganan precio** (`priceAmount` `NUMERIC(18,2)` + `priceCurrency`), nullable a propósito: `null` es «sin precio publicado», que no es lo mismo que gratis. Free se siembra en `0.00`.
- **`GET /api/v1/me/platform-access`** — si la cuenta administra la plataforma, para que la consola sea una ruta protegida dentro de la misma app. Endpoint propio y no un campo de `/auth/me`, que haría que `auth` dependiera de `platform`. Es orientativo: `/admin` lo vuelve a comprobar en cada petición.
- **Guardar un plan obliga a decir qué es el plan.** `PUT /admin/plans/:code` reemplaza, pero `features`, `limits`, `isPublic`, `sortOrder` y `priceAmount` traían default, así que un cuerpo incompleto los vaciaba — y de forma permisiva, porque un límite ausente significa ilimitado: un guardado a medias con `applyToExisting: true` regalaba el producto sin tope a todos los clientes del plan. Ahora es 422.

## Fase 5 — Roles personalizados · ✅ hecha · rama `feat/custom-roles`

### Lo que se hizo

- `roles` + `role_permissions` por organización, y `organization_memberships.customRoleId`. Un rol propio **reemplaza** los permisos del rol base, no se suma: «qué puede hacer esta persona» tiene que tener una sola respuesta. El rol base se conserva como etiqueta y es lo que sigue contando `countActiveOwners`.
- **Ningún router cambió**, que era la promesa de la Fase 1: el `PermissionResolver` entra como puerto **opcional** en `makeRequireTenant`. Sin resolver cableado solo existen los cinco de siempre y autorizar no toca la base de datos.
- Caché corta (30 s) invalidada en el acto al editar un rol, con el id de la organización guardado en la entrada y comprobado al leer: un acierto de caché no puede ser lo que cruce la frontera del tenant.
- Tres cosas que no se pueden hacer: conceder permisos reservados al propietario (se rechazan **nombrándolos**, no se filtran en silencio), archivar un rol que todavía tiene miembros, y mover al propietario a un rol propio.
- Escribir roles se vende con el plan (`custom_roles`, ya en Pro); **leerlos no**. Quien baja de Pro conserva los que definió y sus miembros siguen trabajando: bloquear la creación, nunca borrar.
- Numi queda cubierto sin tocarlo: sus tools ya se filtran por el `Set` de permisos, así que un rol propio también decide qué herramientas ve el asistente.

### El barrido de lecturas

Con roles propios, un `.read` declarado que ninguna ruta comprueba es una promesa falsa al que escribe el rol. Eran **31 lecturas de tenant sin guard** —bastantes más de las dos que este documento anticipaba— y llevan guard todas menos `me/capabilities`, que es como el cliente averigua qué puede hacer: exigirle un permiso para preguntarlo sería circular. El test anti-drift lo fija con esa excepción por escrito.

Para los cinco roles predefinidos no cambia nada, porque todos tienen todos los `.read`. Eso es justo lo que hacía seguro añadirlos ahora y no antes.

**410 tests verdes** (61 archivos).

## Fase 6 — Aprobaciones por umbral · ✅ hecha · rama `feat/expense-approvals`

### Dónde vive el estado, y por qué ahí

El estado va en el **desembolso**, no en el gasto. Un gasto es una obligación; el egreso es el dinero saliendo, y es eso lo que se aprueba. Ponerlo en el gasto habría dejado fuera los dos caminos por los que sale plata sin gasto registrado —`ADVANCE` y `DIRECT_EXPENSE`—, que son justo por donde se escaparía un egreso grande.

El permiso quedó como **`disbursements.approve`** y no `expenses.approve` como decía este documento: el módulo ya nombra sus permisos por la entidad (`disbursements.create`, `.allocate`, `.reverse`) y el nombre viejo se escribió antes de elegir dónde iba el estado.

### Lo que se hizo

- `PENDING_APPROVAL` y `REJECTED` en `DISBURSEMENT_STATUSES`, `financial_movement_id` nullable y un `CHECK` que lo sostiene: solo `POSTED` y `REVERSED` tienen movimiento. Por encima del umbral **no se mueve un peso** hasta que alguien aprueba.
- Las filas de asignación se escriben desde el principio, porque `v_expense_balances` ya filtraba por `POSTED`. Una solicitud no baja el saldo de nada mientras espera, y lo que se pidió sobrevive al rechazo. No hizo falta tocar ninguna vista.
- **Aprobar revalida bajo lock**: la solicitud pudo esperar un día y el gasto pudo pagarse por otro lado. Hay test de eso.
- **Quien registra no aprueba**, comparando contra `createdBy`. Es lo que convierte el permiso en condición necesaria y no suficiente.
- El rechazo guarda motivo y decisor. No se borra.
- La política es `PUT /organizations/:orgId/approval-policy`, gateado por la feature **`approvals`**, que pasa a estar encendida en Pro y Empresa. Era una de las claves declaradas en `false` desde la Fase 2; **decisión de precio revisable desde la consola sin desplegar**.
- **425 tests verdes** (63 archivos).

### Lo que no se hizo, a propósito

- **Sin niveles de aprobación ni montos por aprobador.** Un umbral y una firma. Escalar a «más de 50 millones necesita dos firmas» es otra fase y necesita otra tabla.
- **Sin notificaciones.** Quien aprueba se entera filtrando por `status=PENDING_APPROVAL`; avisar es trabajo del front o de una fase de notificaciones.

## Estado del proyecto

Backend V1 + verticalización + BYOK + Numi (Fases A–D) + **las seis fases del plan** (1 a 5 en `dev`, la 6 en `feat/expense-approvals`). **425 tests verdes** (63 archivos), `openapi.json` sincronizado y anotado con `x-required-permission` y `x-required-feature`. `main` sigue en V1 y no se mergea hasta tener todo funcional; el trabajo va por `dev` con una rama por fase.

**Al desplegar, en este orden**: `pnpm db:migrate` → `pnpm seed:plans` (siembra + backfill) → arriba la app. Si el seed no llegara a correr, `snapshot()` cae a cero features y cero topes: nadie pierde acceso a sus datos, simplemente no hay features de pago hasta que existan las filas.
