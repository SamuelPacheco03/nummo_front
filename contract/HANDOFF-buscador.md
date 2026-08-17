# HANDOFF — Buscador global (Frontend → Backend)

**Fecha:** 2026-08-17 · **Estado: el buscador ya funciona con el contrato v1.0.0 congelado.** Nada
de lo que hay aquí bloquea nada; son tres mejoras que el frontend no puede hacer solo y que
abaratan mucho la pantalla.

## Qué hace hoy el buscador

La paleta (`⌘K`, o la lupa en móvil) consulta **cinco endpoints en paralelo** con el mismo `q`
—ya rebotado a 250 ms— y tres resultados de cada uno:

| Entidad | Endpoint | Se usa de la respuesta |
| --- | --- | --- |
| Contactos | `GET /organizations/:orgId/contacts?q&pageSize=3` | `displayName`, `documentType/Number`, `email`, `phone`, `isActive`, `contactType` |
| Cuentas por cobrar | `GET /organizations/:orgId/receivables?q&pageSize=3` | `payerContactId`, `dueDate`, `balance`, `originalAmount`, `displayStatus` |
| Cuentas por pagar | `GET /organizations/:orgId/expenses?q&pageSize=3` | `supplierContactId`, `dueDate`, `balance`, `originalAmount`, `displayStatus` |
| Pagos | `GET /organizations/:orgId/payments?q&pageSize=3` | `payerContactId`, `receivedAt`, `amount`, `reference` |
| Egresos | `GET /organizations/:orgId/disbursements?q&pageSize=3` | `supplierContactId`, `disbursedAt`, `amount`, `reference` |

Los cuatro últimos devuelven **identificadores de contacto, no nombres**, así que el frontend
mantiene además un directorio (`GET /contacts?pageSize=100`) para poder escribir «Marilyn Bazán»
en la fila. Suele estar en caché porque las páginas de lista piden lo mismo.

## 1 · Qué busca `q` — hace falta confirmarlo

El frontend asume que `q` en `receivables`, `expenses`, `payments` y `disbursements` busca **al
menos por el nombre del contacto**, porque es lo que la gente teclea. Si hoy solo mira la
referencia o la descripción, buscar «marilyn» no devolvería sus cuentas y la pantalla perdería la
mitad de su valor.

**Petición:** que `q` cubra, en las cuatro listas de dinero:

- nombre del contacto (pagador o proveedor),
- referencia y descripción,
- y, si es barato, el **monto exacto** cuando `q` son solo dígitos («180000» → las cuentas de
  $180.000). Es una búsqueda muy natural en cobranza.

## 2 · Nombre del contacto en las listas de dinero

Cada fila de `receivables` / `expenses` / `payments` / `disbursements` trae el `…ContactId` pero
no el nombre, y el frontend lo resuelve contra un directorio de 100 contactos. Con más de 100
contactos, **una fila cuyo contacto no esté en esa página se queda sin nombre**.

**Petición:** añadir un campo desnormalizado a cada elemento de esas cuatro listas:

```
payerName / supplierName: string
```

Con eso desaparece la consulta del directorio y el límite de 100.

## 3 · Resumen por contacto (para la vista previa)

En escritorio la paleta enseña una ficha del resultado seleccionado. Para un contacto se querría
responder «¿cuánto me debe?» sin abrir nada, pero `Contact` no trae cifras, así que hoy la ficha
solo muestra documento, correo, teléfono y estado.

**Petición:** cifras por contacto, en cualquiera de las dos formas:

- **A (preferida):** campos opcionales en `Contact` cuando se pida con un flag —
  `GET /contacts?q=…&withBalance=true`:

  ```
  receivableBalance: string   // decimal, lo que debe
  receivableOverdue: string   // decimal, la parte vencida
  openReceivables: number     // cuentas abiertas
  lastPaymentAt: string|null  // fecha del último pago
  ```

- **B:** un `GET /organizations/:orgId/contacts/:contactId/summary` con lo mismo. Sirve igual,
  pero cuesta una llamada por selección mientras se navega con las flechas.

**Mientras no exista, no se inventa nada**: la ficha enseña lo que el contrato firma y ya (§70 de
`context.md` — un dato que el backend no respalda es peor que ningún dato).

## 4 · Y si algún día sobra tiempo: un solo endpoint

Lo ideal sería `GET /organizations/:orgId/search?q=…&limit=3` devolviendo los tipos mezclados y
**ya ordenados por relevancia** —hoy el orden lo pone el frontend, agrupando por tipo, que no es
lo mismo—. Cinco llamadas por búsqueda funcionan, pero una sola sería más rápida y permitiría
ranking real (coincidencia exacta primero, luego parcial).

No es urgente. Las tres primeras sí se notan.
