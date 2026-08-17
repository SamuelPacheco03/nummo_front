# Nummo — Contexto de producto, UX, sistema visual y técnico

> Este archivo es la fuente de verdad para cualquier cambio en Nummo: interfaz, componentes, arquitectura de front y convenciones de código.
> Toda nueva pantalla, componente, flujo, ajuste visual o refactor debe respetar estas reglas.
> Si una solicitud puntual entra en conflicto con este documento, priorizar la intención del producto y mantener consistencia con el sistema existente.
> No rediseñar la aplicación desde cero por cada cambio: evolucionar sobre este sistema.

---

# 0. Cómo usar este documento

## 0.1. Protocolo de arranque (obligatorio para cualquier chat o agente)

Este documento no sirve de nada si cada chat empieza de cero. El contrato es:

1. **Leer `context.md` completo antes de escribir la primera línea de código.**
   El repositorio incluye un `CLAUDE.md` en la raíz que Claude Code carga automáticamente
   al abrir la sesión, y que apunta aquí. Si trabajas en otra herramienta, adjunta o pega
   este archivo al inicio de la conversación.
2. **Antes de crear cualquier componente**, revisar el inventario real de la sección 94.
   Casi todo lo que este documento propone ya existe con otro nombre.
3. **Antes de tocar diseño**, revisar la auditoría de brechas de la sección 95: dice
   exactamente en qué el código y este documento aún no coinciden, y cuál de los dos gana.
4. **Antes de empezar una fase de rediseño**, revisar el plan de la sección 96 y trabajar
   en el orden propuesto. No saltar fases: cada una habilita a la siguiente.
5. **Al terminar**, correr el checklist de la sección 81 y actualizar este documento si la
   decisión cambia un patrón global (sección 84).

## 0.2. Ciclo de trabajo por tarea

```text
Leer context.md
  ↓
Localizar la sección relevante (visual · UX · técnica)
  ↓
Buscar el componente existente (sección 94) — reutilizar antes que crear
  ↓
Implementar el cambio MÍNIMO que resuelve la solicitud
  ↓
Cubrir los estados obligatorios (sección 45)
  ↓
pnpm typecheck && pnpm lint && pnpm test
  ↓
Checklist sección 81
  ↓
¿Cambió un patrón global? → actualizar context.md en el mismo commit
```

## 0.3. Regla de sincronización doc ↔ código

El código y `context.md` nunca deben contar historias diferentes.

Cuando aparezca una diferencia hay exactamente dos salidas legítimas:

- **el código se equivoca** → corregir el código;
- **el documento se quedó atrás** → corregir el documento, explicando el porqué.

Lo que no es aceptable es dejar la diferencia sin resolver. Toda diferencia conocida vive
listada en la sección 95 hasta que se cierra.

## 0.4. Mapa del documento

| Bloque | Secciones | Contenido |
| --- | --- | --- |
| Uso del documento | 0 | Protocolo, ciclo de trabajo, sincronización |
| Producto | 1–2 | Qué es Nummo, principios de diseño |
| Sistema visual | 3–12 | Color, tokens, temas, tipografía, dinero, espaciado, radios, sombras |
| Layout y navegación | 13–16 | Desktop, mobile, dashboard |
| Componentes de UI | 17–27 | Cards, tablas, filtros, formularios, acciones, modales, vacíos |
| Numi | 28–36 | Loaders, rol visual, chat, operaciones, command bar |
| Detalle de interacción | 37–46 | Iconos, botones, feedback, animación, responsive, accesibilidad |
| Dominio y datos | 47–62 | Roles, seguridad, multiempresa, fechas, auditoría, reportes, estado |
| Ingeniería de UI | 63–79 | Dependencias, componentización, prohibiciones |
| Proceso | 80–85 | Workflow, checklist, evolución |
| **Stack y arquitectura** | **86–88** | **Tecnologías, capas, contrato con el backend** |
| **Clean code** | **89–93** | **TypeScript, React, estilos, tests, git** |
| **Estado real del proyecto** | **94–96** | **Inventario, auditoría de brechas, plan de rediseño** |

---

## 1. Qué es Nummo

Nummo es una plataforma web de administración financiera y de cartera para negocios.

Permite controlar:

- cuentas por cobrar;
- cuentas por pagar;
- ingresos;
- egresos;
- saldo real de cuentas de efectivo, banco y billeteras;
- cobros recurrentes;
- gastos recurrentes;
- mora e intereses;
- transferencias;
- contactos;
- reportes;
- operaciones asistidas mediante Numi.

Nummo está pensada especialmente para negocios con cobros repetitivos —colegios, jardines infantiles, arriendos, suscripciones, cuotas— pero debe sentirse suficientemente general para tiendas, negocios de servicios, organizaciones y uso personal.

Es multiempresa y multisede.

La interfaz debe transmitir:

**claridad financiera + confianza + control + simplicidad.**

La aplicación nunca debe sentirse como un software contable antiguo, una hoja de cálculo decorada ni una fintech de consumo excesivamente llamativa.

---

# 2. Principios de diseño

## 2.1. El dinero es protagonista

La información financiera debe ser la parte visual más importante.

Los montos relevantes deben poder identificarse rápidamente sin leer toda la pantalla.

Priorizar:

1. saldo;
2. monto por cobrar;
3. monto vencido;
4. monto por pagar;
5. movimientos;
6. próximos vencimientos;
7. acciones necesarias.

No usar decoración que compita visualmente con las cifras.

---

## 2.2. Nummo debe explicar, no solo mostrar

No limitar el producto a mostrar números.

Siempre que tenga sentido, complementar los datos con contexto:

- qué cambió;
- qué requiere atención;
- qué vence pronto;
- qué mejoró;
- qué empeoró;
- qué acción puede tomar el usuario.

Ejemplo:

Incorrecto:

> Cartera vencida: $2.120.000

Mejor:

> Cartera vencida: $2.120.000  
> 8 cuentas requieren atención.

Aún mejor cuando el contexto lo permita:

> La cartera vencida bajó 12% frente al mes anterior.

---

## 2.3. Progressive disclosure

No mostrar todas las opciones al mismo tiempo.

Mostrar primero lo esencial y revelar opciones avanzadas cuando el usuario las necesita.

Aplicar especialmente en:

- formularios;
- filtros;
- configuraciones;
- tablas;
- creación de contratos;
- políticas de mora;
- transferencias;
- acciones avanzadas de cartera.

Una pantalla sencilla es preferible a una pantalla aparentemente “completa” pero difícil de entender.

---

## 2.4. Desktop y mobile son experiencias hermanas, no copias

Desktop está optimizado para:

- analizar;
- comparar;
- administrar;
- trabajar con tablas;
- operar múltiples registros;
- revisar reportes.

Mobile está optimizado para:

- consultar;
- registrar rápidamente;
- cobrar;
- pagar;
- buscar;
- revisar estados;
- usar Numi.

Nunca reducir simplemente el diseño desktop hasta que quepa en un celular.

---

## 2.5. Consistencia antes que novedad

Antes de crear un nuevo patrón visual, revisar si ya existe un componente que resuelva el problema.

No crear:

- cinco estilos de tarjeta;
- tres diseños distintos de modal;
- botones nuevos para cada pantalla;
- badges visualmente diferentes sin razón;
- loaders genéricos aislados;
- múltiples estilos de filtros.

La aplicación debe sentirse diseñada por un solo sistema.

---

# 3. Identidad visual oficial

## 3.1. Colores de marca

```css
--nummo-blue: #2563EB;
--nummo-indigo: #4F46E5;
--nummo-teal: #14B8A6;
--nummo-cyan: #22C7D6;

--nummo-dark: #0F172A;
--nummo-muted: #475569;

--nummo-border: #E2E8F0;
--nummo-background: #F8FAFC;
--nummo-white: #FFFFFF;

--nummo-dark-background: #0B1220;
--nummo-dark-surface: #111827;
--nummo-dark-border: #1F2937;
```

Estos valores representan la identidad base de Nummo.

No reemplazarlos arbitrariamente por violetas, rosas, negros puros u otros colores “de moda”.

---

## 3.2. Tokens semánticos

Nunca depender directamente del color físico dentro de componentes cuando puede utilizarse un token semántico.

Estos son los tokens **reales** del proyecto, declarados en `src/index.css`. Se nombran según el
juego de shadcn/ui, que es el que consumen todos los componentes de `components/ui/`:

```css
/* Superficies */
--background        /* fondo general de la página */
--card              /* tarjetas y paneles */
--popover           /* popovers, dropdowns, sheets */
--secondary         /* superficie sutil: chips, fondos de sección */
--muted             /* superficie apagada */

/* Texto */
--foreground
--card-foreground
--muted-foreground

/* Marca y acción */
--primary           /* relleno de la acción principal */
--primary-hover     /* hover explícito: la marca pide azul MÁS profundo, no más claro */
--primary-foreground
--brand             /* enlaces, foco y estados activos */
--accent            /* hover sutil de UI (rol shadcn), NO el teal de marca */

/* Estados */
--success           /* teal de marca: vale como RELLENO (puntos, barras) */
--success-strong    /* la versión legible como TEXTO sobre fondo claro (AA) */
--warning
--destructive

/* Estructura */
--border · --input · --ring

/* Gráficas */
--chart-1 … --chart-5

/* Shell */
--sidebar · --sidebar-foreground · --sidebar-primary · --sidebar-accent · --sidebar-border · --sidebar-ring

/* Isotipo — NO se re-tematizan: son la marca */
--logo-teal · --logo-cyan · --logo-blue · --logo-indigo
```

> Los nombres `--surface` / `--surface-subtle` / `--danger` que aparecían en versiones previas de
> este documento **no existen**: sus equivalentes son `--card`, `--secondary` y `--destructive`.
> Renombrarlos rompería todos los componentes de `ui/` sin ganar nada.

Un token nuevo se declara en **los tres bloques** de `src/index.css`: `:root`, `.dark` y
`@theme inline`. Un token que solo existe en claro es un bug de modo oscuro.

Los componentes deben consumir tokens semánticos.

Evitar repetir por toda la aplicación valores como:

```css
#FFFFFF
#0F172A
#E2E8F0
```

Esto facilita:

- dark mode;
- mantenimiento;
- rediseños;
- consistencia;
- temas futuros.

---

# 4. Tema claro

Valores reales (`:root` en `src/index.css`):

```css
--background: #f8fafc;   /* fondo general */
--card: #ffffff;         /* tarjetas y paneles */
--popover: #ffffff;
--secondary: #f1f5f9;    /* superficie sutil */
--muted: #f1f5f9;

--foreground: #0f172a;
--muted-foreground: #475569;

--border: #e2e8f0;
--input: #e2e8f0;
--ring: #2563eb;

--primary: #2563eb;
--primary-hover: #1d4ed8;
--brand: #2563eb;
--accent: #f1f5f9;       /* hover de UI, NO el teal de marca */

--success: #14b8a6;      /* relleno */
--success-strong: #0f766e; /* texto AA sobre fondo claro */
--warning: #f59e0b;
--destructive: #dc2626;
```

El fondo general (`--background`) es deliberadamente distinto del de las tarjetas (`--card`).

Evitar páginas completamente blancas sin separación visual.

---

# 5. Tema oscuro

Valores reales (`.dark` en `src/index.css`):

```css
--background: #0b1220;
--card: #111827;
--popover: #111827;
--secondary: #1f2937;
--muted: #1f2937;

--foreground: #f8fafc;
--muted-foreground: #94a3b8;

--border: #1f2937;
--input: #273244;
--ring: #3b82f6;

--primary: #2563eb;      /* ojo: NO se aclara — ver abajo */
--primary-hover: #1d4ed8;
--brand: #3b82f6;
--accent: #1f2937;

--success: #14b8a6;
--success-strong: #2dd4bf;
--warning: #f59e0b;
--destructive: #ef4444;
```

## 5.1. Por qué `--primary` no se aclara en oscuro

Es la pregunta que surge cada vez que alguien compara los dos temas, así que queda escrita:
en oscuro el azul del **relleno del botón** se mantiene en `#2563EB`, porque con texto blanco
encima da 5.2:1 (AA). El `#3B82F6` más claro se reserva a `--brand`: enlaces, foco y estados
activos, donde el color es el que lleva el peso.

Aclarar `--primary` en oscuro rompería el contraste del botón primario, que es la acción más
usada del producto. **No cambiar sin volver a medir contraste.**

El modo oscuro NO debe ser una inversión automática del claro.

Debe conservar:

- jerarquía;
- contraste;
- legibilidad;
- significado de estados;
- sensación premium.

Evitar negro absoluto `#000000` para superficies principales.

---

# 6. Uso de color

## Azul

Usar para:

- acción principal;
- selección;
- enlaces;
- foco;
- datos primarios;
- acciones de navegación;
- elementos interactivos importantes.

## Índigo

Usar como apoyo del azul:

- gradientes discretos;
- Numi;
- estados de inteligencia;
- elementos de identidad.

No convertir toda la interfaz en índigo.

## Teal / Cyan

Usar para:

- acentos;
- visualizaciones;
- Numi;
- datos secundarios;
- detalles característicos de la marca.

No usarlos indiscriminadamente.

---

# 7. Colores de estado

Los estados deben tener significado consistente.

## Éxito

Verde.

Ejemplos:

- pagado;
- conciliado;
- completado;
- saldo positivo cuando corresponda.

## Advertencia

Ámbar.

Ejemplos:

- pendiente;
- parcial;
- próximo a vencer;
- requiere revisión.

## Peligro

Rojo.

Ejemplos:

- vencido;
- error;
- mora;
- operación fallida.

## Neutral

Gris.

Ejemplos:

- archivado;
- inactivo;
- sin datos;
- borrador.

Nunca depender únicamente del color para comunicar estado.

Combinar:

- texto;
- icono o indicador;
- color.

Ejemplo:

`● Vencido`

---

# 8. Tipografía

Usar la familia tipográfica definida actualmente por el proyecto.

No introducir una nueva fuente por pantalla.

Jerarquía recomendada:

## Page title

Desktop:

```text
28–32 px
font-weight: 700–800
letter-spacing: ligeramente negativa
```

Mobile:

```text
22–26 px
```

## Section title

```text
16–18 px
font-weight: 700
```

## Body

```text
13–15 px
```

## Secondary text

```text
11–13 px
```

## Labels / metadata

```text
10–12 px
```

---

# 9. Números financieros

Todo monto debe utilizar números tabulares cuando sea posible:

```css
font-variant-numeric: tabular-nums;
```

Esto permite alinear visualmente cifras financieras.

Ejemplo:

```text
$18.450.000
 $7.830.000
 $2.120.000
```

## Formato monetario

La moneda base es COP.

Formato recomendado:

```text
$350.000
$1.250.000
$18.450.000
```

En dashboards compactos puede utilizarse:

```text
$18,4 M
$820 k
```

pero solo cuando la reducción ayude a leer la interfaz.

Nunca perder precisión en:

- formularios;
- movimientos;
- comprobantes;
- detalles;
- confirmaciones;
- tablas contables.

## 9.1. Las tres funciones de `lib/format.ts`

Todo importe pasa por una de estas tres. **Ninguna se reimplementa en un componente** (§67).

| Función | Salida | Cuándo |
| --- | --- | --- |
| `formatMoney` | `$350.000` · `$350.000,50` | **Por defecto.** KPIs, gráficas, paneles, listas de resumen |
| `formatAmount` | `$350.000,00` | Columnas que se suman, detalles, comprobantes, confirmaciones, formularios |
| `formatCompactAmount` | `$1,5 M` · `$900 k` | Solo ejes y etiquetas de gráficas |

`formatMoney` **no pierde precisión**: imprime los centavos cuando existen y se los ahorra
cuando no, que en COP es casi siempre. Lo que distingue a `formatAmount` no es la precisión
sino la **alineación**: dos decimales fijos son lo que mantiene cuadrada una columna que el
usuario va a sumar con la vista.

`formatCompactAmount` sí redondea, así que solo se admite donde la cifra no se cuadra.

## 9.2. Moneda

COP es la moneda base y se muestra con `$` pegado a la cifra. Cualquier otra moneda se
prefija con su **código ISO** (`USD 1.200,00`), nunca con `$`: en un producto multiempresa,
dos "pesos" distintos con el mismo símbolo son un error de lectura esperando a ocurrir.

El signo negativo va **antes** del símbolo: `-$350.000`.

---

# 10. Espaciado

Utilizar una escala consistente.

Preferencia:

```text
4
8
12
16
20
24
32
40
48
```

Evitar valores arbitrarios como:

```text
13px
27px
31px
```

salvo que sean necesarios por composición.

El espacio es parte fundamental del diseño.

No compactar excesivamente las pantallas con la intención de “mostrar más”.

---

# 11. Bordes y radios

La escala sale de `--radius: 0.5rem` en `src/index.css` y se consume con las utilidades de
Tailwind, nunca con un valor suelto:

| Utilidad | Valor | Dónde |
| --- | --- | --- |
| `rounded-sm` | 6 px | detalles diminutos, esquinas internas |
| `rounded-md` | 8 px | **inputs, botones, selects** |
| `rounded-lg` | 10 px | **cards, paneles, tablas, contenedores de lista** |
| `rounded-xl` | 14 px | cajón de detalle y superficies de Numi |
| `rounded-full` | — | chips, avatares, puntos de estado |

La escala sale de `--radius: 0.625rem` (10 px). Nummo es una consola densa: esquinas contenidas,
superficies planas. Los 14–18 px que pedía una versión previa de este documento infantilizan una
tarjeta de cifras y roban altura útil.

Numi puede ir un punto más redondeada (`rounded-xl` en su panel, `rounded-2xl` en el
compositor del chat): es la diferenciación deliberada que permite §31, no una excepción libre.

No usar `border-radius: 24px` en todo.

No convertir la interfaz en una colección de píldoras.

---

# 11.1. Cómo NO parecer una plantilla

Cuatro patrones que hacen que una pantalla se lea como generada, y que en Nummo están
**prohibidos**. Salieron de mirar con ojo crítico una primera versión del Panel:

1. **Sopa de tarjetas.** Catorce rectángulos con borde de 1 px flotando sobre gris, todos con el
   mismo radio. Si varias cifras son un mismo resumen, van en **una** superficie con separadores
   (`KpiStrip`), no en cuatro tarjetas sueltas. Agrupar es diseñar; repetir la tarjeta, no.
2. **El icono dentro del cuadradito tintado**, repetido en cada fila y cada acción. Es el patrón
   de plantilla por excelencia. El icono va al tamaño del texto y el color lo lleva él, sin
   pastilla detrás.
3. **Micro-etiquetas en MAYÚSCULAS con letter-spacing en cada sección.** Cuando todo grita, nada
   jerarquiza. Los títulos de sección van en sentence case con `font-display` (`Panel`). Las
   versalitas se reservan a metadatos de verdad, como los grupos del sidebar.
4. **Rejillas perfectamente uniformes.** Seis acciones en seis columnas iguales pesan lo mismo que
   las cifras y encima truncan el texto. Y cuatro KPIs idénticos en fila **no jerarquizan nada**:
   si las cuatro cifras se ven igual, el usuario tiene que leerlas todas para saber cuál importa.
   Una manda —el saldo, que es la primera pregunta de §16— y las otras tres la acompañan, más
   pequeñas y en fila.

   **Un carrusel no es la solución.** Escondería dos de las tres, y lo vencido es justo lo que no
   puede quedar fuera de la vista (§78). Reducir el cuerpo sí cabe, incluso a 360 px, y deja las
   cuatro cifras de un vistazo.

La regla detrás de las cuatro: **la jerarquía se hace con tamaño, agrupación y espacio, no
añadiendo bordes, fondos y pastillas.** Si algo destaca solo porque se le puso un recuadro,
todavía no está jerarquizado.

## 11.1.1. Dónde va cada cosa del shell

| Zona | Qué lleva |
| --- | --- |
| **Cabecera** | La barra de comandos (ocupa el ancho útil), el selector de tema y el menú de perfil —que incluye cerrar sesión— |
| **Sidebar** | La organización activa, la navegación del negocio y, al pie, lo que no es negocio: configuración, ayuda, instalar app |

El **selector de organización va en el sidebar, no en la cabecera**: es contexto permanente, no
una herramienta, y en la cabecera de móvil competía con la búsqueda y se veía apretado.

**La navegación es solo del negocio; configuración va al pie.** Estuvo un tiempo suelta al final
de la lista —sin título de grupo, con un hueco encima— y se leía como un resto; agruparla ahí con
ayuda y estado tampoco funcionó, porque quedaba por debajo de cinco grupos y en móvil había que
desplazarse para verla. **El pie no se desplaza**: se ve entera en cuanto se abre el sidebar. Va
la primera, con el mismo peso menor —12 px— que ayuda, que es justo lo que las agrupa como «esto
no es una sección de trabajo».

Como `/config` no casa con `/maestros/…` ni con `/cartera/interes`, que también cuelgan de ella,
el enlace se marca activo con `isSettingsPath` y no solo con el `NavLink`.

**«Estado del sistema» (`/estado`) ya no se enlaza.** La salud del backend es cosa de quien lo
opera, no de quien lleva las cuentas de un jardín infantil: su sitio es el rol de
superadministrador, que todavía no existe. La ruta sigue viva —soporte puede pedirla por URL— y
el enlace volverá al pie detrás de ese permiso cuando el rol llegue.

El resto del pie es lo del **dispositivo y la sesión**: instalar la app, el aviso de sin conexión,
el tema y la cuenta.

**Tema y perfil solo aparecen una vez por pantalla.** En escritorio viven en la cabecera, siempre
a la vista, y el pie del sidebar los oculta (`lg:hidden`). Por debajo de `lg` no hay cabecera de
escritorio y ese mismo cuerpo es la hoja de «Más», así que ahí es su único sitio. `SidebarBody`
se usa en las dos, de modo que **la decisión es del breakpoint, no del componente que lo monta**.

Llenar la barra superior de iconos es otra forma de la sopa de tarjetas. Dos controles a la
derecha es el techo; el resto vive donde le corresponde.

## 11.1.2. Barras de desplazamiento

Los contenedores que scrollean por dentro —sidebar, paleta de comandos, hilo de Numi, cajón de
detalle, sub-navegación de ajustes— llevan `.scrollbar-slim`. La del sistema pinta una pista
ancha y clara que sobre el sidebar oscuro se ve como una cicatriz.

El pulgar va en `currentColor` a baja opacidad, así que **hereda la superficie** y no hace falta
declarar dos versiones (§11.2).

## 11.1.2b. Dónde sí van las versaditas

Las versaditas grises (`text-xs uppercase tracking-wider`) sirven **solo** para dos cosas:

1. **Cabeceras de una tabla de datos** — es la convención de consola y ahí se lee como estructura.
2. **Separadores de grupo en un menú de navegación** — el sidebar, la sub-navegación de ajustes,
   los grupos de la paleta de comandos.

**Nunca para un título de contenido.** Un `SALDO` o un `DETALLE` en versaditas grises encima de
su propia tabla se lee después que la tabla —queda por debajo de lo que nombra— y es el tic de
plantilla que §11.1 prohíbe. Los títulos de sección van **en frase y del color del texto**
(`text-sm font-medium`): `DetailSection` los pone así, y quien no pueda usarlo copia ese estilo,
no el anterior.

## 11.1.3. Un solo panel lateral

Todo lo que se abre «de lado» —la ficha de un registro, los filtros avanzados, registrar dinero—
sale del mismo `Drawer` (`components/ui/drawer.tsx`): **hoja desde abajo en móvil, cajón flotante
por la derecha desde `sm`**.

El eje cambia con el breakpoint a propósito: abajo es el gesto del pulgar, y en una pantalla
ancha un panel pegado al borde inferior tapa la tabla justo donde se mira el resultado. Lo
resuelve `.animate-drawer` (`index.css`), que es la única forma de cambiar el **eje** de entrada
con el breakpoint: mezclar `slide-in-from-bottom` con `sm:slide-in-from-right` deja las dos
traslaciones activas y el panel entra en diagonal.

Hubo un tiempo con **dos** paneles: el cajón de detalle traía su propio Radix Dialog y la hoja de
filtros montaba otro sobre `Sheet`, con anchos, esquinas y cabeceras distintas. Eran dos cosas que
el usuario lee como la misma y que se separaban cada vez que alguien tocaba una. Ahora hay uno, y
encima solo cambia **cómo se abre**:

| Forma | Quién manda | Para qué |
| --- | --- | --- |
| `DetailDrawer` | Una ruta hija de la lista | Lo que se comparte y se recarga: fichas, formularios de alta |
| Estado local (`FilterSheet`, …) | Un `useState` | Lo efímero: filtros, opciones de una pantalla |

**También sirve para navegar.** La sub-navegación de Configuración —once destinos en cuatro
grupos— es una columna fija en escritorio y, por debajo de `lg`, esa misma lista dentro del
`Drawer`, detrás de un botón «Secciones» (`features/config/settings-layout.tsx`).

Antes era una **tira horizontal desplazable**, y era el error que §21.1 reprocha en los filtros:
de once destinos se veían tres, los otros ocho quedaban detrás de un gesto que nadie ve, y al
aplanar la lista se perdían los títulos de grupo. Un `select` con `<optgroup>` los recupera en
una sola línea, pero **tiene que mostrar el destino actual** —repitiendo el `<h1>` que va justo
debajo— y en tablet se estira a lo ancho hasta parecer un campo de formulario vacío. El botón no
finge ser otra cosa, y dentro cabe la lista **entera**, con sus grupos y el activo resaltado,
igual que en escritorio.

La regla que deja: **una navegación larga no se aplana en horizontal; se mete en el cajón.**

`Sheet` se queda para lo que **no** cambia de eje: los laterales de navegación y la hoja inferior
de acciones.

---

## 21.1. Filtros que sobreviven a la navegación

**La URL es la fuente de verdad de los filtros de un listado**, y `useListFilters` la implementa.
Lo usa **todo listado de la app, sin excepciones**: cartera, pagos y egresos, acuerdos y
recurrentes, contactos, movimientos y los cinco maestros.

Los maestros estuvieron declarados como excepción —«un catálogo corto que no se comparte por
enlace»— y **la excepción no se sostuvo**: los criterios se perdían al volver de editar, y
mantener ahí una barra de filtros propia significaba arreglar dos veces cada cosa. Si una lista
merece filtros, merece estos.

**Gastos recurrentes fue el último en llegar, y enseña cómo se detecta el que falta:** usaba
`useMasterListState` por parecerse a un catálogo, así que sus filtros no viajaban en la URL y ni
siquiera ofrecía los dos que su endpoint acepta (`status`, `supplierContactId`). Si una pantalla
es una **lista de trabajo** —se filtra, se comparte, se vuelve a ella—, va con este patrón aunque
su estado de partida se pareciera al de un maestro.
No es un capricho técnico: es lo que hace que el botón «atrás» funcione, que se pueda mandar
«mira estas cuentas» por chat y que recargar no devuelva al principio. El estado de React no
duplica nada — se deriva de los parámetros en cada render.

Las claves van **en español**, como las rutas (§87.5):
`/cartera/cxc?estado=OVERDUE&pagador=abc&orden=saldo&pagina=2`.

`sessionStorage` solo cubre volver a la sección sin enlace, con esta precedencia:

1. ¿La URL trae criterios? **Mandan ellos** — es un enlace deliberado.
2. ¿Se llega sin ninguno? Se restaura lo último **y se escribe en la URL**, para que lo que se ve
   y lo que dice la barra de direcciones no cuenten cosas distintas.
3. ¿«Limpiar»? Se borran los dos.

**Sesión y no `localStorage`, a propósito:** un filtro de cartera es contexto de un rato, no una
preferencia. Que dentro de una semana la lista abra filtrada por algo elegido hoy desorienta más
de lo que ayuda.

### Qué cifras van en la cabecera

No todas las listas se resumen igual, y copiar el resumen de al lado es la forma rápida de poner
un número que no responde a la pregunta de la pantalla:

| Pantalla | Pregunta | Componente | Fuente |
| --- | --- | --- | --- |
| Cuentas por cobrar / por pagar | ¿Cuánto queda vivo? | `BalanceKpis` | `receivables-summary` · `payables-summary` |
| Pagos / egresos | ¿Cuánto se movió este mes? | `CashflowKpis` | `reports/cashflow` |

Una cartera es **saldo** (stock) y una lista de pagos es **flujo**: la primera se resume por total,
vencido y al día; la segunda por lo del período y lo del período anterior. La comparación la firma
el backend —`cashflow` devuelve `previous`—, no se calcula aquí (§88.4).

### Cómo se reparten los filtros en la pantalla

| | Móvil y tablet | Escritorio (`lg`+) |
| --- | --- | --- |
| Buscar | Siempre visible | Siempre visible, a la izquierda |
| El filtro principal (estado) | `FilterChips`, rejilla 2×2 | Desplegable junto al buscador |
| El resto | `FilterSheet`, tras un botón con el contador | El mismo botón, **a la derecha del todo** |
| Ordenar | Dentro del cajón, `FilterSortField` | Pulsando la cabecera de la columna |

Esa fila la dibuja `ListToolbar`, no cada pantalla: dónde va cada filtro según el ancho es una
decisión que debe tomarse **una vez**, no seis.

**Por qué el estado cambia de forma con el breakpoint:** en móvil el dedo agradece un objetivo
grande y siempre visible. Desde `lg` la lista **es** una tabla, con su propia fila de cabeceras, y
una rejilla de fichas ahí compite con ellas.

**Sin embudos por columna.** Se probaron y se quitaron: en una fila de cabeceras que ya ordena, un
segundo icono por columna es ruido, y repartir el mismo criterio entre tres puertas —cabecera,
desplegable y cajón— no añade nada. La cabecera **ordena**; filtrar es cosa del desplegable y del
cajón.

**El cajón de filtros cambia de eje, no de contenido:** hoja inferior en móvil (el gesto del
pulgar) y cajón por la derecha en escritorio, donde un panel pegado al borde inferior taparía la
tabla justo donde se está mirando el resultado. Lo resuelve `side="drawer"` de `Sheet`, que
reutiliza `.animate-drawer` — la única forma de cambiar el eje de entrada con el breakpoint sin
que el panel entre en diagonal.

**Ninguna entrada guarda estado propio.** La cabecera, el desplegable y el cajón escriben en el
mismo sitio —la URL—: varias puertas, un solo dato. Si cada entrada tuviera su estado, se
contradirían en cuanto se usaran dos.

El contador del botón es lo que evita el **filtro fantasma**: sin él, una lista filtrada por algo
que vive dentro de una hoja cerrada parece una lista vacía sin motivo.

### Qué se escribe dentro del cajón

Un filtro que hay que descifrar no es un filtro. Reglas del contenido de `FilterSheet`:

1. **Etiquetas en frase, del color del texto.** En versaditas y gris quedaban por debajo del
   control que nombran —se leía antes el desplegable que su propio título—, y es el tic de
   plantilla que §11.1 prohíbe.
2. **Ni «ascendente» ni «descendente».** No dicen nada de una fecha de vencimiento ni de un saldo:
   hay que traducirlas mentalmente cada vez. En `FilterSortField` las palabras de la dirección
   **cambian con la columna** — «Vencen antes / Vencen después» para una fecha, «Menor primero /
   Mayor primero» para un importe.
3. **Ordenar son dos decisiones, y llevan dos controles:** un desplegable con la columna y,
   debajo, las dos direcciones como fichas. Se probó juntarlas en una sola lista de seis opciones
   («Las que vencen antes», «Mayor saldo primero», …) y se descartó: obliga a releer las seis para
   cambiar solo la dirección, y crece multiplicando en cuanto aparece una columna más. Un botón
   suelto de dirección, sin etiqueta, era peor todavía: no se sabía si era un estado o una acción.
4. **Ordenar no es filtrar.** Va al final, separado por una línea, y no cuenta para el contador
   del botón: no esconde registros, solo los recoloca.
5. **Un rango lleva sus dos palabras.** Dos campos de fecha sin más son un acertijo hasta que
   abres el calendario: cada uno lleva «Desde» y «Hasta» encima, y una línea de ayuda dice lo que
   no es evidente —que se puede acotar por un solo lado—.
6. **El vacío se nombra entero.** «Todos los estados», no «Todos»; la opción se lee sola cuando el
   desplegable está cerrado y la etiqueta queda arriba.
7. **Una línea de ayuda solo donde falta.** `FilterField` acepta `hint`, pero explicarlo todo es
   otra forma de no explicar nada.

**Se ordena por una sola columna, y no por gusto:** el contrato v1.0.0 acepta un `sort` y un
`order`, no una lista, y estas pantallas se paginan en el servidor. Encadenar un segundo criterio
en el front reordenaría solo la página visible y daría un orden global falso (§88.4). Un editor de
criterios encadenados es una **petición de contrato**, no trabajo de front — y antes de pedirlo,
conviene comprobar que el caso real no se resuelve con un desempate fijo en el backend.

---

## 11.2. Los componentes heredan su superficie

Desde que el sidebar va oscuro también en tema claro (§4), la aplicación tiene **dos superficies
con luminosidad opuesta**. Un componente que se monta en las dos —`OrgSwitcher`, el aviso de "sin
conexión", el botón de instalar— **no puede fijar color**: usa `text-current` y `bg-current/…`, y
hereda.

Fijar `text-foreground` en uno de ellos deja texto invisible sobre el sidebar, que es exactamente
el bug que apareció al hacer este cambio. Y al revés: la hoja inferior de "Registrar" heredaba
`bg-sidebar` y salía oscura en tema claro. Las hojas **laterales** son navegación y van sobre la
superficie del sidebar; la **inferior** es contenido y va sobre la de capa.

---

# 12. Sombras

Las sombras deben ser discretas.

Usar principalmente:

- borde fino;
- separación por fondo;
- sombra muy suave.

Reservar sombras más fuertes para:

- dropdowns;
- popovers;
- modales;
- panel de Numi;
- elementos elevados temporalmente.

Evitar `shadow-xl` en todas las cards.

---

# 13. Layout desktop

Estructura principal:

```text
Sidebar fijo
+
Top bar
+
Área principal de contenido
```

Sidebar aproximado:

```text
240–260 px
```

Contenido:

- ancho máximo amplio;
- centrado cuando corresponda;
- padding horizontal consistente;
- evitar estirar elementos pequeños en pantallas gigantes.

---

# 14. Navegación principal

Orden recomendado:

```text
Inicio
Cartera
Ingresos
Gastos
Contactos
Cuentas

Análisis
  Reportes

Numi
Configuración
```

No exponer en el sidebar todas las entidades internas del backend.

La navegación debe seguir el modelo mental del usuario, no el modelo de datos.

Ejemplo incorrecto:

```text
Receivables
Contracts
Payments
Allocations
Adjustments
Interest accruals
```

Ejemplo correcto:

```text
Cartera
  Cuentas por cobrar
  Cobros recurrentes
```

---

# 15. Navegación mobile

Usar bottom navigation.

Base:

```text
Inicio
Cartera
Nuevo
Numi
Más
```

`Nuevo` debe funcionar como acción central rápida.

Puede abrir:

- registrar ingreso;
- registrar egreso;
- registrar pago;
- crear cobro;
- crear contacto;
- transferencia.

No intentar colocar todas las secciones del sidebar en la barra inferior.

## 15.1. Un destino puede cubrir varias rutas

`Cartera` apunta a cuentas por cobrar, pero **también se queda encendido en cuentas por pagar y
en los detalles de ambas**: son la misma sección mirada desde los dos lados. Apagarse al saltar de
una a la otra hace creer que te has salido de la sección.

Por eso `BottomLink` calcula él mismo si está activo (`to` + `also[]`, prefijo de ruta) en vez de
delegarlo a `NavLink`, que solo entiende una ruta por enlace. Las rutas del par viven en
`PORTFOLIO_SECTIONS` (`features/navigation/sections.ts`), un único sitio que sirve a la barra y al
salto espejo de §15.2.

## 15.2. Salto entre pantallas espejo

Hay **dos pares espejo**, y los dos llevan `SectionSwitch`: dos botones debajo de la cabecera,
con el actual marcado.

| Par | Constante | Botones |
| --- | --- | --- |
| Lo que se debe | `PORTFOLIO_SECTIONS` | Por cobrar · Por pagar |
| Lo que ya se movió | `LEDGER_SECTIONS` | Pagos · Egresos |
| Lo que se repite | `RECURRING_SECTIONS` | Cobros · Gastos |

Se consultan a la vez, y en móvil la navegación vive detrás de «Más», a dos toques.

Se probó reducirlo a un solo enlace hacia la otra («Ver cuentas por pagar →») para ahorrar sitio.
**Se descartó:** ver las dos caras a la vez es lo que enseña que existen y en cuál estás; con un
enlace suelto hay que leerlo para deducirlo.

Van de enlaces, no de pestañas: son dos rutas de verdad, así que «atrás» funciona y cada una se
puede compartir. Solo por debajo de `lg`: en escritorio el sidebar ya tiene las dos a la vista y
esto sería una tercera forma de navegar a lo mismo.

---

# 16. Inicio / Dashboard

El dashboard no debe ser un vertedero de widgets.

Debe responder rápidamente:

1. ¿Cuánto tengo?
2. ¿Cuánto me deben?
3. ¿Cuánto está vencido?
4. ¿Cuánto debo?
5. ¿Qué requiere mi atención?
6. ¿Qué pasó recientemente?

Orden base recomendado:

## Resumen financiero

- saldo disponible;
- por cobrar;
- vencido;
- por pagar.

## Acciones rápidas

- ingreso;
- egreso;
- pago;
- cobro;
- contacto;
- transferencia.

## Flujo de caja

Ingresos vs egresos.

## Necesita tu atención

- cartera vencida;
- próximos cobros;
- próximos pagos;
- movimientos pendientes de revisión.

## Insight de Numi

Máximo uno o pocos insights realmente relevantes.

## Actividad reciente

Movimientos o cartera reciente.

---

# 17. Cards

Una card debe tener una función clara.

Tipos recomendados:

## Metric card

```text
Label
Monto
Contexto / delta
```

## Content card

```text
Título
Descripción opcional
Contenido
Acción opcional
```

## Alert card

```text
Icono
Título
Contexto
Monto / acción
```

## Numi insight

Debe sentirse relacionado con Nummo pero ligeramente diferenciado.

No crear cards anidadas innecesariamente.

---

# 18. Tablas

Las tablas son componentes críticos de Nummo.

Deben ser especialmente cuidadas.

Características según necesidad:

- búsqueda;
- filtros;
- ordenamiento;
- paginación;
- selección múltiple;
- acciones por fila;
- columnas configurables;
- exportación;
- estados;
- skeleton loading;
- empty state;
- responsive behavior.

---

# 19. Tablas en desktop

Mantener:

- encabezado claramente diferenciado;
- filas respiradas;
- líneas divisorias discretas;
- hover suave;
- montos alineados;
- acciones contextuales.

Evitar:

- bordes verticales excesivos;
- fondo de color en cada celda;
- tablas tipo Excel;
- demasiadas columnas visibles simultáneamente.

---

# 20. Tablas en mobile

Nunca intentar mostrar una tabla desktop completa horizontalmente como primera solución.

Transformar las filas en elementos compactos.

Ejemplo:

```text
Laura Gómez                       $350.000
Mensualidad agosto
● Vencido
15 ago 2026
```

Priorizar información.

Ocultar campos secundarios o llevarlos al detalle.

---

# 21. Filtros

Los filtros más frecuentes deben estar visibles.

Ejemplo para Cartera:

```text
Todas
Vencidas
Pendientes
Parciales
Pagadas
```

Los filtros complejos deben estar en:

- popover;
- dropdown;
- sheet mobile;
- panel de filtros.

Mostrar filtros activos de forma clara.

Debe ser fácil limpiar todos los filtros.

---

# 22. Formularios

Los formularios deben sentirse simples incluso cuando el modelo de datos sea complejo.

Reglas:

- una tarea principal por formulario;
- agrupar campos relacionados;
- labels siempre claros;
- helper text solo cuando aporta valor;
- errores junto al campo;
- no utilizar placeholders como sustitutos de labels;
- campos opcionales claramente diferenciados cuando sea necesario;
- mostrar campos condicionales únicamente cuando aplican.

---

# 23. Formularios largos

Usar secciones o pasos.

Ejemplo:

```text
1. Información básica
2. Configuración del cobro
3. Mora
4. Confirmación
```

No crear wizard si el formulario puede resolverse claramente en una sola pantalla.

No usar wizard por estética.

---

# 24. Acciones destructivas

Nummo prioriza trazabilidad.

Nunca representar “eliminar” como la acción normal cuando el modelo de negocio requiere:

- archivar;
- cancelar;
- revertir;
- finalizar.

Acciones destructivas deben:

- explicar consecuencia;
- pedir confirmación cuando corresponda;
- utilizar rojo solo en el punto de decisión;
- no ser la acción visual primaria.

---

# 25. Crear y editar

Preferir Sheet / Drawer cuando:

- el formulario es corto o medio;
- el usuario necesita conservar contexto;
- se está editando una fila;
- se registra una operación rápida.

Preferir página dedicada cuando:

- el flujo es largo;
- hay múltiples secciones;
- requiere bastante información;
- necesita navegación interna;
- es una configuración compleja.

---

# 26. Modales

Usar modal para:

- confirmaciones;
- decisiones breves;
- acciones focalizadas.

No usar modal para formularios gigantes.

No apilar modal sobre modal.

---

# 27. Estados vacíos

Nunca mostrar solo:

> No hay datos.

Un empty state debe ayudar al siguiente paso.

Ejemplo:

```text
Todavía no tienes cobros recurrentes.

Crea uno para que Nummo genere automáticamente
las cuentas por cobrar de cada período.

[Crear cobro recurrente]
```

Cuando sea apropiado, Numi puede aparecer discretamente.

---

# 28. Loading states

Nummo no debe utilizar loaders genéricos como experiencia principal cuando puede utilizar sus loaders característicos.

Numi es la identidad de carga del producto.

---

# 29. Sistema de loaders Numi

Numi debe tener estados visuales reutilizables.

Estados base:

```text
idle
thinking
searching
loading
saving
success
warning
error
```

---

## 29.1. Loader de página

Usar para transiciones o carga de contenido importante.

Visual:

- rostro de Numi;
- gradiente Nummo;
- animación sutil;
- aro cyan/teal;
- mensaje contextual;
- puntos animados.

Ejemplos de texto:

```text
Numi está preparando tu cartera…
Organizando tus cuentas por cobrar
```

```text
Numi está revisando tus movimientos…
Un momento
```

```text
Numi está preparando el reporte…
Comparando tus cifras
```

Evitar mensajes genéricos repetidos para todo.

---

## 29.2. Loader inline

Usar dentro de:

- chat;
- cards;
- búsquedas;
- consultas pequeñas;
- actualizaciones parciales.

Ejemplo:

```text
[Numi] Revisando tus datos…
```

No bloquear toda la pantalla para cargas parciales.

---

## 29.3. Skeletons

Para tablas y layouts ya conocidos, utilizar skeletons.

Numi no reemplaza todos los skeletons.

Regla:

- skeleton = estructura conocida cargando;
- Numi loader = operación, transición o procesamiento significativo.

---

# 30. Numi — rol visual

Numi NO debe sentirse como un chatbot externo pegado a Nummo.

Debe sentirse como una capacidad nativa del producto.

Puede aparecer en:

- barra global de búsqueda;
- sidebar;
- panel lateral;
- insights;
- loaders;
- empty states;
- ayuda contextual;
- confirmaciones asistidas.

---

# 31. Numi — identidad visual

Numi utiliza los colores:

```text
Nummo Blue
Nummo Indigo
Nummo Cyan
Nummo Teal
```

Su tratamiento puede utilizar un gradiente discreto.

Numi debe ser reconocible sin convertir toda la aplicación en un producto caricaturesco.

La mascota debe sentirse:

- amable;
- moderna;
- inteligente;
- limpia;
- profesional.

No infantilizarla.

---

# 32. Chat de Numi

El panel recomendado en desktop es lateral.

No usar únicamente burbujas de texto.

Numi puede responder con componentes enriquecidos.

Tipos de respuesta:

- texto;
- cifra;
- resumen;
- breakdown;
- tabla breve;
- lista de cuentas;
- contacto;
- movimiento;
- acciones;
- confirmación.

---

# 33. Cards dentro del chat

Ejemplo:

```text
Cartera total

$7.830.000
26 cuentas pendientes

Vencido                 $2.120.000
Por vencer esta semana  $3.240.000

[Ver cartera] [Explícame esto]
```

La respuesta debe ser escaneable.

---

# 34. Operaciones con Numi

Numi nunca debe guardar una operación sin confirmación explícita.

Flujo obligatorio:

```text
Usuario solicita acción
↓
Numi obtiene / solicita datos
↓
Numi muestra resumen
↓
Usuario confirma
↓
Se ejecuta operación
↓
Numi muestra resultado
```

Ejemplo:

```text
Registrar pago

Contacto        Laura Gómez
Monto           $350.000
Cuenta destino  Bancolombia
Aplicar a       Mensualidad agosto

[Cancelar] [Confirmar pago]
```

---

# 35. Respuestas sin datos

Numi nunca debe inventar cifras.

Si no posee la información:

- decirlo claramente;
- explicar qué dato falta;
- ofrecer el siguiente paso.

No rellenar con ejemplos que parezcan datos reales.

---

# 36. Search / Command bar

La barra superior puede funcionar como punto de entrada universal.

Placeholder recomendado:

```text
Buscar o preguntarle algo a Numi…
```

Puede resolver:

## Búsqueda

```text
Laura Gómez
Factura agosto
Pago 00129
```

## Preguntas

```text
¿Cuánto me debe Laura?
¿Qué vence esta semana?
```

## Acciones

```text
Registrar pago
Crear cobro
Nueva transferencia
```

---

# 37. Iconografía

Usar una sola familia de iconos dentro del producto.

No mezclar:

- emojis;
- iconos filled;
- iconos outline de múltiples librerías;
- caracteres Unicode;

en producción.

Los emojis pueden existir dentro de conversaciones de Numi cuando corresponda, no como sistema principal de iconos.

Tamaños habituales:

```text
16
18
20
24
```

---

# 38. Botones

Jerarquías:

## Primary

Una acción principal por contexto.

Ejemplo:

```text
+ Registrar ingreso
```

## Secondary

Acciones importantes pero no dominantes.

## Ghost

Acciones de bajo énfasis.

## Destructive

Solo para acciones realmente destructivas.

No llenar una pantalla con cinco botones primarios.

---

# 39. Feedback de interacción

Toda acción debe tener feedback.

Ejemplos:

- loading;
- success;
- error;
- toast;
- actualización visual;
- confirmación.

Nunca permitir que el usuario haga clic y quede dudando si pasó algo.

---

# 40. Toasts

Usar para resultados breves.

Ejemplo:

```text
Pago registrado correctamente
```

No usar toast para información que el usuario necesita estudiar o decidir.

Errores críticos deben permanecer visibles.

---

# 41. Animaciones

Las animaciones deben mejorar comprensión.

Duraciones recomendadas:

```text
150–250 ms para interacción
250–400 ms para paneles
```

Numi puede utilizar animaciones ligeramente más expresivas.

Evitar:

- rebotes exagerados;
- animaciones largas;
- entradas espectaculares repetitivas;
- motion sin propósito.

Respetar `prefers-reduced-motion`.

---

# 42. Responsive breakpoints

No diseñar según un único dispositivo.

Pensar al menos en:

```text
mobile
tablet
desktop
wide desktop
```

La implementación debe seguir los breakpoints existentes del proyecto cuando ya estén definidos.

No introducir una segunda escala de breakpoints sin necesidad.

---

# 43. Touch targets

En mobile, controles interactivos deben tener área táctil suficiente.

Objetivo aproximado:

```text
44 × 44 px
```

No crear iconos diminutos difíciles de tocar.

---

# 44. Mobile forms

En mobile:

- inputs a ancho completo;
- botones principales accesibles;
- evitar dos columnas;
- sheets desde abajo cuando ayuden;
- teclado adecuado según tipo de dato;
- inputs numéricos para montos;
- navegación sencilla.

---

# 45. Estados de pantalla obligatorios

Toda sección nueva debe considerar:

1. loading;
2. loaded;
3. empty;
4. error;
5. partial / degraded si aplica;
6. permission denied si aplica.

No diseñar únicamente el happy path.

---

# 46. Accesibilidad

Toda nueva interfaz debe incluir:

- contraste suficiente;
- focus visible;
- navegación con teclado;
- labels;
- `aria-*` cuando sea necesario;
- texto alternativo;
- estado no dependiente solo de color;
- tamaños táctiles adecuados;
- soporte de reduced motion.

La accesibilidad no se agrega después.

---

# 47. Roles y permisos

La UI debe respetar los permisos del usuario.

Roles:

- Dueño;
- Administrador;
- Contador;
- Operador;
- Consulta.

No mostrar acciones ejecutables que el usuario no puede realizar, salvo que exista una razón UX concreta para mostrarlas deshabilitadas con explicación.

Numi debe respetar exactamente los mismos permisos.

---

# 48. Seguridad UX

Nunca exponer:

- API keys;
- secretos;
- identificadores internos innecesarios;
- información de otra organización;
- información de otra sede cuando no corresponde.

Las credenciales de proveedor IA nunca deben mostrarse completas después de guardarse.

---

# 49. Multiempresa

La organización activa siempre debe ser identificable.

Cambiar de organización debe ser una acción consciente.

No mezclar datos de organizaciones.

Si existe selector de organización:

- mostrar organización activa;
- mostrar sede cuando sea relevante;
- evitar cambios accidentales.

---

# 50. Multisede

Cuando una operación depende de sede, la sede activa debe estar clara.

No repetir “Sede principal” en cada componente si ya existe contexto global.

---

# 51. Fechas

Todas las fechas deben respetar la zona horaria de la organización.

La UI debe evitar ambigüedades.

Preferir:

```text
15 ago 2026
```

Sobre:

```text
15/08/26
```

cuando el espacio lo permita.

---

# 52. Fechas relativas

Puede utilizarse:

```text
Hoy
Ayer
Mañana
En 3 días
```

cuando facilita comprensión.

En detalles y auditoría conservar fecha exacta.

---

# 53. Auditoría

Como Nummo prioriza trazabilidad, los detalles importantes deben permitir comprender:

- qué ocurrió;
- cuándo;
- quién lo hizo;
- qué se revirtió;
- qué se ajustó.

No esconder historial relevante por simplificar la interfaz.

---

# 54. Confirmaciones

Pedir confirmación cuando exista:

- impacto financiero;
- reversión;
- finalización;
- cambio sensible;
- operación de Numi;
- cambio de configuración crítico.

No pedir confirmación para acciones triviales.

---

# 55. Reversión

Cuando una operación financiera se revierte, comunicarlo como reversión, no como eliminación.

Ejemplo:

```text
Revertir pago
```

No:

```text
Eliminar pago
```

---

# 56. Reportes

Los reportes deben priorizar:

- comparación;
- tendencia;
- contexto;
- lectura rápida.

No usar gráficas solo porque “se ven bonitas”.

Cada gráfica debe responder una pregunta.

Ejemplos:

```text
¿Cómo cambió mi flujo de caja?
¿De dónde vienen mis ingresos?
¿En qué estoy gastando?
¿Cuánto de mi cartera está vencido?
```

---

# 57. Gráficas

Mantener paleta coherente.

Prioridad:

```text
Blue
Teal
Cyan
Indigo
Neutral
```

Rojo y ámbar principalmente para semántica de alerta.

Evitar arcoíris de colores sin significado.

---

# 58. Tooltips de gráficas

Deben mostrar cifras exactas.

Ejemplo:

```text
Agosto 2026

Ingresos   $14.920.000
Egresos     $8.230.000
Neto        $6.690.000
```

---

# 59. Datos densos

Cuando haya mucha información:

- agrupar;
- permitir filtros;
- ofrecer búsqueda;
- mostrar resumen;
- permitir drill-down.

No reducir tipografía hasta hacerla ilegible.

---

# 60. Performance percibida

Priorizar:

- respuesta inmediata al clic;
- skeletons;
- optimistic UI cuando sea seguro;
- cargas parciales;
- evitar bloquear toda la pantalla.

Numi debe hacer que los procesos se sientan acompañados, no más lentos.

---

# 61. Performance técnica

Para nuevas secciones:

- evitar renders innecesarios;
- cargar módulos pesados bajo demanda cuando corresponda;
- paginar datasets grandes;
- virtualizar tablas grandes si es necesario;
- optimizar imágenes;
- no introducir librerías pesadas por resolver un detalle pequeño.

---

# 62. Estado local y remoto

Usar el patrón ya establecido por el proyecto.

No duplicar datos remotos innecesariamente en estado global.

No introducir una nueva librería de estado sin justificación.

---

# 63. Dependencias

Antes de instalar una nueva dependencia:

1. comprobar si el proyecto ya resuelve el problema;
2. revisar si un componente existente puede reutilizarse;
3. valorar peso y mantenimiento;
4. evitar dependencias para tareas triviales.

No cambiar stack o librerías base durante un cambio visual salvo solicitud expresa.

---

# 64. Componentización

Crear componentes reutilizables cuando exista repetición real.

Ejemplos candidatos:

```text
PageHeader
MetricCard
StatusBadge
Money
DateDisplay
DataTable
EmptyState
NumiLoader
NumiInlineLoader
NumiPanel
ConfirmOperation
AccountCard
QuickAction
```

No abstraer prematuramente componentes usados una sola vez si la abstracción complica el código.

---

# 65. Nombres de componentes

Usar nombres basados en función, no apariencia.

Preferir:

```text
MetricCard
PaymentConfirmation
AccountBalance
```

Evitar:

```text
BlueCard
BigBox
PrettyPanel
```

---

# 66. Separación de lógica y presentación

Los componentes visuales no deben contener lógica de negocio compleja innecesariamente.

Separar cuando corresponda:

- fetching;
- mutations;
- autorización;
- cálculos;
- formato;
- presentación.

---

# 67. Formateadores compartidos

Centralizar utilidades para:

- dinero;
- fechas;
- porcentajes;
- documentos;
- teléfonos;
- estados.

No implementar manualmente el formato COP en cada componente.

---

# 68. Estados derivados

No guardar en estado valores que pueden calcularse confiablemente desde datos existentes, salvo razón de performance o arquitectura.

---

# 69. Datos mock

Cuando se diseñe una sección nueva con datos mock:

- marcar claramente que son mock;
- no dejar mocks accidentalmente conectados al flujo productivo;
- estructurarlos de forma parecida al contrato real;
- no inventar campos que contradigan el backend.

---

# 70. Integración con backend

La UI se adapta al contrato real del backend.

No modificar el dominio únicamente porque una pantalla mock asumió otra estructura.

Cuando falte un dato necesario:

- identificarlo;
- manejar el estado;
- no inventarlo.

---

# 71. Errores

Los mensajes de error deben ser comprensibles.

Evitar mostrar directamente:

```text
500 Internal Server Error
Constraint violation
undefined is not a function
```

Convertir errores técnicos a mensajes útiles, manteniendo logs técnicos para desarrollo.

---

# 72. Formularios y errores

Un error debe:

- estar cerca del campo;
- explicar qué debe corregirse;
- conservar los demás datos ingresados;
- no borrar el formulario.

---

# 73. Copywriting

La voz de Nummo debe ser:

- clara;
- breve;
- tranquila;
- profesional;
- cercana.

Evitar lenguaje bancario innecesariamente complejo.

Ejemplo:

Mejor:

```text
Tienes 8 cuentas vencidas.
```

Peor:

```text
Se evidencian ocho obligaciones pecuniarias en estado de vencimiento.
```

---

# 74. Microcopy

Botones deben describir acción.

Preferir:

```text
Registrar pago
Crear cobro
Guardar cambios
Revertir movimiento
```

Evitar:

```text
Aceptar
Continuar
OK
```

cuando puede usarse una acción más explícita.

---

# 75. Empty copy

Debe explicar qué es la funcionalidad y qué hacer.

Numi puede ayudar, pero no debe convertirse en sustituto de una buena interfaz.

---

# 76. Densidad

Nummo debe sentirse eficiente, no minimalista hasta ocultar información.

Objetivo:

**densidad media.**

Hay suficiente información para trabajar, pero cada bloque respira.

---

# 77. Prohibiciones visuales

Evitar:

- glassmorphism excesivo;
- neumorphism;
- gradientes en todas las superficies;
- sombras enormes;
- bordes gruesos;
- colores saturados por toda la pantalla;
- cards dentro de cards sin necesidad;
- iconos inconsistentes;
- animaciones decorativas constantes;
- tablas tipo Excel;
- dashboards con 20 KPIs;
- texto diminuto para hacer caber contenido.

---

# 78. Prohibiciones de UX

No:

- ocultar acciones esenciales;
- cambiar navegación entre pantallas sin motivo;
- abrir nueva página para cada microacción;
- pedir confirmación para todo;
- bloquear la pantalla por cualquier petición;
- perder filtros al volver de un detalle cuando sea razonable conservarlos;
- borrar datos introducidos tras error;
- depender del hover para funcionalidad crítica;
- diseñar únicamente para desktop.

---

# 79. Prohibiciones técnicas

No:

- introducir colores hardcoded repetidamente;
- duplicar componentes existentes;
- introducir una nueva biblioteca para cada sección;
- mezclar estilos inline arbitrarios con el sistema visual;
- reescribir un módulo completo para un cambio pequeño;
- romper contratos existentes;
- ignorar TypeScript/lint/tests existentes;
- usar `any` indiscriminadamente;
- dejar código muerto;
- dejar console logs de desarrollo sin necesidad.

---

# 80. Workflow para construir una nueva sección

Cada nueva sección debe construirse pequeña y progresivamente.

## Paso 1 — Entender el objetivo

Definir:

- qué quiere lograr el usuario;
- cuáles son las acciones principales;
- qué información necesita primero.

## Paso 2 — Identificar datos

Revisar:

- endpoints;
- modelos;
- permisos;
- estados;
- filtros.

## Paso 3 — Diseñar jerarquía

Ordenar:

1. page header;
2. resumen si aplica;
3. acción principal;
4. filtros;
5. contenido;
6. detalle;
7. estados especiales.

## Paso 4 — Desktop

Resolver primero jerarquía y densidad.

## Paso 5 — Mobile

Replantear, no encoger.

## Paso 6 — Estados

Implementar:

- loading;
- empty;
- error;
- populated.

## Paso 7 — Accesibilidad

Revisar:

- teclado;
- focus;
- labels;
- contraste;
- touch.

## Paso 8 — Pulido

Solo después:

- animaciones;
- microinteracciones;
- detalles decorativos.

---

# 81. Checklist antes de dar una sección por terminada

- [ ] Respeta los colores oficiales de Nummo.
- [ ] Funciona en modo claro.
- [ ] Funciona en modo oscuro.
- [ ] Funciona en desktop.
- [ ] Funciona en mobile.
- [ ] La acción principal es obvia.
- [ ] La jerarquía visual es clara.
- [ ] Los montos son fáciles de leer.
- [ ] Los estados tienen significado consistente.
- [ ] Los filtros son comprensibles.
- [ ] Existe estado loading.
- [ ] Existe estado vacío.
- [ ] Existe estado de error.
- [ ] Las operaciones importantes tienen feedback.
- [ ] Se respetan roles y permisos.
- [ ] No se inventan datos.
- [ ] No se instalaron dependencias innecesarias.
- [ ] No se duplicaron componentes existentes.
- [ ] Los componentes reutilizables se reutilizaron.
- [ ] Numi está integrado solo donde aporta valor.
- [ ] La experiencia no depende exclusivamente del hover.
- [ ] Los controles mobile tienen tamaño táctil adecuado.
- [ ] Focus y teclado funcionan.
- [ ] Se respeta reduced motion cuando aplica.

---

# 82. Regla para futuras solicitudes de UI

Cuando se solicite cambiar o crear una pantalla de Nummo:

1. leer este `context.md`;
2. revisar los componentes existentes antes de crear nuevos;
3. mantener el lenguaje visual actual;
4. hacer el cambio mínimo necesario;
5. no rediseñar otras secciones sin necesidad;
6. conservar responsive desktop/mobile;
7. conservar light/dark;
8. respetar permisos;
9. considerar todos los estados;
10. utilizar Numi únicamente cuando aporte contexto, asistencia o identidad.

---

# 83. Regla de no regresión visual

Una nueva pantalla no debe introducir un estilo que contradiga las anteriores.

Si una mejora amerita cambiar un patrón global:

- actualizar el componente base;
- aplicar el cambio de manera consistente;
- actualizar este documento si el patrón oficial cambia.

No aplicar “parches visuales” aislados.

---

# 84. Evolución del sistema

Este documento es vivo.

Cuando se tome una decisión importante sobre:

- navegación;
- componentes;
- tipografía;
- comportamiento;
- tablas;
- formularios;
- Numi;
- loaders;
- responsive;
- accesibilidad;

actualizar este archivo.

El objetivo es que el código y el `context.md` nunca cuenten historias diferentes.

---

# 85. Regla final

Nummo debe sentirse como una plataforma donde el usuario entiende sus finanzas sin esfuerzo.

Antes de aprobar cualquier decisión visual preguntarse:

> ¿Esto hace más fácil entender, decidir u operar?

Si la respuesta es no, probablemente no hace falta.

La estética debe servir a la claridad.

**Nummo debe verse moderno porque está bien diseñado, no porque esté decorado.**

---

# 86. Stack técnico

Este es el stack acordado del frontend. **No se cambia durante un trabajo de diseño.**
Sustituir o añadir una pieza base requiere solicitud expresa (ver sección 63).

## 86.1. Núcleo

| Pieza | Versión | Rol |
| --- | --- | --- |
| **React** | 19.2 | Librería de UI. Function components + hooks. Sin componentes de clase. |
| **TypeScript** | 6.0, `strict` | Tipado. Sin `any` (sección 89). |
| **Vite** | 8.2 | Bundler y dev server. Proxy `/api` → backend en desarrollo. |
| **React Router** | 8.3 | Enrutado (`createBrowserRouter`). Rutas pesadas con `lazy()`. |
| **pnpm** | vía corepack | Gestor de paquetes. |

## 86.2. Estilos y sistema visual

| Pieza | Versión | Rol |
| --- | --- | --- |
| **Tailwind CSS** | 4.3 | Utilidades. Configuración CSS-first en `src/index.css` (`@theme inline`). |
| **shadcn/ui** | new-york, escrito a mano | Base de `src/components/ui/`. El CLI falla en este entorno (bug de `fs-extra` con Node 24): los componentes se copian a mano desde la fuente canónica. |
| **Radix UI** | dialog, dropdown-menu, popover, slot | Primitivas accesibles bajo shadcn. |
| **class-variance-authority** | 0.7 | Variantes de componentes (`buttonVariants`, `badgeVariants`). |
| **clsx** + **tailwind-merge** | — | `cn()` en `src/lib/utils.ts`. **Toda** composición de clases pasa por ahí. |
| **tw-animate-css** | 1.4 | Animaciones de entrada/salida de Radix. |
| **lucide-react** | 1.31 | **Única** familia de iconos (sección 37). |
| **@fontsource-variable/inter** · **sora** | 5.3 | Fuentes self-hosted: Inter (cuerpo), Sora (títulos, `font-display`). |

## 86.3. Datos y estado

| Pieza | Versión | Rol |
| --- | --- | --- |
| **TanStack Query** | v5 | **Estado del servidor.** Única fuente de verdad para datos remotos. |
| **TanStack Table** | v9 | Motor headless de listados, en **modo manual** (el API ordena y busca). |
| **Zustand** | 5.0 | **Solo estado de UI** (tema, organización seleccionada, panel de Numi). |
| **React Hook Form** | 7.85 | Formularios. |
| **Zod** | 4.4 (+ `@hookform/resolvers`) | Validación de formularios en cliente. El backend revalida siempre. |
| **Orval** | 8.24 | Genera cliente + hooks de Query desde `contract/openapi.json`. |
| **Sonner** | 2.0 | Toasts. |

## 86.4. Plataforma

| Pieza | Versión | Rol |
| --- | --- | --- |
| **vite-plugin-pwa** + **workbox-window** | 1.3 / 7.4 | App instalable. Precache del shell; `NetworkOnly` para `/api`, `/health`, `/openapi.json`, `/docs`. Actualización con `registerType: 'prompt'`. |
| **sharp** | 0.35 | `pnpm icons:gen`: deriva favicons e iconos PWA desde `brand/logo_nummo.png`. |

## 86.5. Calidad

| Pieza | Versión | Rol |
| --- | --- | --- |
| **Vitest** | 4.1 | Tests unitarios y de componente (entorno jsdom). |
| **Testing Library** (react · user-event · jest-dom) | — | Tests desde el punto de vista del usuario. |
| **Playwright** | 1.62 | E2E (`e2e/smoke.spec.ts`, `e2e/numi.spec.ts`). |
| **oxlint** | 1.75 | Linter. Reglas activas: `react/rules-of-hooks`, `react/only-export-components`. |

## 86.6. Scripts

```bash
pnpm dev        # dev server en http://localhost:5173
pnpm build      # tsc -b && vite build
pnpm preview    # sirve el build (única forma de probar el service worker)
pnpm typecheck  # tsc -b --noEmit
pnpm lint       # oxlint
pnpm test       # vitest run
pnpm test:watch # vitest
pnpm e2e        # playwright test
pnpm api:gen    # regenera el cliente desde contract/openapi.json
pnpm icons:gen  # regenera favicons e iconos PWA desde brand/
```

**Antes de dar por terminado cualquier cambio:** `pnpm typecheck && pnpm lint && pnpm test`.

---

# 87. Arquitectura del frontend

## 87.1. Estructura de carpetas

```text
src/
  api/
    http-client.ts       # mutator de Orval: credentials:include + x-csrf-token + ApiError
    generated/           # cliente + hooks generados — NUNCA se edita a mano
  app/
    layout/app-shell.tsx # shell: sidebar (drawer en móvil) + Outlet + Numi
    providers.tsx        # QueryClientProvider + ThemeProvider + Toaster + handler 401
    router.tsx           # rutas públicas + protegidas, con code-splitting
  components/            # componentes TRANSVERSALES (usados por 2+ features)
    ui/                  # primitivas del sistema de diseño (shadcn a mano)
  features/<dominio>/    # una carpeta por dominio de producto
    hooks.ts             # hooks de datos del dominio (envuelven los de Orval)
    labels.ts            # traducción de enums del backend a español
    *-page.tsx           # pantallas
    *-dialog.tsx         # diálogos del dominio
  lib/                   # utilidades puras y sin estado (format, errors, csv, utils)
  pages/                 # pantallas sueltas que no son un dominio (health)
  pwa/                   # service worker, prompt de instalación, aviso sin conexión
  stores/                # Zustand — SOLO estado de UI
  test/setup.ts          # setup de Vitest
```

## 87.2. Reglas de ubicación

| Si el código… | va en… |
| --- | --- |
| es una primitiva visual sin dominio (botón, input, tabla) | `components/ui/` |
| lo usan dos o más features | `components/` |
| lo usa una sola feature | `features/<dominio>/` |
| es una función pura sin React ni dominio | `lib/` |
| habla con el API | `features/<dominio>/hooks.ts` |
| lo generó Orval | `api/generated/` — **intocable** |

**Regla de dirección de dependencias:** `features/` puede importar de `components/`, `lib/` y
`api/`. `lib/` **no importa nada** de la app: es puro. `components/` no importa **pantallas,
diálogos ni UI** de una feature — eso sería acoplar la capa compartida a un dominio y abre la
puerta a ciclos.

**La excepción, acotada:** un componente compartido **sí puede llamar a hooks** de datos o de
contexto (`useCurrentOrg`, `useContacts`, `usePaymentMethods`). La regla se escribió como
prohibición total y la realidad la desmintió tres veces —`ContactPicker`, `SettlementDrawer`—:
un componente transversal que necesita datos solo tiene dos salidas, llamar al hook o exigir que
cada llamante le pase todo por props, y lo segundo devuelve al sitio de origen la duplicación que
el componente venía a quitar. Lo que importa es que la dependencia sea **hacia los datos, nunca
hacia la pantalla**.

Regla práctica: si el import de `components/` termina en `hooks`, está bien; cualquier otra cosa
—una pantalla, un diálogo, un panel, **o los predicados de permisos**— viaja como prop. Los tres
listados compartidos reciben `canManage` / `canRegister` de su feature en vez de calcularlo: quién
puede hacer qué es una decisión de dominio, no de presentación.

## 87.3. Capas por pantalla

Cada pantalla se separa en tres responsabilidades (sección 66):

```text
hooks.ts        →  datos: queries, mutations, claves de caché, invalidación
labels.ts       →  traducción de enums y tonos de estado
*-page.tsx      →  composición y presentación
```

La página no construye claves de query ni llama a `fetch`. El hook no renderiza.

## 87.4. Composición del shell

- **Escritorio (≥1024px):** sidebar fijo de 240px + área de contenido con `max-w-6xl`.
- **Móvil/tablet (<1024px):** header de 56px con menú hamburguesa que abre el sidebar
  completo en un `Sheet` lateral.
- **Numi:** widget flotante montado en el shell, disponible en toda pantalla protegida.
- `AppShell` resuelve por sí mismo tres estados: cargando organización, sin organizaciones
  (onboarding de creación) y operativo.

## 87.5. Rutas

- Definidas en `src/app/router.tsx` con `createBrowserRouter`.
- **Todas** las pantallas se cargan con `lazy: async () => ({ Component: ... })`.
- Rutas en **español** (`/cartera/cxc`, `/gastos/egresos`, `/informes/resultados`), aunque
  el API hable inglés. La URL es interfaz de usuario.
- **Patrón de detalle sobre lista, sin excepciones:** ficha, alta y edición se declaran **hijas**
  de la ruta de lista, la lista monta su `<Outlet />` y el componente hijo se dibuja dentro de un
  `DetailDrawer`. Así se conservan filtros y scroll (sección 78) y la URL se sigue pudiendo
  compartir y recargar.

  **Se aplica a las diez rutas con parámetro**, no solo a las de dinero. Hubo un tiempo en que
  algunas fichas colgaban de la raíz con su `PageHeader` y su botón «Volver»: al abrirlas se
  perdían los filtros de la lista, y al volver había que reconstruirlos a mano. La comprobación es
  mecánica —¿la ruta con `:id` está dentro de `children`? ¿el padre monta `<Outlet />`?— y conviene
  hacerla al añadir cualquier pantalla nueva.

  Ojo con el `<Outlet />`: puede estar **dentro del componente compartido** que la página monta,
  no en la página. `SettlementList` lo lleva por pagos y por egresos.

## 87.6. Estado

| Tipo de estado | Dónde vive |
| --- | --- |
| Datos del servidor | **TanStack Query**. Nunca se copian a Zustand. |
| Estado de UI global (tema, org activa, panel de Numi) | **Zustand**, en `stores/` o `features/*/[algo]-store.ts` |
| Estado de una pantalla (filtros, página, diálogo abierto) | `useState` local |
| Estado derivable de otro estado | **no se guarda** — se calcula (sección 68) |

`useEffect` se usa **solo** para sincronizar con sistemas externos (título del documento,
listeners, `matchMedia`), nunca como mecanismo de flujo de datos.

---

# 88. Contrato con el backend

## 88.1. Origen de la verdad

- El contrato vive en `contract/openapi.json` (v1.0.0, 73 endpoints) y en vivo en
  `http://localhost:4010/openapi.json`.
- Los handoffs por área están en `contract/HANDOFF-fase-0.md` … `HANDOFF-fase-8.md`, y el
  resumen en `contract/SYNC-STATUS.md`. **Léelos antes de construir una sección nueva.**
- Cuando el backend publica un contrato nuevo: se copia el `openapi.json` a `contract/` y se
  corre `pnpm api:gen`.

## 88.2. Código generado

`src/api/generated/**` **no se edita a mano.** Cualquier ajuste se hace envolviendo el hook
generado desde `features/<dominio>/hooks.ts`, nunca modificando la salida de Orval.

## 88.3. Autenticación

- Cookies **HttpOnly** + **CSRF**. El cliente HTTP va con `credentials: 'include'`.
- En desarrollo el proxy de Vite (`/api` → `localhost:4010`) mantiene el **mismo origen**,
  que es lo que permite que la cookie viaje sin CORS.
- Antes de cada mutación se envía `x-csrf-token`, obtenido de `GET /api/v1/auth/csrf`.
  El token es **session-bound**: hay que volver a pedirlo tras login y tras logout.
- Un 401 se maneja globalmente en `app/providers.tsx`.

## 88.4. Dinero

- El backend envía los montos como **string decimal** (`"350000.00"`), no como número.
- **Nunca** se convierte a `number` para guardarlo, compararlo como saldo ni recalcular
  totales. `Number()` solo se usa para presentación (formatear, dibujar una barra, calcular
  un delta porcentual visual).
- El front **no es fuente de verdad** de ningún saldo. Si un total no viene del API, no se
  inventa: se muestra el estado correspondiente (sección 70).
- Todo formato monetario pasa por `lib/format.ts`. Nunca se implementa a mano en un
  componente (sección 67).

## 88.5. El front no es frontera de seguridad

Zod valida en cliente para dar buen feedback. El backend revalida todo. Los permisos de rol
(`features/organizations/roles.ts`) sirven para **no mostrar** acciones imposibles, no para
protegerlas.

---

# 89. Clean code — TypeScript

- **`strict` siempre.** Nada de `any`, ni explícito ni por omisión. Si un tipo es realmente
  desconocido, `unknown` + estrechamiento.
- **Sin `as` para tapar errores de tipo.** Un cast es aceptable solo cuando el compilador no
  puede saber algo que el contrato sí garantiza, y va comentado.
- **Tipos derivados del contrato**, no reescritos a mano:
  ```ts
  import type { ReceivableBalance } from '@/api/generated/model'
  ```
  Duplicar a mano una interfaz que Orval ya generó es deuda garantizada.
- **`type` para uniones y formas; `interface` para contratos extensibles.** Coherente con el
  archivo donde vives.
- **Uniones de literales en vez de `string`** cuando el conjunto es cerrado:
  ```ts
  type StatusFilter = '' | 'PENDING' | 'PARTIAL' | 'OVERDUE' | 'PAID'
  ```
- **`as const`** para tablas de constantes que alimentan tipos.
- **Nombres en inglés para el código, en español para lo que ve el usuario.** Los enums del
  backend se traducen en `labels.ts`, nunca en el JSX.
- **Funciones puras en `lib/`**, con tests. Si algo se puede probar sin montar React, va ahí.

---

# 90. Clean code — React

## 90.1. Componentes

- Un componente = una responsabilidad. Si el archivo pasa de ~250 líneas, casi siempre hay
  dos componentes dentro.
- **Export nombrado**, no `default`. Facilita renombrar y buscar.
- **Un componente compartido no se exporta desde una página.** Si dos pantallas necesitan el
  mismo `StatusPill`, sube a `components/ui/`; importar desde `*-list-page.tsx` acopla el
  detalle a la lista (ver brecha 95.9).
- **Composición sobre props booleanas.** Antes de añadir la quinta bandera a un componente,
  partirlo o aceptar `children`/slots.
- Props tipadas en línea o con una `interface` cercana; nada de `React.FC`.

## 90.2. Hooks

- Los hooks de datos viven en `features/<dominio>/hooks.ts` y devuelven un objeto con nombres
  de dominio, no la forma cruda de Query:
  ```ts
  const { items, total, totalPages, isPending, isError, error, isFetching } = useReceivables(orgId, params)
  ```
- Las claves de query se construyen en el hook, en un solo sitio. La invalidación tras una
  mutación también.
- `useMemo`/`useCallback` **solo** cuando hay una razón: una lista de columnas que se
  recrearía en cada render, un `Map` de lookup, una dependencia de efecto. No por reflejo.
- **`useEffect` solo para sincronizar con el exterior.** Derivar datos en un efecto es un
  bug esperando: se calcula en el render.

## 90.3. Renderizado

- Nunca el índice como `key` en listas con identidad (solo en esqueletos).
- Formatear en el borde de presentación, no en el hook: el hook entrega el dato del contrato,
  el componente lo formatea con `lib/format.ts`.
- El acceso a datos que puede faltar se maneja explícitamente: `?? '—'` es el vacío visual
  del sistema, no una cadena vacía.

## 90.4. Comentarios

El código de este proyecto comenta **el porqué**, no el qué. Los comentarios existentes son
buenos ejemplos: explican una decisión (por qué `manualSorting`, por qué el aro del loader
usa una máscara, por qué `--primary` no se aclara en hover). Sigue ese estilo:

- explica decisiones no obvias y trampas;
- no narres lo que la línea siguiente ya dice;
- en español, como el resto del repositorio;
- si un comentario deja de ser cierto, se borra o se corrige — un comentario mentiroso es
  peor que ninguno.

## 90.5. Higiene

- Cero código muerto. Si dejó de usarse, se borra (el historial de git lo guarda).
- Cero `console.log` de desarrollo en `main`.
- Cero `TODO` sin dueño ni contexto.
- Cero dependencias nuevas sin pasar por la sección 63.

---

# 91. Clean code — estilos

- **Toda** clase compuesta pasa por `cn()`. Nunca concatenación con plantillas.
- **Solo tokens semánticos.** `bg-card`, `text-muted-foreground`, `border-border`. Nunca
  `bg-slate-100` ni un hex. La única excepción viva es `THEME_COLOR` en `theme-provider.tsx`,
  que alimenta la meta `theme-color` del navegador y no puede ser una variable CSS.
- Un token nuevo se declara en `src/index.css` en **los tres sitios**: `:root`, `.dark` y
  `@theme inline`. Un token que solo existe en claro es un bug de modo oscuro.
- El orden de utilidades sigue el del resto del archivo (layout → caja → tipografía → color →
  estado). Coherencia por encima de preferencia personal.
- Nada de estilos en línea salvo valores calculados en tiempo de ejecución (por ejemplo el
  ancho porcentual de una barra).
- Los `@keyframes` y utilidades de animación viven en `src/index.css`, no dispersos por los
  componentes, y **siempre** con su bloque `prefers-reduced-motion`.

---

# 92. Testing

## 92.1. Qué se prueba

| Capa | Herramienta | Qué se cubre |
| --- | --- | --- |
| Utilidades puras (`lib/`) | Vitest | Todos los caminos, incluidos los bordes (`format`, `csv`, `errors`) |
| Lógica de dominio (`roles.ts`, `utils.ts`) | Vitest | Reglas de permiso y de negocio del front |
| Componentes con comportamiento | Testing Library | Lo que el usuario ve y hace, no el estado interno |
| Flujos completos | Playwright | Login, navegación, Numi |

## 92.2. Cómo se prueba

- Consultas por **rol y texto accesible** (`getByRole`, `getByLabelText`), no por clase CSS
  ni por `data-testid` salvo último recurso. Un test que se rompe al renombrar una clase no
  estaba probando nada útil.
- Interacción con `user-event`, no con `fireEvent`.
- Nada de esperas por tiempo: `findBy*` y `waitFor`.
- Las funciones sensibles al reloj reciben la fecha por parámetro (`formatDateHuman(value, today)`)
  precisamente para poder probarse sin congelar el tiempo. Mantén ese patrón.

## 92.3. Cuándo se escribe

- Toda utilidad nueva en `lib/` nace con test.
- Todo bug corregido en lógica pura suma un test que lo reproduce.
- No se persigue cobertura por cobertura: se prueban decisiones, no getters.

---

# 93. Git y entrega

- **Commits pequeños y temáticos.** Un commit = un cambio explicable en una frase.
- Mensaje en español, imperativo y concreto: `Unifica StatusPill en components/ui`, no
  `cambios varios`.
- **El código generado (`src/api/generated/**`) se commitea**, pero solo como resultado de
  `pnpm api:gen`, nunca con ediciones manuales encima.
- Antes de subir: `pnpm typecheck && pnpm lint && pnpm test`.
- Si un cambio altera un patrón global de este documento, **la actualización de `context.md`
  va en el mismo commit** que el código.

---

# 94. Inventario real de componentes

Esta tabla evita el error más caro: crear un componente que ya existe con otro nombre.
Los nombres de la izquierda son los que propone la sección 64 de este documento.

## 94.0. Las pantallas espejo comparten componente

Media app está duplicada por diseño: cobrar y pagar, cuentas por cobrar y por pagar, pagos y
egresos. Se parecen tanto que **copiar el archivo del otro lado y cambiarle las palabras siempre
es lo más rápido** — y siempre acaba igual: el arreglo se hace en uno de los dos y las pantallas
se separan.

La regla es que el componente sea **uno solo, parametrizado**. Lo que cambia entre lados casi
siempre son palabras y un endpoint, así que viajan como props:

| Espejo | Componente compartido | Qué aporta cada lado |
| --- | --- | --- |
| Cuentas por cobrar / por pagar | `BalanceKpis`, `FilterSortField`, `DataList` | Etiquetas y su consulta |
| Registrar pago / egreso | `SettlementDrawer` | `copy` (una docena de palabras) y `onSubmit` |
| Pagos / egresos | `SettlementList`, `CashflowKpis` | `copy` y un hook que consulta su endpoint |
| Acuerdos / gastos recurrentes | `RecurringList` | `copy` y un hook que consulta su endpoint |

`SettlementDrawer` nació de dos archivos de ~310 líneas idénticos salvo por eso. Hoy el
formulario vive una vez y cada página son ~120 líneas: sus palabras, su consulta de cuentas
abiertas y su llamada al contrato. La lógica que no es de pantalla —qué cuenta admite dinero, qué
entrega el formulario— vive en `lib/settlement.ts`, donde se puede probar sin montar nada.

Y al revés: **si tocas un lado del espejo, revisa el otro en el mismo commit.**

| Propuesto (§64) | En el código hoy | Ruta |
| --- | --- | --- |
| `PageHeader` | ✅ `PageHeader` | `components/page-header.tsx` |
| `MetricCard` | ✅ `KpiTile` | `components/kpi-tile.tsx` |
| `StatusBadge` | ✅ `StatusBadge` (+ atajo `StatusDot`) | `components/ui/status-badge.tsx` |
| `Money` | ✅ como función, no como componente | `formatMoney` / `formatAmount` en `lib/format.ts` (§9.1) |
| `DateDisplay` | ❌ no existe como componente | función `formatDateHuman` en `lib/format.ts` |
| `DataTable` | ✅ `DataList` (tabla + tarjetas apiladas) | `components/ui/data-list.tsx` |
| `EmptyState` | ✅ `EmptyState` + `NoResults` | `components/ui/empty-state.tsx` |
| `NumiLoader` | ✅ `NumiLoader` | `components/ui/loader.tsx` |
| `NumiInlineLoader` | ✅ `NumiLoader compact` / `Loader` | `components/ui/loader.tsx` |
| `NumiPanel` | ✅ `NumiPanel` + `NumiWidget` | `features/assistant/` |
| `ConfirmOperation` | ✅ `ConfirmDialog` | `components/ui/confirm-dialog.tsx` |
| `AccountCard` | ❌ no existe | lista inline en `features/finances/accounts-page.tsx` |
| — | ✅ `ErrorState` + `InlineError` | `components/ui/error-state.tsx` |
| `QuickAction` | ✅ `QuickActionTile` + catálogo compartido | `features/actions/` |

## 94.1. Componentes existentes que el documento no nombraba

Todos son parte del sistema y deben reutilizarse:

| Componente | Ruta | Para qué |
| --- | --- | --- |
| `Panel` | `components/panel.tsx` | Tarjeta de sección con cabecera y acción |
| `Pagination` | `components/pagination.tsx` | Paginación contra el total del servidor |
| `SearchInput` | `components/search-input.tsx` | Buscador de listas |
| `ContactPicker` | `components/contact-picker.tsx` | Selector de contacto con búsqueda |
| `MoneyField` / `MoneyInput` | `components/money-field.tsx`, `ui/money-input.tsx` | Entrada de importes (crudo con punto, vista agrupada) |
| `BarList` | `components/bar-list.tsx` | Ranking con barra proporcional |
| `MonthlyFlowChart` · `AgingChart` | `components/` | Gráficas de flujo y de antigüedad |
| `ContactAmountList` · `UpcomingList` | `components/` | Listas de contacto+importe y de vencimientos |
| `BrandMark` · `BrandLockup` | `components/brand-mark.tsx` | Marca |
| `Drawer` | `components/ui/drawer.tsx` | **El panel lateral de la app** (abajo en móvil, derecha en ≥sm) |
| `DetailDrawer` | `components/ui/detail-drawer.tsx` | `Drawer` atado a una ruta hija |
| `SettlementDrawer` | `components/settlement-drawer.tsx` | Registrar dinero que entra o sale |
| `SettlementList` | `components/settlement-list.tsx` | Listado de pagos o egresos |
| `RecurringList` | `components/recurring-list.tsx` | Listado de acuerdos o gastos recurrentes |
| `CashflowKpis` | `components/cashflow-kpis.tsx` | Cifras de flujo del mes, con comparación |
| `Sheet` · `Dialog` · `Popover` · `DropdownMenu` | `components/ui/` | Primitivas Radix |
| `Field` · `Label` · `Input` · `Textarea` · `NativeSelect` | `components/ui/` | Formularios |
| `SegmentedControl` | `components/ui/segmented-control.tsx` | Alternador de pocas opciones |
| `InfoHint` | `components/ui/info-hint.tsx` | Ayuda contextual breve |
| `Skeleton` | `components/ui/skeleton.tsx` | Esqueletos de carga |
| `MasterCrud` | `features/masters/master-crud.tsx` | Listado CRUD de un maestro |
| `SettingsLayout` | `features/config/settings-layout.tsx` | Shell de Configuración: columna en escritorio, `Drawer` por debajo de `lg` |
| `listColumns` | `components/ui/list-columns.ts` | Declarar columnas tipadas para `DataList` |
| `KpiStrip` + `KpiTile` | `components/kpi-tile.tsx` | Cifras de cabecera en una sola superficie |
| `FilterChips` | `components/ui/filter-chips.tsx` | Filtro principal como fichas visibles con contador |
| `ListToolbar` | `components/ui/list-toolbar.tsx` | La fila de controles de un listado |
| `FilterSheet` · `FilterSheetTrigger` · `FilterField` · `FilterSortField` | `components/ui/filter-sheet.tsx` | Filtros avanzados y orden, en hoja inferior / cajón |
| `BalanceKpis` | `components/balance-kpis.tsx` | Total, vencido y al día de una cartera |
| `SectionSwitch` | `components/section-switch.tsx` | Salto entre pantallas espejo, solo en móvil |
| `useListFilters` | `lib/use-list-filters.ts` | Filtros en la URL, recordados en la sesión |
| `ListResult<T>` | `lib/list-result.ts` | Lo que devuelve cualquier hook de listado |

---

# 95. Auditoría: brechas entre este documento y el código

Estado a la fecha de esta revisión. **Cada línea se cierra o se reclasifica; ninguna se
ignora.** La columna "Resolución" dice quién gana: el documento o el código.

### 95.1. Navegación desktop — ✅ **cerrada (fase 2)**

El sidebar tenía **7 grupos y 21 enlaces**, con un grupo **"Maestros"** que exponía entidades
del backend y "Políticas de interés" en primer nivel — justo lo que §14 prohíbe.

**Resuelto (fase 2):** el sidebar baja a **13 enlaces** y Configuración pasa a ser una única
entrada que abre su propia sub-navegación (`features/config/settings-layout.tsx`), agrupada en
Organización · Preferencias · **Catálogos** · Cartera. "Maestros" desaparece como término de
cara al usuario, también en la guía.

**Las URLs no cambiaron.** `/maestros/…` y `/cartera/interes` siguen resolviendo: lo que se
movió es dónde vive cada pantalla en la navegación, no su dirección. Así ningún enlace
guardado ni el historial se rompen, y no hizo falta una sola redirección.

### 95.2. Navegación mobile — ✅ **cerrada (fase 3)**

El código usaba un `Sheet` lateral con el sidebar completo: 21 enlaces en un cajón y ninguna
acción rápida de creación.

**Resuelto (fase 3):** barra inferior `Inicio · Cartera · Nuevo · Numi · Más`
(`app/layout/bottom-nav.tsx`). "Más" sigue abriendo el sidebar completo, así que no hay una
segunda navegación que aprender. El botón flotante de Numi se limita a escritorio: con la
barra puesta se solapaba con ella.

### 95.3. Dashboard — ✅ **cerrada (fase 4)**

El Panel mostraba **9 KPIs en 3 grupos** y **10 paneles**, sin acciones rápidas, sin bloque de
atención y sin insight — el "vertedero de widgets" que §16 y §77 prohíben.

**Resuelto (fase 4):** reordenado a las seis secciones de §16, con **4 KPIs** (saldo disponible ·
por cobrar · vencido · por pagar).

Lo que se quitó **no se perdió: estaba duplicado.** Los desgloses por concepto y categoría, el
aging, los top deudores y acreedores y los recurrentes ya vivían en Informes, que es donde se
analiza; los saldos por cuenta, en Caja. El Panel dejó de competir con ellos.

### 95.4. Estados vacíos — ✅ **cerrada (fase 1)**

El documento (§27, §75) pide un empty state que explique la funcionalidad y ofrezca el
siguiente paso. El código muestra frases sueltas: `"Sin datos."`, `"No hay pagos con estos
filtros."`, `"Sin cuentas."` — sin componente compartido y sin CTA.

**Resuelto (fase 1):** `EmptyState` y `NoResults` en `components/ui/empty-state.tsx`. Las
listas eligen entre los dos según su propio estado de filtros; `MasterCrud` lo resuelve para
los cuatro maestros componiendo el vacío desde el título y la descripción que ya recibía.

Los `emptyLabel` de los paneles pequeños del panel e informes se conservan a propósito: un
`EmptyState` completo dentro de una tarjeta de 200 px estorba más de lo que ayuda.

### 95.5. Formato monetario — ✅ **cerrada (fase 1)**

El documento (§9) pide `$350.000`. `formatAmount` produce `COP 350.000,00`: prefijo ISO y
siempre dos decimales, también en listados y KPIs.

**Resuelto (fase 1):** `formatMoney` (lectura) y `formatAmount` (contable) en `lib/format.ts`,
con el reparto documentado en §9.1. `formatMoney` no pierde precisión —imprime centavos solo
cuando existen—, así que la diferencia real entre ambas es la alineación de columnas.

### 95.6. Radios — ✅ **cerrada (fase 1)**

El documento (§11) pide 14–18px en cards y 10–12px en inputs y botones.
El código usa `--radius: 0.5rem` → cards a 8px, con el comentario explícito *"consola densa:
esquinas nítidas, superficies planas"*.

**Resuelto (fase 1):** ganó el código. §11 ya documenta la escala real (`rounded-md` 6 px en
inputs y botones, `rounded-lg` 8 px en cards, `rounded-xl` 12 px en superficies de Numi).
No hubo cambio de código: ya era coherente.

### 95.7. Escala tipográfica — ✅ **cerrada (fase 1)**

§8 pide títulos de página de 28–32px en escritorio; `PageHeader` usa `text-xl sm:text-2xl`
(20/24px).

**Resuelto (fase 1):** `PageHeader` pasa a `text-2xl lg:text-3xl` (24/30 px), dentro del rango
que pide §8 en ambos tamaños.

### 95.8. Command bar global — ✅ **cerrada (fase 6)**

En escritorio **no existía header**: el del shell era `lg:hidden`. No había búsqueda global ni
entrada de acciones.

**Resuelto (fase 6):** `features/search/command-bar.tsx`, abierta con ⌘K / Ctrl+K o desde la
cabecera (nueva en escritorio, botón de lupa en móvil). Resuelve las tres cosas de §36 —buscar
contactos, ir a cualquier sección, registrar una operación— y deja a Numi como última opción,
**siempre presente**: es el destino de lo que la aplicación no sabe resolver, y §35 exige que sea
el usuario quien decida preguntar, no un fallback silencioso.

Sin dependencias nuevas: se construyó sobre el `Dialog` que ya existía (§63).

### 95.9. Indicador de estado duplicado — ✅ **cerrada (fase 1)**

Hay **cuatro** implementaciones casi idénticas del mismo indicador de estado:

- `StatusPill` en `features/receivables/receivables-list-page.tsx`
- `ExpenseStatusPill` en `features/expenses/expenses-list-page.tsx`
- `ScheduleStatusPill` en `features/expenses/schedules-list-page.tsx`
- `StatusChip` en `features/expenses/disbursements-list-page.tsx`

Peor: las páginas de **detalle importan el pill desde la página de lista**
(`import { StatusPill } from './receivables-list-page'`), lo que acopla dos pantallas y
arrastra la lista entera al bundle del detalle. Además `TONE_DOT` está duplicado en
`features/receivables/labels.ts` y `features/expenses/labels.ts`.

**Resuelto (fase 1):** al migrar aparecieron **ocho** copias, no cuatro (también en pagos, en
`pending-dues-panel` y en la guía). Todas caen en `components/ui/status-badge.tsx`, que
concentra `StatusTone`, el mapa de tonos, `StatusBadge` y el atajo booleano `StatusDot`
(`status-dot.tsx` desaparece). Cada `labels.ts` expone el par tono/etiqueta de su dominio, así
que ninguna página de detalle importa ya de su página de lista.

### 95.10. Estado de error sin componente — ✅ **cerrada (fase 1)**

§45 exige estado de error en toda pantalla. Existe, pero como **bloque rojo copiado en 15
archivos** (`border-destructive/40 bg-destructive/5 …`).

**Resuelto (fase 1):** `ErrorState` (bloque de sección, `role="alert"`, reintento opcional) e
`InlineError` (mensaje breve de formulario) en `components/ui/error-state.tsx`.

### 95.11. Modo oscuro: `--primary` — ✅ **cerrada (fase 1)**

§5 fija `--primary: #3B82F6` en oscuro. El código mantiene `#2563EB` para el relleno del
botón (blanco encima da 5.2:1) y reserva `#3B82F6` para enlaces, foco y estados activos vía
`--brand`.

**Resuelto (fase 1):** §5.1 documenta el par `--primary` / `--brand` y por qué el relleno del
botón no se aclara en oscuro.

### 95.12. Nomenclatura de tokens — ✅ **cerrada (fase 1)**

§3.2 y §4 hablan de `--surface` y `--surface-subtle`; el código usa el juego de shadcn:
`--card`, `--popover`, `--secondary`, `--muted`.

**Resuelto (fase 1):** §3.2, §4 y §5 listan los tokens reales, con una nota explícita de que
`--surface` / `--surface-subtle` / `--danger` no existen.

### 95.13. Confirmación de operaciones de Numi — ⏸️ **abierta, a la espera del contrato**

§34 exige un **resumen estructurado** con `[Cancelar] [Confirmar]` antes de ejecutar. El flujo de
dos pasos existe y funciona, pero es enteramente textual: se confirma escribiendo "sí".

**Intentado y retirado (fase 5 → fase 6).** Se añadieron botones de Confirmar/Cancelar que
aparecían cuando una heurística (`isAwaitingConfirmation`) detectaba que Numi proponía una
escritura. **Se retiraron a petición del usuario.**

Con la perspectiva de la retirada, la razón de fondo se ve mejor: unos botones que aparecen y
desaparecen según lo que adivine una expresión regular sobre texto libre son un patrón
inconsistente, y §2.5 pide justo lo contrario. Una confirmación de dinero que a veces sale como
botón y a veces hay que teclear enseña dos flujos en lugar de uno.

**Por qué no se puede cerrar bien desde el front:** `POST /assistant/chat` devuelve **texto
plano** y el contrato está congelado en v1.0.0. No hay ningún campo que diga "esto es una
propuesta de escritura, y estos son sus campos". Renderizar la tarjeta de §34 exigiría **parsear
la salida del modelo**, que es frágil justo donde no se puede fallar: un pago mal leído es dinero
mal registrado.

**Lo que haría falta:** que el backend añada al contrato una respuesta estructurada para las
propuestas de operación (tipo, campos, etiquetas). Con eso, la tarjeta de §34 es directa y
determinista. **Hasta entonces esta brecha se queda abierta a propósito**, no se parchea.

### 95.14. Lo que ya cumple

Vale la pena dejarlo escrito para no "arreglarlo":

- Tokens semánticos en los tres bloques (`:root`, `.dark`, `@theme inline`) ✅
- Cero colores hardcoded en componentes ✅
- Cero `any` en el código propio ✅
- `nums` (`tabular-nums`) aplicado a todos los importes ✅
- `prefers-reduced-motion` respetado en todas las animaciones ✅
- Listas: tabla densa en escritorio → tarjetas apiladas en móvil, desde un solo modelo de
  columnas ✅
- Esqueletos de carga en listas; `NumiLoader` reservado a esperas significativas ✅
- Permisos aplicados en UI (`roles.ts`) antes de mostrar acciones ✅
- Fechas en lenguaje natural con fallback exacto ✅
- Code-splitting en todas las rutas ✅
- Filtros conservados al volver del detalle (detalle como ruta hija) ✅

---

# 96. Plan de rediseño por fases

El rediseño se hace **por partes**, en este orden. La regla que ordena las fases: primero lo
que es cimiento de todo lo demás, después lo que más ve el usuario, al final lo más caro.

Cada fase termina con `pnpm typecheck && pnpm lint && pnpm test`, el checklist de la §81 y la
actualización de este documento.

---

## Fase 1 — Cimientos del sistema visual ✅ **completada**

**Por qué primero:** todo lo demás se apoya aquí. Rediseñar el dashboard antes de tener
`EmptyState` significa rediseñarlo dos veces.

**Lo que se hizo**

1. `lib/format.ts`: `formatMoney` (lectura) separado de `formatAmount` (contable), con `$`
   para COP y código ISO para el resto. Ambas con tests; `formatAmount` no tenía. → 95.5
2. `components/ui/status-badge.tsx`: `StatusBadge` único + atajo `StatusDot`. **Ocho** copias
   eliminadas, `status-dot.tsx` borrado, y ningún detalle importa ya de su lista. → 95.9
3. `components/ui/empty-state.tsx`: `EmptyState` y `NoResults`, aplicados en las listas según
   su estado de filtros. → 95.4
4. `components/ui/error-state.tsx`: `ErrorState` e `InlineError` sustituyen el bloque rojo
   repetido en 15 archivos. → 95.10
5. `PageHeader` a `text-2xl lg:text-3xl`. Los radios ya eran coherentes: no hubo cambio de
   código, se corrigió el documento. → 95.6, 95.7
6. §3.2, §4, §5, §9 y §11 reescritas con los tokens, valores y funciones reales.
   → 95.11, 95.12

**Verificación:** `pnpm typecheck` limpio, `pnpm lint` sin errores (solo warnings previos),
`pnpm test` 75 en verde (19 nuevos: 10 de formato, 9 de los componentes de estado).

**Pendiente que la fase 1 dejó anotado:** los dos vacíos en línea del dashboard
(`Sin cuentas.`, `Sin movimientos.`) — resueltos en la fase 4 al rehacer esa pantalla.

---

## Fase 2 — Navegación de escritorio ✅ **completada**

**Por qué segunda:** define dónde vive cada pantalla; conviene antes de rediseñarlas.

**Lo que se hizo**

1. `features/config/settings-layout.tsx`: shell de Configuración con sub-navegación propia
   —columna fija en escritorio; por debajo de `lg` fue una tira horizontal desplazable y hoy es
   el `Drawer` detrás de «Secciones» (§11.1.3)— que absorbe las once pantallas de ajustes. El
   sidebar pasa de 21 a 13 enlaces. → 95.1
2. "Maestros" → **"Catálogos"** de cara al usuario, también en la guía (`/ayuda`), que apuntaba
   a una sección con el nombre viejo.
3. Rutas intactas: cero redirecciones, cero enlaces rotos.
4. Accesibilidad del sidebar (§46): `<nav aria-label>`, `aria-current="page"` —incluido el caso
   en que Configuración está activa por una ruta hija que no comparte prefijo— y anillo de foco
   visible en cada enlace.

**Verificación:** typecheck limpio, 0 errores de lint, 80 tests en verde (5 nuevos sobre el
agrupamiento, el estado activo y que las URLs antiguas siguen resolviendo), build OK.

**Decisión anotada, no ejecutada:** renombrar "Acuerdos" a "Cobros recurrentes" (§14 lo usa como
ejemplo) toca 58 apariciones en 14 archivos, incluido el glosario de la guía y las respuestas de
Numi. Es un cambio de **vocabulario de producto**, no de navegación, y merece su propia pasada
deliberada. Lo mismo con "Panel" → "Inicio".

---

## Fase 3 — Experiencia móvil ✅ **completada**

**Por qué tercera:** es la brecha más grande frente al documento y el uso real (cobrar y
registrar se hacen desde el teléfono).

**Lo que se hizo**

1. `app/layout/bottom-nav.tsx`: barra inferior `Inicio · Cartera · Nuevo · Numi · Más`, con
   `env(safe-area-inset-bottom)` para la franja de gestos de iOS. → 95.2
2. **Nuevo** abre una hoja inferior con seis acciones: registrar pago, registrar egreso, nueva
   cuenta por cobrar, nuevo contacto, nuevo acuerdo y transferencia. Filtradas por rol (§47):
   a un `VIEWER` el botón ni se le dibuja.
3. Dos de esas acciones abrían un diálogo que vive dentro de una lista. Ahora se piden por URL
   (`/cartera/cxc?nueva=1`, `/caja/cuentas?transferir=1`) y la página los abre al llegar,
   consumiendo el parámetro para que volver atrás no los reabra. De paso quedan enlazables.
4. El sidebar se extrae a `app/layout/sidebar.tsx` porque ahora se monta en dos sitios: la
   columna de escritorio y la hoja de "Más".
5. La cabecera de móvil deja de navegar (de eso se encarga la barra) y se queda con lo que
   identifica el contexto: marca, **organización activa** y usuario (§49).
6. Área táctil (§43): botones, inputs y selects crecen a 44 px con la variante nativa
   `pointer-coarse:` de Tailwind, que solo aplica donde se toca con el dedo. El escritorio
   conserva su densidad.

**Verificación:** typecheck limpio, 0 errores de lint, 87 tests en verde (7 nuevos sobre los
destinos, el filtrado por rol y el estado activo), build OK, y la variante `pointer-coarse`
confirmada en el CSS generado.

**Pendiente anotado:** §44 (formularios móviles) — resuelto en la fase 5.

---

## Fase 4 — Dashboard ✅ **completada**

**Por qué cuarta:** ya existían `EmptyState`, `StatusBadge`, el formato de dinero y la
navegación definitiva; el Panel pudo componerse sin inventar piezas.

**Lo que se hizo**

1. Las seis secciones de §16, en ese orden: resumen → acciones rápidas → flujo → necesita tu
   atención → insight de Numi → actividad reciente. → 95.3
2. De 9 KPIs a **4**: saldo disponible, por cobrar, vencido, por pagar.
3. `features/actions/`: el catálogo de acciones rápidas (`quick-actions.ts`) y su tarjeta
   (`quick-action-tile.tsx`) pasan a ser **uno solo**, compartido por el Panel y por el botón
   "Nuevo" de la barra de móvil. Dos catálogos que se desincronizan era el riesgo evidente.
4. "Necesita tu atención" da **contexto, no solo cifra** (§2.2): cuántas cuentas vencidas y de
   quién es el mayor saldo, el próximo cobro y el próximo pago con su fecha. Sin nada que
   atender, lo dice como la buena noticia que es en lugar de mostrar una tarjeta vacía.
5. Un único insight, calculado **solo con cifras del API** (§35), elegido por prioridad —lo que
   duele antes que lo que informa— y **omitido si no hay nada que decir**.

**Corrección posterior — la fila de acciones rápidas se quitó.** §16 la pide, pero en la práctica
sobraba en los dos tamaños: en móvil duplicaba el botón central de la barra inferior y en
escritorio la barra de comandos (⌘K) llega antes y a más sitios. Seis atajos ocupando el primer
pantallazo para algo que ya está a un toque es ruido. **El catálogo sigue vivo**
(`features/actions/quick-actions.ts`) y lo consume la hoja de "Nuevo"; lo que desapareció es la
rejilla del Panel.

**El gráfico de flujo se puede ver en línea o en barras**, con el selector sobre él y **línea por
defecto**: la pregunta del Panel es de tendencia, y una línea la responde de un vistazo. Las
barras siguen a un toque para comparar meses concretos. Sin librería de gráficos (§63): la línea
es un `<path>` de SVG.
6. El saldo disponible se agrega **por moneda**: el API no devuelve un total, y sumar pesos con
   dólares daría una cifra sin significado (§88.4).

**Verificación:** typecheck limpio, 0 errores de lint y **de vuelta a los 10 warnings de base**
—las 6 advertencias que introdujo el primer intento se cerraron separando lógica de
presentación (§66)—, 95 tests en verde (8 nuevos sobre la agregación por moneda y la elección
de insight, incluida la división por cero), build OK.

**De paso:** `UpcomingList` quedó huérfano al sustituirlo "Necesita tu atención" y se borró
(§90.5). Y la fase 2 había dejado la misma clase de warning en `settings-layout.tsx`: también
se corrigió, extrayendo `settings-nav.ts`.

---

## Fase 5 — Listados, detalles y Numi operativo ✅ **completada (con una salvedad)**

**Lo que se hizo**

1. **Filtros activos visibles** (§21): `DataList` gana fichas de filtro, una por criterio, cada
   una con su × y un "Limpiar todo" cuando hay más de una. Conectadas en las siete listas
   operativas, describiendo el filtro en los términos del usuario ("Vencida", "Pagador: Laura
   Gómez") y no en los del API.
2. **§55 auditado, sin cambios necesarios:** las operaciones financieras ya decían "Revertir",
   y los "Eliminar" que quedan son borrados de verdad (una credencial de IA, una relación entre
   contactos), no reversiones disfrazadas. Se deja escrito para no volver a revisarlo.
3. **Confirmación de Numi con botones** (§34): se hizo y **se retiró después, a petición del
   usuario**. Ver 95.13 para el porqué y para lo que haría falta en el contrato.
4. **§44, formularios móviles** —que la fase 3 dejó anotado—: siete formularios usaban
   `grid-cols-2` sin breakpoint, es decir dos columnas a 360 px. Ahora apilan y solo se parten
   desde `sm`. El teclado numérico ya estaba resuelto (`MoneyInput` con `inputMode="decimal"`).

**Verificación:** typecheck limpio, 0 errores de lint, 10 warnings (= base), 98 tests en verde
(3 nuevos sobre la detección de confirmación, incluidos los negativos), build OK.

**Salvedad:** el punto 4 del alcance original —respuestas enriquecidas de Numi (§32, §33): cifra,
breakdown, tabla breve, acciones— **no se hizo, y no se puede hacer solo desde el front** por la
misma razón que 95.13: el endpoint devuelve texto plano. Igual que la confirmación estructurada,
queda como **petición al contrato**, no como deuda del frontend.

**Verificación tras retirar los botones:** typecheck limpio, 0 errores de lint, 10 warnings
(= base), 102 tests en verde, build OK.

---

## Fase 6 — Command bar y pulido ✅ **completada**

**Por qué última:** es la pieza más cara y la que más depende de que todo lo demás esté en su
sitio — y se notó: la paleta se pudo componer entera reutilizando catálogos que ya existían.

**Lo que se hizo**

1. `features/search/command-bar.tsx`: punto de entrada universal (§36), con cabecera nueva en
   escritorio y botón de lupa en móvil. → 95.8
2. **No duplica nada.** Las acciones salen del catálogo de la fase 4, los destinos de
   `features/navigation/sections.ts` (extraído del sidebar) y de `settings-nav.ts` de la fase 2,
   y los contactos de la búsqueda del servidor con rebote. Añadir una sección al sidebar la
   añade a la paleta sin tocarla.
3. **Teclado** (§46): ⌘K / Ctrl+K desde cualquier pantalla —salvo mientras se escribe en un
   campo, donde estorbaría—, ↑/↓ con envolvente, Enter para ejecutar, Esc para cerrar, y
   `role="listbox"`/`role="option"` con `aria-selected` para que un lector de pantalla siga la
   selección.
4. Sin dependencias nuevas (§63): sobre el `Dialog` que ya existía.

**Verificación:** typecheck limpio, 0 errores de lint, 10 warnings (= base), 105 tests en verde
(7 nuevos: agrupación, filtrado sin acentos, permisos, teclado y apertura de Numi), build OK.

**Dos correcciones de camino, encontradas por los tests:**

- `scrollIntoView` no existe en jsdom y tumbaba el árbol entero al renderizar. En navegador no
  fallaba, pero el componente era imposible de probar: se rellena en `test/setup.ts`, junto a
  `matchMedia`.
- Un test propio estaba mal planteado: afirmaba que el filtro funcionaba comprobando que
  **aparecía** lo que coincide, cuando sin filtro la lista ya lo muestra todo. Ahora espera a que
  **desaparezca** lo que no coincide, que es lo único que prueba algo.

---

## 96.1. Resumen

| Fase | Tema | Riesgo | Depende de |
| --- | --- | --- | --- |
| ✅ 1 | Cimientos del sistema visual | bajo | — |
| ✅ 2 | Navegación de escritorio | medio | 1 |
| ✅ 3 | Experiencia móvil | medio | 1, 2 |
| ✅ 4 | Dashboard | medio | 1, 2 |
| ✅ 5 | Listados, detalles y Numi | medio | 1, 4 |
| ✅ 6 | Command bar y pulido | medio-alto | todas |

**Regla de oro del plan:** una fase por rama y por revisión. Nada de rediseñar cuatro
secciones a la vez — el documento existe precisamente para que no haga falta.
