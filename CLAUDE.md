# Nummo Frontend — instrucciones para Claude Code

## ⚠️ Antes de cualquier cosa: lee `context.md`

**`./context.md` es la fuente de verdad de este repositorio.** Cubre producto, UX, sistema
visual, stack, arquitectura, convenciones de código, el inventario real de componentes, la
auditoría de brechas y el plan de rediseño por fases.

**Al empezar cualquier tarea en este repositorio, lee `context.md` completo antes de escribir
código.** No es opcional y no basta con hojearlo: casi todas las decisiones que vas a tomar ya
están tomadas ahí.

Si una instrucción del usuario contradice `context.md`, dilo en una frase y sigue lo que pida
el usuario — pero deja constancia de la contradicción para poder actualizar el documento.

## Atajos al documento

| Necesitas… | Ve a |
| --- | --- |
| Saber qué tecnología usar | `context.md` §86 (stack) |
| Saber dónde va un archivo | §87 (arquitectura y reglas de ubicación) |
| Hablar con el API | §88 (contrato, auth, dinero) |
| Escribir TypeScript / React / estilos | §89, §90, §91 |
| Escribir tests | §92 |
| **Crear un componente** | **§94 (inventario) — probablemente ya existe** |
| Saber qué está desalineado | §95 (auditoría de brechas) |
| **Saber qué toca hacer ahora** | **§96 (plan de rediseño por fases)** |
| Dar algo por terminado | §81 (checklist) |

## Reglas que no se negocian

1. **Reutiliza antes de crear.** Consulta §94 antes de escribir un componente nuevo, y lee
   «Nada por duplicado» más abajo: las pantallas espejo comparten componente, no lo copian.
2. **Solo tokens semánticos** (`bg-card`, `text-muted-foreground`). Nunca un hex ni
   `bg-slate-100` en un componente.
3. **Mobile-first**, baseline 360–390px. Probar 360 / 768 / 1024 / 1440.
4. **Light y dark** siempre. Un token declarado solo en `:root` es un bug.
5. **TanStack Query = estado del servidor.** Zustand solo para estado de UI. No duplicar.
6. **`src/api/generated/**` no se edita a mano.** Se regenera con `pnpm api:gen`.
7. **El dinero llega como string decimal.** No es fuente de verdad en el front; `Number()`
   solo para presentar.
8. **Sin `any`, sin código muerto, sin `console.log`** en lo que se entrega.
9. **Cubre los estados obligatorios** (§45): loading, loaded, empty, error, y permisos.
10. **No instales dependencias** sin pasar por §63.

## Nada por duplicado

Esta app tiene **pantallas espejo** por todas partes: cuentas por cobrar y por pagar, pagos y
egresos, cobrar y pagar. Se parecen tanto que copiar el archivo del otro lado y cambiarle las
palabras siempre es lo más rápido. **No lo hagas.** Lo que se duplica se arregla una vez, se
olvida la otra, y en dos semanas las dos pantallas cuentan historias distintas.

Antes de escribir un componente, en este orden:

1. **Mira el inventario** (`context.md` §94). Si ya existe, úsalo.
2. **Mira el espejo.** ¿Existe la versión del otro lado? Entonces el componente es **uno solo**,
   parametrizado — no dos. Lo que cambia entre lados casi siempre son palabras y un endpoint:
   que viajen como props (`copy`, `onSubmit`), no como un archivo nuevo.
3. **Mira si ya lo estás reescribiendo.** Si vas a copiar más de ~20 líneas de otro archivo,
   eso no es un componente nuevo: es uno que hay que extraer.
4. **Solo entonces créalo** — y añádelo a §94 en el mismo commit, o el siguiente lo volverá a
   escribir.

Lo mismo vale para lo que ya está resuelto una vez: hay **un** panel lateral (`Drawer`), **un**
selector segmentado (`SegmentedControl`), **un** badge de estado (`StatusBadge`), **un** vacío
(`EmptyState`). Si necesitas una variante, se le añade una prop al que existe; no nace un
primo.

**Al revés también cuenta:** si tocas algo de un lado del espejo, comprueba el otro en el mismo
commit.

## Cambio mínimo

Haz el cambio más pequeño que resuelva la solicitud. No rediseñes secciones que nadie pidió,
no reescribas módulos completos por un ajuste, no cambies el stack durante un cambio visual.

Extraer lo repetido **no** viola esto: quitar un duplicado es más pequeño que mantener dos.

## Herramientas del repo, no las tuyas

Usa **solo** los comandos de abajo. Este repositorio **no tiene Prettier**: lanzar
`npx prettier --write` reformatea el archivo entero a un estilo ajeno —comillas dobles, punto y
coma— y convierte un cambio de diez líneas en un diff de trescientas. Lo mismo con cualquier
formateador, linter o codemod que no esté en `package.json`.

El estilo se mantiene a mano, imitando el archivo que estás tocando (§89).

## Antes de terminar

```bash
pnpm typecheck && pnpm lint && pnpm test
```

`pnpm lint` está **en cero advertencias**. Si tu cambio suma una, arréglala: la única forma de que
la próxima se note es que no haya ninguna de fondo.

Y si el cambio altera un patrón global (navegación, componentes, tipografía, tablas,
formularios, Numi, loaders, responsive, accesibilidad): **actualiza `context.md` en el mismo
commit**. El código y el documento nunca deben contar historias diferentes.

## Comandos

```bash
pnpm dev        # http://localhost:5173 (requiere nummo-api en :4010 para datos)
pnpm build      # tsc -b && vite build
pnpm preview    # única forma de probar el service worker
pnpm typecheck  # tsc -b --noEmit
pnpm lint       # oxlint
pnpm test       # vitest run
pnpm e2e        # playwright test
pnpm api:gen    # regenera el cliente desde contract/openapi.json
pnpm icons:gen  # regenera favicons e iconos PWA desde brand/logo_nummo.png
```

## Contexto del repositorio

- Frontend React que consume `nummo-api` mediante contrato OpenAPI congelado
  (`contract/openapi.json`, v1.0.0, 111 paths / 141 operaciones).
- Handoffs por área en `contract/HANDOFF-fase-0.md` … `HANDOFF-fase-9.md`; resumen en
  `contract/SYNC-STATUS.md`. **Léelos antes de construir una sección nueva.**
- Demo local: `demo@nummo.app` / `Demo1234!` (con el backend corriendo y sembrado).
- La UI y las rutas van en **español**; el código, en inglés.
