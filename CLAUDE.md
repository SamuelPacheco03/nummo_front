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

1. **Reutiliza antes de crear.** Consulta §94 antes de escribir un componente nuevo.
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

## Cambio mínimo

Haz el cambio más pequeño que resuelva la solicitud. No rediseñes secciones que nadie pidió,
no reescribas módulos completos por un ajuste, no cambies el stack durante un cambio visual.

## Antes de terminar

```bash
pnpm typecheck && pnpm lint && pnpm test
```

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
  (`contract/openapi.json`, v1.0.0, 73 endpoints).
- Handoffs por área en `contract/HANDOFF-fase-0.md` … `HANDOFF-fase-8.md`; resumen en
  `contract/SYNC-STATUS.md`. **Léelos antes de construir una sección nueva.**
- Demo local: `demo@nummo.app` / `Demo1234!` (con el backend corriendo y sembrado).
- La UI y las rutas van en **español**; el código, en inglés.
