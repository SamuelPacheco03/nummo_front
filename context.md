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

**Esto rige la consola.** La página pública lleva su propia paleta, elegida mirando pantallas en
`/laboratorio` y no en un mockup (§97.2). Lo que no cambia en ninguna de las dos es el isotipo:
`--logo-*` son la marca y no se re-tematizan.

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

**Como relleno, `warning`; como texto, `warning-strong`.** Es la misma regla que ya tenía
`success` y por el mismo motivo: el ámbar de las barras y las insignias da 2.1:1 leído como
texto sobre fondo claro, y `warning-strong` da 4.9:1 (AA). Se estrenó al escribir «Lectura y
escritura» en la barra del playground (§47.5) — y el token **no existía**, así que la clase no
generaba nada y el aviso se quedaba del color del texto normal. Un token que se usa sin estar
declarado no se ve como un error: se ve como si el diseño no tuviera color.

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
| **Cabecera** | La barra de comandos (ocupa el ancho útil), la campana de avisos, el selector de tema y el menú de perfil —que incluye cerrar sesión— |
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

**«Estado del sistema» (`/estado`) solo se enlaza para quien administra la plataforma**, junto a
la consola (§47.2). La salud del backend es cosa de quien lo opera, no de quien lleva las cuentas
de un jardín infantil: el enlace estuvo retirado del pie mientras no existió el superadmin, y
volvió ahí detrás de esa señal en cuanto existió. La ruta sigue viva para todos —soporte puede
pedirla por URL—; lo que está gateado es ofrecerla.

El resto del pie es lo del **dispositivo y la sesión**: instalar la app, el aviso de sin conexión,
el tema y la cuenta.

**Tema y perfil solo aparecen una vez por pantalla.** En escritorio viven en la cabecera, siempre
a la vista, y el pie del sidebar los oculta (`lg:hidden`). Por debajo de `lg` no hay cabecera de
escritorio y ese mismo cuerpo es la hoja de «Más», así que ahí es su único sitio. `SidebarBody`
se usa en las dos, de modo que **la decisión es del breakpoint, no del componente que lo monta**.

Llenar la barra superior de iconos es otra forma de la sopa de tarjetas. **Tres controles a la
derecha es el techo**; el resto vive donde le corresponde.

Fueron dos hasta que llegó el centro de notificaciones (§11.1.8), y el tercero entra por lo único
que distingue a esa campana de los demás iconos que se han querido meter ahí: **es el único que
puede pedir atención sola**. Un contador de avisos sin leer escondido dentro de un menú no avisa
de nada, que es literalmente su trabajo. La regla que queda para el siguiente candidato: a la
cabecera solo sube lo que tiene algo que decir sin que nadie lo abra.

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

**También sirve para navegar.** Una sección con muchos destinos —Configuración y Ayuda— es una
columna fija en escritorio y, por debajo de `lg`, esa misma lista dentro del `Drawer`, detrás de
un botón «Secciones». Es **un solo componente**, `SectionedLayout`
(`components/ui/sectioned-layout.tsx`): las dos llegaron a tenerlo copiado y se extrajo antes de
que la segunda copia empezara a divergir.

Antes era una **tira horizontal desplazable**, y era el error que §21.1 reprocha en los filtros:
de doce destinos se veían tres, los otros nueve quedaban detrás de un gesto que nadie ve, y al
aplanar la lista se perdían los títulos de grupo. Un `select` con `<optgroup>` los recupera en
una sola línea, pero **tiene que mostrar el destino actual** —repitiendo el `<h1>` que va justo
debajo— y en tablet se estira a lo ancho hasta parecer un campo de formulario vacío. El botón no
finge ser otra cosa, y dentro cabe la lista **entera**, con sus grupos y el activo resaltado,
igual que en escritorio.

La regla que deja: **una navegación larga no se aplana en horizontal; se mete en el cajón.**

## 11.1.3b. La tarjeta de una fila en móvil

En escritorio todas las columnas valen lo mismo: son columnas. En una tarjeta de 360 px no, y
durante un tiempo lo fueron — seis pares etiqueta-valor del mismo tamaño donde el nombre del
proveedor pesaba igual que la referencia, y había que leerlos todos para saber de qué iba la fila.

Ahora la tarjeta tiene forma:

```
[icono]  Nombre principal                          ›
         dato · dato
         ● Estado                        $1.840.000
```

Cada columna dice **qué papel tiene ahí** con `meta.card` (§94, `list-columns.ts`): `title`,
`meta`, `status`, `amount` y `sub`. Lo que no declara papel **no desaparece**: cae a un bloque de
pares al pie de la tarjeta, que es el formato de antes usado ya solo para lo secundario. Por eso
una lista sin papeles declarados se sigue viendo como siempre, y se migran de una en una.

Tres reglas que salieron de verlo funcionando:

1. **A `meta` solo lo que siempre tiene valor.** Un «—» en una columna mantiene legible la rejilla
   de escritorio; en la línea de contexto de la tarjeta se lee como un dato roto, y dos seguidos
   dejan separadores sueltos («— · —»). Lo que puede venir vacío va al pie, o se compone en una
   sola columna `hideOnTable` que une lo que hay y se calla lo que no (contactos).
2. **Cada presentación puede ocultar lo que a la otra le sobra**: `hideOnStack` para lo que solo
   tiene sentido en la tabla —el chevron—, `hideOnTable` para lo que solo tiene sentido en la
   tarjeta. Y para un matiz dentro de una misma celda basta `lg:block` / `lg:hidden`: así la
   categoría sigue bajo el nombre del proveedor en la tabla y en la tarjeta va en su línea, sin
   duplicar la columna.
3. **La cabecera no está en la tarjeta.** «15 jul» bajo la columna VENCE se entiende; suelto en una
   línea, no. De ahí los prefijos que solo aparecen por debajo de `lg` («Vence 15 jul»).
4. **Lo que abre la fila no puede vivir en una columna.** Los cinco maestros tenían un botón de
   lápiz en la última columna, y esa columna era `hideOnStack`: por debajo de `lg` no había con qué
   editar, la tarjeta se pulsaba y no pasaba nada. Abrir es de la **fila entera** (`onRowClick`),
   como en todas las demás listas; el chevron solo lo anuncia, y por eso él sí es de la tabla.

**El icono es de la tarjeta, no de la tabla** (`rowIcon` → `RowIconBadge`). Un icono por fila en
una rejilla densa es ruido, y en escritorio la columna ya dice de qué categoría es. Las pantallas
sin catálogo detrás lo rellenan con uno fijo, o con las iniciales cuando la fila es una persona;
**las que sí lo tienen pintan el del concepto o la categoría de esa fila** —cartera, gastos,
recurrentes, pagos y egresos, además de los dos catálogos (§11.1.12)—, y la tarjeta no cambió una
línea, que era justo lo que esto venía a permitir: para eso `RowIcon` acepta un `className`, porque
un color elegido por el usuario no es ninguno de los cinco tonos. **Se suma al tono, no lo
sustituye:** el color del catálogo es solo el del glifo, y sustituyendo, una categoría sin color
elegido se quedaba también sin pastilla. Los tonos siguen siendo semánticos (`neutral`, `brand`,
`success`, `warning`, `destructive`), no colores sueltos.

**El ancho lo pone el layout, no cada página.** Unas iban a `max-w-2xl` y otras a todo lo ancho,
así que saltar de Empresa a Sedes cambiaba el tamaño de la columna y parecía otra pantalla. Hoy
es un `max-w-3xl` en `SectionedLayout` y ninguna página declara el suyo: deja respirar las filas
de miembros y sedes sin estirar los formularios más allá de lo que se lee cómodo.

`Sheet` se queda para lo que **no** cambia de eje: los laterales de navegación y la hoja inferior
de acciones.

**Y el diálogo centrado, ¿cuándo?** Cuando no hay nada detrás que mirar. El cajón existe porque
se abre **sobre una lista**: una ficha que se comparte por URL, unos filtros que se aplican a lo
que sigue ahí al fondo. En Configuración no hay lista: son tres campos y un botón. Ahí va
`FormDialog` (`components/ui/form-dialog.tsx`), centrado en las dos orientaciones, con el pie
siempre Cancelar + acción. **Lo usa toda Configuración**: sedes, miembros, asistente y los cuatro
catálogos. Antes cada pantalla repetía su propio `Dialog` + `<form className="space-y-4">` +
`DialogFooter` con etiquetas distintas y un `Loader` que a veces estaba y a veces no.

Los catálogos tardaron en llegar y enseñan algo: **crear el componente compartido no termina el
trabajo**. `FormDialog` nació para borrar esa copia y solo se adoptó en tres de siete sitios, así
que durante un tiempo el repositorio tuvo a la vez la pieza y el duplicado que venía a sustituir —
que es peor que no tenerla, porque el siguiente copia del vecino que encuentre. Al extraer algo, se
migran **todos** los llamadores en el mismo commit, o se anota cuáles faltan.

En una palabra: **cuelga de una lista → cajón; es un formulario corto de ajustes → diálogo
centrado.**

**Y un diálogo nunca es más alto que la pantalla.** Está centrado con `translate`, así que cuando
su contenido crecía se salía **por arriba y por abajo a la vez** y no había forma de llegar al pie:
en un teléfono, el formulario de un catálogo dejaba «Guardar» fuera y el registro no se podía
guardar. El alto máximo y el desplazamiento son de `DialogContent` —`max-h-[calc(100dvh-2rem)]` y
`overflow-y-auto`—, no de cada pantalla: uno a uno, el siguiente diálogo largo volvería a nacer
roto. Lo que se ocupa de su propio desplazamiento —la paleta de comandos, el selector de iconos—
manda `overflow-y-hidden`, que es del mismo grupo de utilidades y por eso gana.

**Y el velo de detrás es uno solo**, `--scrim` (`bg-scrim`), para los tres —cajón, diálogo y hoja—.
Cada primitiva traía el suyo (`bg-black/50` en dos, `bg-slate-950/45` con desenfoque en la otra),
así que el fondo cambiaba según qué lo hubiera abierto; y un `slate` crudo en un componente es lo
que §2 prohíbe. Y «Configuración» aquí es literal, no un parecido: crear una cuenta por cobrar o un
gasto son cinco campos igual de cortos, pero se abren desde la lista de cartera y **van al
cajón** — lo hacen desde `AccountFormDrawer` (§94), uno solo para las dos caras.

---

## 11.1.4. La guía (`/ayuda`)

Es documentación, y una documentación **no es un documento**: es una portada, temas cortos y un
buscador que enlaza.

Fue lo contrario durante un tiempo: **una sola página de 6.473 px** con nueve secciones y sesenta
definiciones, todas con el mismo peso visual —«¿Qué es Nummo?», tres líneas, se anunciaba igual
que el glosario entero—. Había índice, pero llevaba a un ancla dentro del muro, y desde ahí ya no
se sabía ni dónde estabas ni cuánto quedaba.

Hoy son tres capas:

| Capa | Ruta | Qué es |
| --- | --- | --- |
| Portada | `/ayuda` | Buscador arriba y los temas en tarjetas, agrupados |
| Tema | `/ayuda/:tema` | Una pantalla, con «anterior / siguiente» al pie |
| Navegación | — | `SectionedLayout`, el mismo de Configuración (§11.1.3) |

**Los temas van por tarea, no por tipo de contenido.** Antes los estados de cartera estaban en
«Estados», sus términos en «Glosario» y su flujo en «Cómo fluye el dinero»: tres sitios para una
sola cosa. Ahora *Cobrar* lleva su flujo, sus tipos de pago y sus términos juntos, y *Pagar* es su
espejo. Lo que se consulta y no se lee —estados, roles, glosario— se queda aparte, como
referencia, que es lo que es.

**Un término se escribe una vez.** El glosario está agrupado por `slug` de tema, así que el mismo
dato alimenta el apartado «Términos que verás aquí» de cada tema y la tabla completa del glosario.
Dos listas paralelas se habrían separado a la primera corrección.

**El orden vive en `TOPICS` y de ahí salen cuatro cosas**: la navegación lateral, las tarjetas de
la portada, los enlaces anterior/siguiente y el destino de las búsquedas. Mover un tema lo mueve
en los cuatro sitios; añadir uno lo hace aparecer sin tocar nada más.

**El buscador busca dos veces.** Primero en la guía (`searchGuide`: temas y glosario, sin tildes),
que devuelve **enlaces** —encontrar y llegar—; después en la base de conocimiento del asistente,
que devuelve fragmentos. Antes solo estaba la segunda, y sus resultados eran texto muerto: leías
lo que respondía tu pregunta y no había forma de ir a la página que lo explica entero.

Para escribir dentro de un tema hay piezas propias en `features/help/help-ui.tsx` —`P` (ancho de
lectura de 68 caracteres), `Block` con su ancla `#`, `Flow` para los recorridos, `DefList`,
`StateList`, `GoTo`— y los apartes van en `Note` (§94), que no sabe nada de la guía y sirve en
cualquier pantalla.

## 11.1.5. Los avisos (`toast`)

Un aviso es **un aparte que llega solo**: lo mismo que un `Note` dentro de un texto, pero
disparado por una acción. Así que se lee como familia y no como un invento aparte —superficie de
tarjeta, **filo de color a la izquierda**, icono del tono— y todo sale de `Toaster`
(`components/ui/sonner.tsx`), que se monta una vez en `providers.tsx`.

Venía con `richColors`, la paleta propia de Sonner en hexadecimal. Se veía bien y se veía **de
otra aplicación**: un rojo que no era el de «Vencida», un verde que no era el de «Pagado». Ahora
los colores son tokens y claro/oscuro salen sin configurar nada.

**Dónde sale es la mitad del problema.** En escritorio va arriba a la derecha: el centro lo ocupa
la barra de comandos (§36) y un aviso encima la tapaba justo al usarla. Por debajo de `lg` no hay
barra de comandos y el ancho manda, así que arriba y centrado, bajo la cabecera —de ahí los dos
`offset`, 76 y 64, que son la altura de cada cabecera—.

Dos detalles que cuestan una tarde si se descubren desde cero:

- **El filo va en un `::before`, no en `border-l`.** El CSS de Sonner se inyecta después de la
  hoja de la app y pinta `border` con la misma especificidad: una utilidad de borde pierde
  siempre. El pseudo-elemento no se lo disputa nadie.
- **Las variables de Sonner van por `style`, no por clase** (`--normal-bg`, `--normal-text`,
  `--border-radius`, `--toast-close-button-*`). Su CSS pinta la superficie con ellas; una clase
  pelearía con esa regla en vez de sustituirla.

Cuatro segundos y botón de cerrar: lo que dura un «Pago registrado» sin estorbar, y con salida a
mano para el error que haya que leer dos veces. El **fondo no cambia con el tono** —solo el filo y
el icono—, para que el texto se lea igual de bien en los cuatro (§7: nunca fiarlo todo al color).

**Qué se escribe dentro:** el título es el hecho en tres palabras («Sede creada», «Rol
actualizado»); el error sale de `getErrorMessage(err, '…')` (§88), nunca del `statusText`.

**Dos ajustes que no se ven hasta que fallan.** El ancho es 400 px en escritorio, porque los 356
de Sonner dejan al texto un palmo cuando el aviso lleva un botón —y en móvil **no se toca**, que
ahí el aviso ocupa la pantalla y un valor fijo se desborda—. Y el hueco superior hay que decirlo
dos veces: por debajo de 600 px Sonner ignora `offset` y usa `mobileOffset`.

## 11.1.6. El aviso de versión nueva

Es el único aviso que rompe las reglas de §11.1.5, y las rompe por lo mismo: **no lo dispara una
acción del usuario, así que no puede desaparecer como si la hubiera**.

- **No caduca.** Cuatro segundos aquí son una versión nueva que pasa de largo mientras miras otra
  pestaña.
- **Vuelve.** Cerrarlo aplaza el aviso, no la actualización: reaparece al volver a la pestaña. Por
  eso tampoco lleva un «Después» al lado de «Actualizar» —dos botones dejan al texto sin sitio, y
  la X ya significa «ahora no»—.
- **`id` fijo** (`app-update`), así nunca se apila consigo mismo.

Lo demás es el mismo aviso de siempre: filo `brand`, icono de descarga, superficie de tarjeta.

## 11.1.7. El encabezado de una página

`PageHeader` es título, descripción y acciones a la derecha, y **las acciones no bajan nunca**.

Llegó a tener `flex-wrap` para que dos selectores de fecha no aplastaran el título en una pantalla
de 390, y el remedio fue peor: en cuanto la descripción era larga, el botón «+» aterrizaba en su
propia línea, **a la izquierda**, debajo del texto, y empujaba la página entera un renglón hacia
abajo. Un botón que cambia de sitio y de lado según lo que diga la descripción no es un botón: es
una sorpresa.

La regla es al revés — **el que cede es el texto**: el bloque de título lleva `min-w-0 flex-1`, así
que la descripción sigue en el renglón de abajo tantas veces como haga falta y las acciones se
quedan donde estaban. En móvil las acciones se reducen a su icono (`<span className="hidden
sm:inline">`), que es lo que hace que quepan.

**Lo que no cabe, no entra.** Un control ancho —el rango de fechas de Resultados, casi 300 px— no
va en la cabecera: va en su propia fila justo debajo, que es donde vive la barra de controles de
cualquier listado.

---

## 11.1.8. El centro de notificaciones

La campana de la cabecera con su contador, y detrás el `Drawer` de siempre con lo que ha llegado
(`features/notifications/`). Está en las **dos** cabeceras —escritorio y móvil—: es lo que hay que
ver sin buscarlo.

**El panel se monta una sola vez, en el shell.** Las dos cabeceras están las dos en el DOM y solo
las separa un `lg:`, así que montar el cajón dentro de `NotificationBell` dejaría dos paneles
vivos con estados propios, y cambiar el ancho de la ventana enseñaría el que no era. La campana es
**solo el botón**; quién lo abre es del shell, igual que con la barra de comandos.

**Cajón y no pantalla propia.** El centro se abre **encima** de lo que estabas mirando y casi todo
lo que hay dentro lleva a otro sitio: una ruta propia obligaría a volver de ella para llegar a la
ficha que el aviso anuncia. Por lo mismo sus filtros van en `useState` y no en la URL (§21.1):
nadie comparte por enlace «mira mis notificaciones sin leer», y la URL que sí se comparte es la de
la pantalla de detrás.

**El globo va en `brand`, no en rojo.** El rojo de §7 significa vencido o fallido, y «tienes tres
avisos» no es ninguna de las dos cosas — el aviso rojo permanente es el que se aprende a ignorar
(§45.6). Es el mismo criterio que el punto de Numi (§32.3). Por encima de 99 el globo dice `99+`,
pero **el rótulo dice la cifra exacta**: lo que se recorta es el dibujo, no el dato.

**El icono lo pone la clave semántica, no el tipo.** El backend firma un `icon`
(`receivable-overdue`, `payment-in`, `auto-charge-failed`…) precisamente para que la iconografía
sea nuestra: `labels.ts` lo traduce a un glifo de `lucide-react` (§37) y a uno de los cuatro tonos
de §7. Una clave que ese mapa no conozca cae en la campana genérica en vez de dejar la fila coja
— el contrato tipa `icon` como cadena libre, así que va a pasar. **Sin la pastilla tintada
detrás**: el icono va al tamaño del texto y el color lo lleva él (§11.1).

**Abrir es leer**, y el destino es el `deepLink` que trae el aviso. Se comprueba antes de navegar
—solo rutas internas, que `//otro.sitio` es una URL absoluta disfrazada de ruta (§87.5)— aunque
hoy lo componga el backend desde un catálogo cerrado: es un valor que llega por la red.

**Las tres escrituras van juntas detrás de `notifications.manage`**: marcar una, marcar todas y
descartar. Quien solo tiene `notifications.read` sigue teniendo un centro útil —lee y navega—, y
lo que desaparece son los botones, no la lista. Descartar **no borra el hecho**: quita el aviso de
la bandeja, que es lo que §24 pide distinguir.

**No hay sondeo.** Quien avisa de que hay algo nuevo es el stream (§11.1.9), y el contador se
vuelve a pedir cuando llega la señal. Un `refetchInterval` por encima sería pagar dos veces por la
misma noticia.

## 11.1.9. Una sola conexión en vivo

`lib/realtime-stream.ts` mantiene **un** `EventSource` contra `/organizations/:orgId/events` para
toda la aplicación, con cuenta de suscriptores: se abre con el primero y se cierra con el último.
Lo comparten hoy el chat de Numi (§32.3) y el centro de notificaciones; una pestaña con una
conexión por función acabaría con cuatro diciendo lo mismo.

**Lo que viaja son avisos, nunca datos.** Una trama dice que algo se movió —`{ notificationId }`,
`{ conversationId }`, `{ resource }`— y quien la recibe **lo pide por su endpoint de siempre**.
Esa asimetría es lo que sostiene el diseño: la puesta al día es la misma llamada tanto si llegó un
aviso como si acabamos de reconectar, así que hay un solo camino por el que entran los datos y el
flujo no tiene que garantizar orden ni entrega. Un aviso emitido mientras el móvil estaba sin
cobertura se pierde y da igual.

Por eso el centro **invalida y no inserta**: con el id en la mano sería tentador pedir ese aviso
suelto y meterlo en la caché, y eso son dos caminos de entrada que se desincronizan a la primera
página que ya estuviera cargada con otro filtro.

### Qué se refresca con un `resource`

`app/resource-stream.ts` traduce los cinco recursos —cartera, pagos, cuentas por pagar, egresos y
caja— a los endpoints que dejan viejos, **por el trozo de URL que los nombra**. Funciona porque
Orval construye sus claves como `[url, params?]`: la URL **es** la clave, así que un prefijo se
lleva la lista entera con todos sus filtros y páginas, y también su ficha.

**Cada recurso invalida solo lo suyo.** Registrar un pago mueve además el saldo de la cuenta por
cobrar y el de la caja, pero eso no se deduce aquí: el servidor emite las tres tramas porque es él
quien sabe qué tocó. Adivinarlo en el cliente sería una segunda tabla de reglas, y se separaría de
la suya a la primera operación nueva.

**Los informes caen con cualquiera de los cinco**, sin tabla de qué informe mira qué. Esa
dependencia no está en el contrato, así que una lista nuestra sería justo lo que nadie se acuerda de
tocar. Refrescar de más no cuesta casi nada: `invalidateQueries` solo vuelve a pedir lo que está
montado, así que fuera del Panel y de los informes no dispara ni una petición.

Y **un recurso que no conozcamos no invalida nada**, en vez de barrerlo todo por si acaso: si el
backend estrena uno, lo que se nota es que esa lista no se refresca sola — no que la aplicación se
pase el día pidiendo.

El servidor ya filtra por permiso antes de emitir —quien no puede leer egresos no recibe esa
trama—, así que aquí no se vuelve a comprobar.

No se reintenta a mano al fallar: `EventSource` reconecta solo, con su propia espera. El latido de
25 s del servidor es un comentario SSE, no un evento: no hay nada que hacer con él.

## 11.1.10. Las preferencias de avisos

`/config/notificaciones` es la pantalla **de la persona**: de qué te avisamos y por dónde. La
política común —a qué hora salen los recordatorios, desde qué saldo se avisa— es otra cosa, con
otro permiso, y no comparte pantalla con esta.

**Se dibuja desde el contrato, entera.** Qué tipos existen, qué canales admite cada uno y cuáles
están encendidos en este despliegue vienen en la respuesta (`preferences[]`, `supportedChannels`,
`availableChannels`). Una lista nuestra en paralelo se desincronizaría con el primer tipo nuevo del
backend — y ese sería justo el que nadie podría apagar.

**El rótulo del interruptor es el titular del aviso**, palabra por palabra: «Tienes un cobro
vencido», no «Vencimientos de cartera». Quien acaba de recibir la notificación y viene a apagarla
busca esa frase; una paráfrasis nuestra le obliga a deducir cuál de las veintiuna era. Es la única
tabla de la feature que se escribe a mano, y va sobre el enum del contrato para que un tipo nuevo
rompa `tsc` en vez de aparecer como `receivable.due_soon`.

**«En la app» no es una casilla.** El centro es el registro, no un canal: el motor descarta `INAPP`
al decidir por dónde interrumpir, así que una casilla que no apaga nada sería una mentira en la
pantalla. Lo que se marca es **por dónde te interrumpe** —hoy solo el móvil—, y el texto lo dice:
«todo lo que dejes encendido queda en tu centro de notificaciones».

**Una columna por canal, no una casilla suelta por fila.** Veintiún avisos con su rótulo repetido
(«Avisarme también en el móvil») son veintiuna veces la misma frase; una rejilla con la cabecera
arriba se lee de un vistazo y crece bien: el día que exista remitente de correo, la columna aparece
sola porque sale de `availableChannels`. Un tipo que no admite ese canal deja un «—», no una
casilla muerta.

**Guardar es explícito, y manda solo lo que cambió.** El diff se calcula **al enviar**, comparando
el borrador con lo que firmó el servidor, y no marcando sucia cada casilla que se toca: apagar algo
y volver a encenderlo deja de contar como cambio, que es lo que cualquiera espera. Los dos
endpoints —las preferencias y el detalle en la pantalla de bloqueo— viven detrás del mismo botón:
que sean dos es del contrato, no algo que el usuario tenga que entender.

**Y la pantalla se queda tras guardar**, así que se vuelve a marcar limpia a mano con **la
respuesta del servidor** y no con el borrador (§45.7): si el backend normaliza algo, con el
borrador el botón se quedaría encendido para siempre.

**Los días de antelación se leen, no se editan.** «Te avisamos 5 y 1 días antes». El contrato
devuelve los que quedan tras restar la elección de la persona a los de la organización, pero **no
publica los que hay**, así que un selector podría apagar días y no volver a encenderlos (§95.17).
Un control que solo va en una dirección es peor que una frase.

Sin `notifications.manage` la pantalla se mira y no se toca —sin pie de acciones, con un `Note` que
lo dice—; sin `notifications.read` no se pide nada y sale el candado (§45.2c).

### Y la política de la organización, aparte

`/config/avisos` es la otra mitad, y **no comparte pantalla con la anterior**: a qué hora salen los
recordatorios, desde qué saldo se avisa de una cuenta y desde qué monto interrumpe lo que registró
un compañero. Apagar los avisos de una empresa entera es una decisión, no un ajuste personal, y por
eso tiene su propio permiso (`notifications.settings.manage`) — que ni un administrador tiene por
defecto en otra organización.

Va en **Configuración › Organización**, no en Preferencias, por lo mismo que la aprobación de
egresos vive en Gastos y no en Empresa (§47.4): es una política, tiene endpoint propio y se audita
aparte.

**Se lee con `notifications.read` y se enseña a cualquiera**; lo que desaparece sin el permiso de
escritura es el botón. Esconder la pantalla entera diría lo contrario de lo que hace el backend,
que solo bloquea guardar (§47.3).

**Un umbral vacío apaga esa alerta, y es el valor por defecto.** No es «umbral cero»: con cero,
cualquier peso que registrara un compañero interrumpiría a media oficina, y lo primero que haría
cualquiera es apagar la categoría entera. Es el mismo criterio que el umbral de aprobación (§47.4).

Y las dos pantallas **se enlazan**: la política manda a las preferencias de cada persona, y las
preferencias explican de dónde salen los días y los umbrales que solo enseñan. Sin ese enlace, «Te
avisamos 5 y 1 días antes» deja una pregunta sin contestar en la pantalla equivocada.

Un detalle del contrato que se ve en la pantalla: **`lowBalanceCurrency` es de solo lectura** y
llega con `COP` por defecto, así que el umbral se compara con las cuentas de esa moneda y no
necesariamente con las de la organización. La pantalla lo dice en vez de suponerlo (§70).

## 11.1.11. Los avisos con la app cerrada (Web Push)

Un aviso que llega al teléfono con Nummo cerrada. Vive **fuera de la organización** —un teléfono es
de una persona, no de una empresa— y por eso sus endpoints cuelgan de `/me`.

**Las dos escuchas del service worker van en `public/push-sw.js`**, que entra por
`workbox.importScripts` (`vite.config.ts`). La alternativa era pasar la app a `injectManifest`, y
eso significa hacerse cargo del precache entero —el shell, el fallback de navegación, la regla
`NetworkOnly` del API— para añadir dos escuchas. El archivo entra en el manifiesto con su revisión,
así que al cambiarlo cambia `sw.js` y el navegador se entera (§40.1).

**Sin clave pública no se pide el permiso.** `GET /me/push-subscriptions/public-key` devuelve `null`
cuando el despliegue no tiene push configurado, y eso hay que mirarlo **antes** de tocar nada: un
permiso de notificaciones denegado **no se vuelve a preguntar**, así que gastarlo donde no se puede
enviar nada deja a esa persona sin push para siempre. Es la única regla de esta sección que no
admite matices.

Por lo mismo, los otros dos callejones se explican en vez de ofrecer un botón que no puede
funcionar: **el navegador sin soporte** —en iPhone hace falta la PWA instalada en la pantalla de
inicio, así que ahí se ofrece instalarla— y **el permiso ya denegado**, que solo se arregla desde
los ajustes del sitio.

**El botón vive en la pantalla de preferencias, no en «Aplicación».** Es estado del aparato, sí,
pero quien marca la columna «Móvil» de un aviso y no lo ha activado no recibe nada y no tiene forma
de saberlo. El interruptor y su condición se miran juntos. Va en **su propia tarjeta y fuera del
formulario**: activar abre el diálogo de permisos del navegador, así que es una acción con su botón
y no una casilla que se guarda al final.

**Cuál de los dispositivos de la lista es este** no lo dice el servidor: `PushSubscription` firma
`id`, `deviceLabel` y `lastUsedAt`, pero no el `endpoint` con el que cruzarlo. Se guarda en el
navegador el `id` que devolvió el alta **junto a su `endpoint`**, para tirarlo cuando el push
service rote la suscripción. Sin esa nota —otro navegador, almacenamiento limpio— la fila sigue
ahí hasta el siguiente envío, que es cuando el backend la borra al recibir un 410. Pedido al
contrato en §95.18; el día que llegue, esa nota local sobra.

**El `deviceLabel` lo pone el cliente** («Chrome · Android»), con una heurística sobre el
`user-agent`. Es una etiqueta y no una decisión: nada depende de acertar, y lo único que no puede
pasar es que tres aparatos se llamen igual.

**Lo que el sistema operativo enseña no se diseña**: se controlan el texto, el icono, el `tag` y a
dónde lleva. `tag` reemplaza en pantalla —tres avisos del mismo cobro no se apilan—; la prioridad
decide si vibra, y solo `CRITICAL` se queda hasta que alguien lo mire. Y al pulsarlo se enfoca la
pestaña abierta y **se navega**, aunque eso recargue: mandarle un mensaje para que navegue con su
router dependería de que esa pestaña tenga una versión de la app que sepa escucharlo, y una que no
lo sepa se queda enfocada sin ir a ninguna parte.

## 11.1.12. El icono y el color de un catálogo

Un concepto de cobro y una categoría de gasto llevan **icono, color y orden propios**. Los tres
salen del contrato: 161 claves de icono —nombres de `lucide-react`—, 22 tokens de color —la paleta
de Tailwind entera— y un `position` que es el orden por defecto de las dos listas.

**El backend manda una clave, no un dibujo ni un hex**, y esa es toda la gracia: la iconografía
sigue siendo nuestra (§37) y el día que cambie, cambia en `features/masters/catalogs.ts` y en
ningún otro sitio. La tabla va tipada contra el enum generado, así que una clave nueva rompe `tsc`
en vez de dejar filas sin icono.

**Los colores de la paleta son la segunda excepción viva a §91, y va acotada.** Un color crudo en
un componente está prohibido porque es una decisión de diseño escrita a mano; este no lo es: es un
**dato que elige el usuario**, publicado como enum cerrado. No hay token semántico que valga —«la
categoría Netflix es roja» no significa error— y meter dieciocho pares en `index.css` sería declarar
como sistema lo que es contenido. Cada uno lleva su variante oscura, porque el color es justo lo que
aquí hay que distinguir de un vistazo.

**El icono va pegado al nombre en la tabla, y solo ahí.** §11.1.3b lo reserva a la tarjeta de móvil
porque en una rejilla densa es ruido y «la columna ya dice de qué categoría es» — pero aquí la fila
**es** la categoría: el icono no repite un dato, es la identidad de lo que se está editando. En la
tarjeta lo lleva `RowIconBadge`, que gana una prop `className` para poder pintar el color del
contrato en vez de uno de los cinco tonos semánticos, que ahí no significarían nada. Por eso el de
la celda es `hidden lg:block` (§11.1.3b, regla 2): sin eso el mismo icono salía dos veces en la
misma línea de la tarjeta, uno en la pastilla y otro pegado al nombre.

### Elegirlos

Los ciento ochenta y tres —veintidós colores y ciento sesenta y un iconos— **vivían abiertos dentro del
formulario**, y ocupaban más que los campos que de verdad hay que rellenar: en un teléfono
empujaban «Guardar» fuera de la pantalla (§11.1.3). Hoy el formulario enseña **una fila** —lo
elegido, cómo se llama y un chevron— y todo lo demás vive en `IconColorPicker`, su propio diálogo.

Dos cosas que ese diálogo hace y la rejilla suelta no podía:

- **Un tema a la vez, elegido.** Los once puestos uno detrás de otro convertían el diálogo en un
  rollo de papel: para ver el último había que pasar ciento sesenta y un dibujos. Hoy se elige el
  tema en un `select` —nativo, una línea, sin tira que se desplace en horizontal (§21.1)— y se ven
  los suyos. **Al abrir se posa en el tema del icono que ya está puesto**, que es donde quien viene
  a cambiarlo espera aterrizar.
- **Aplicar al tocar.** Es un selector, no un formulario: el cambio se ve arriba al instante y
  «Listo» solo cierra. Quien decide si se guarda es el formulario de fuera.

**Hubo un buscador y se quitó**, y vale la pena dejar escrito por qué: con once temas de veinte
dibujos cada uno, elegir el tema ya deja a la vista lo que se busca, y el campo de texto encima de
la rejilla competía con él —dos maneras de llegar al mismo sitio en un diálogo de tres cosas—. Se
fue con él la tabla de sinónimos del negocio; está en el historial si algún día el catálogo crece
hasta que haga falta.

Los grupos van sobre las **mismas claves** del contrato —cuyo orden ya es temático—, no sobre una
lista aparte, y una prueba obliga a que cada clave esté en uno y en uno solo: el día que el backend
añada una, no puede quedarse fuera del selector en silencio.

**Y la rejilla no se sale.** Sus celdas son cuadradas y del **ancho de su columna**
(`aspect-square w-full`), no de un tamaño fijo. Con el objetivo táctil de §43 puesto como medida
—`size-11` en puntero grueso— cada celda pasaba a medir más que la columna que la sostenía, así que
en el teléfono la rejilla desbordaba el diálogo y aparecía un desplazamiento horizontal encima del
vertical. Un tamaño fijo dentro de una rejilla que reparte el ancho son dos verdades sobre lo mismo:
manda la columna, y el objetivo táctil se consigue con el mínimo del `minmax`.

**«Sin poner» es una opción visible**, tanto en icono como en color. Las organizaciones que ya
existían tienen los dos en `null` y hace falta poder volver ahí; el hueco de no elegir no es lo
mismo que elegir nada.

### Reordenar

`position` no tiene columna —como «Creación»— y se ofrece solo en el cajón de filtros (§18.1,
regla 9). Cambiarlo es otra cosa: un **cajón propio** con la lista entera y dos flechas por fila.

Tres decisiones, y las tres se explican solas al intentar la alternativa:

- **En un cajón y no en la propia lista**, porque la lista pagina de diez en diez: con flechas por
  fila, el primero de la página dos no tendría a dónde subir. Aquí se piden los cien de una vez.
- **Flechas y no arrastrar.** Arrastrar pide una dependencia (§63) y deja fuera al teclado (§46);
  dos botones no hacen ninguna de las dos cosas.
- **Se guarda al final y solo lo que se movió.** El contrato no tiene reordenamiento masivo —es un
  `PATCH` por elemento—, así que mandar los treinta por mover uno serían veintinueve escrituras que
  no cambian nada.

**Y el orden se respeta donde importa**, que son los selectores: las trece consultas que alimentan
un desplegable de conceptos o de categorías piden `sort=position`. Un orden propio que solo se ve
en su propia pantalla no sirve para nada.

## 11.1.13. El auto-registro de un recurrente

Un acuerdo de cobro y un gasto recurrente pueden **registrarse solos** el día que vencen. Es el
mismo concepto en los dos sentidos, con el mismo esquema, así que es **un componente**
(`AutoChargeSection`) y no dos: lo que cambia son una docena de palabras y a qué endpoint escribe
(§94.0).

**Es un interruptor con su propia confirmación, no un campo del formulario.** Encenderlo le da a un
trabajo automático la autoridad de mover dinero todos los meses, y eso no puede ser el efecto
colateral de corregir un importe. Por eso el contrato le da endpoint propio, `autoCharge` llega
**embebido y de solo lectura** en el recurrente, y aquí tiene su propio diálogo (§54).

**«Encendido sin cuenta de dónde sacar» no se puede expresar.** El contrato lo hace imposible —es
una unión discriminada, no tres campos opcionales— y la pantalla dice lo mismo: la cuenta y el
método se eligen en el mismo acto de encenderlo, y sin los dos no sale nada hacia el API.

**Lo que hay que saber va en el diálogo, antes de aceptar**, y es distinto en cada cara:

| Cara | Lo que nadie adivina |
| --- | --- |
| Cobrar | Marcar un cobro como pagado **apaga su mora, su interés y sus recordatorios**. Si el pago no llega de verdad, la cuenta queda saldada y nadie vuelve a perseguirla |
| Pagar | Por encima del umbral de aprobación **no paga**: deja una solicitud esperando firma, sin mover dinero (§47.4) |

**El permiso no es el del recurrente.** Encender el automático pide el de **registrar el movimiento
que va a registrar solo** —`payments.create` de un lado, `disbursements.create` del otro—, no
`agreements.manage`. Llega como prop, porque un componente compartido no decide autorización
(§87.2).

Y cuando uno falla, el backend emite un aviso de prioridad alta (§11.1.8). La ficha enlaza a las
preferencias, que es donde se elige por dónde enterarse: un automático que falla en silencio es
peor que no tenerlo.

## 11.1.14. Nombrar a quien todavía no está en la agenda

Al firmar un acuerdo de cobro o un gasto recurrente ya no hace falta crear antes el contacto: el
contrato acepta `payerContactId` **o** `payerName` —y su espejo `supplierContactId` /
`supplierName`—, **exactamente uno de los dos**.

**Esa regla la impone el formulario, y no es opcional.** En el backend es un refine de Zod que no
baja al JSON Schema, así que el cliente generado tipa los dos como opcionales y `tsc` no protege
nada: mandar los dos, o ninguno, es un 422. Lo sujetan un `refine` en el esquema de la pantalla y
el propio selector, que nunca deja los dos puestos a la vez.

**El selector es el de siempre**, con una fila más al final: «Crear "Netflix"». Va **al final y no
al principio** porque la primera respuesta a un nombre tiene que ser el contacto que ya está en la
agenda; y no aparece cuando lo escrito coincide exactamente con uno de los resultados, que es
justo cuando ofrecer crearlo sería ofrecer un duplicado.

**Quién limpia a quién, que es donde estuvo el fallo:** elegir un contacto borra el nombre escrito,
y escribir un nombre borra el contacto elegido — cada uno lo hace **quien recibe el valor**, en el
formulario. Hacer las dos cosas desde el selector borraba lo que se acababa de poner, porque el
formulario ya limpia el nombre al recibir un id.

**Solo al crear.** El `PATCH` no acepta el nombre, así que al editar el selector es el de toda la
vida: ofrecerlo ahí sería un camino que termina en error.

Y **solo empresas**: con nombre se crea un contacto `COMPANY` de verdad, que gasta cupo de
`max_contacts` y puede responder `409 LIMIT_EXCEEDED` —lo cuenta `toastApiError` con sus cifras
(§45.5)—. Para una persona sigue haciendo falta el formulario completo, que es donde importan su
documento y su teléfono; la pantalla lo dice en una línea en vez de dejar que se descubra al
guardar.

## 11.1.16. La cobranza por WhatsApp

Nummo le escribe **al deudor** cuando su cuenta está por vencer o ya está en mora. Y ahí
está la diferencia con todo lo anterior de esta sección: **el destinatario no tiene cuenta
en Nummo.** Es un contacto con un teléfono.

Eso explica casi todo el diseño. No hay preferencias de usuario ni centro de
notificaciones; hay una dirección, un consentimiento y una cola. El centro de §11.1.8
avisa a **un miembro del equipo**; esto le escribe **al que debe**, y son dos features que
solo comparten la palabra «aviso».

| Dónde | Qué | Permiso |
| --- | --- | --- |
| `/config/cobranza` | La política: si se escribe, a qué horas y con qué **tres** plantillas | `messaging.read` · `messaging.settings.manage` |
| `/config/plantillas` | Las plantillas y su estado en Meta | `whatsapp.templates.read` |
| `/config/whatsapp` | Desde qué número sale: la cuenta de Meta del negocio | `whatsapp.settings.read` · `whatsapp.settings.manage` |
| `/cartera/cobranza` | Lo enviado, a quién no se le escribe y el cupo, en dos pestañas | `messaging.read` |
| Ficha de un acuerdo | El tri-estado de *ese* cobro | `agreements.manage` |

**La política va en Configuración y el historial en el sidebar**, por lo mismo que separan
§11.1.10 y §47.4: una política se toca una vez, y el historial es trabajo diario —es a
donde se entra cuando alguien pregunta por qué no le llegó el mensaje—.

### Las horas de silencio aplazan, no cancelan

Un aviso que cae a las 23:00 **sale a la mañana siguiente**. No se pierde, así que la
pantalla no puede decir «no se enviará».

Y **la ventana normalmente cruza la medianoche**: `22:00 → 07:00` es el caso corriente, no
el raro. Cualquier cálculo que asuma `inicio < fin` da negativo justo en la configuración
que va a tener casi todo el mundo, así que la aritmética vive en `quiet-hours.ts` con sus
pruebas —el módulo `(fin − inicio + 1440) % 1440` es lo que hace que cruzar el día deje de
ser un caso aparte— y la pantalla enseña la franja en una frase: dos campos de hora
sueltos no cuentan que el silencio pasa por la madrugada.

**Sin plantilla no hay aviso**, y es una regla del backend y no un campo vacío: con
`overdueTemplateKey` en `null` los vencidos no se avisan aunque la política esté encendida.
Un `<select>` vacío se lee como «todavía no lo he elegido», así que el hueco se nombra con
palabras debajo del control.

### Un solo aviso de mora por deudor, y dos plantillas para decirlo

Un cliente con tres facturas vencidas recibe **un mensaje**, no tres el mismo día. Baja el
coste —cada plantilla que sale se paga— y sobre todo la presión sobre la calificación del
número, que con la cuenta de plataforma es compartida entre todos los clientes.

Eso obliga a **dos plantillas de mora**, y la pantalla tiene que explicar por qué:
`overdueTemplateKey` sale cuando el deudor debe una sola factura y
`overdueSummaryTemplateKey` cuando debe varias. Están separadas porque **Meta no
pluraliza**, y con una sola saldría «tienes 1 facturas vencidas».

**Dejar vacía la de resumen es válido, y por eso su hueco no va en ámbar.** Sin ella el
aviso sale igual, con el total pero sin decir cuántas facturas son: se cae a la singular.
Los otros dos huecos sí apagan su aviso, y esa diferencia es justo la que el color tiene
que contar (§7) — degradar no es fallar.

### El historial es mixto, y el enlace se decide por fila

`entityType` viene `'receivable'` **o** `'contact'`, a propósito: el aviso agrupado no habla
de una factura, así que apunta al deudor; los de «por vencer» y los anteriores a la
agrupación siguen apuntando a la cuenta. **La historia no se reescribe**, así que las dos
formas conviven para siempre.

Mandarlo todo a cartera serviría un 404 en cuanto el id fuera de un contacto, así que
`relatedEntity` ramifica — y **el rótulo cambia con el destino**: «Ver la cuenta» sobre un
enlace a un contacto sería una promesa que el destino no cumple. Lo que no reconoce no
enlaza a ninguna parte, como `notificationRoute` (§95.16).

### `SKIPPED` no es un error, y no va en rojo

Los estados **no son una barra de progreso**. Son dos caminos:

```
QUEUED → SENT → DELIVERED → READ     (salió bien)
QUEUED → SKIPPED                     (no se envió, a propósito)
QUEUED → FAILED                      (se intentó y falló)
```

`SKIPPED` es «no se envió, a propósito» y su `skipReason` **es la respuesta** a por qué no
llegó: se traduce a lenguaje humano en `labels.ts`. Pintarlo de rojo pondría a buscar una
avería que no existe y gastaría el rojo de §7, que aquí solo le toca a `FAILED`. La tabla
va sobre `string` y no sobre un enum porque el contrato lo tipa así: un motivo nuevo se
enseña crudo, que es feo pero honesto.

De los ocho motivos, **`quota_exceeded` es el único con arreglo desde la pantalla** —es el
mismo tope que cuenta «Plan y consumo»—, así que esa fila ofrece el plan (§45.5).

**Y quedarse en «Enviado» es un final normal.** `deliveredAt` y `readAt` solo se llenan si
el webhook de Meta está dado de alta; sin él todo se queda en `SENT` y eso es correcto. Por
eso se enseña **la última marca que ocurrió de verdad** —«Entregado el 14 ago»— y no las
cuatro fechas en fila, que con dos huecos se leerían como media entrega.

### `UNKNOWN` deja pasar la cobranza

A un cliente al que se le factura **no se le pide permiso para cobrarle**: Meta solo exige
consentimiento explícito para `MARKETING`, y estas plantillas son `UTILITY`. Así que
`UNKNOWN` no es un estado pendiente que haya que resolver, y presentarlo como advertencia
—ámbar, «sin confirmar», un botón de pedir permiso— sería mentir sobre lo que hace el
sistema y mandar a perseguir permisos que nadie necesita.

De ahí que la columna se llame **«Puede recibir»** y que `UNKNOWN` y `GRANTED` compartan
tono: lo que se enseña es **el efecto**, que es lo que se viene a comprobar. `REVOKED` es
el único que bloquea, y se comprueba **al encolar**, no al enviar.

### El tri-estado de un acuerdo

`collectionReminders` es `INHERIT | ON | OFF`, y es tri-estado por una razón concreta: con
un booleano no habría forma de distinguir «este cliente pidió silencio» de «nadie lo ha
decidido», y al cambiar la política de la empresa se arrastraría a quien había pedido que
no. En la UI es un control de tres opciones, no un switch.

**Y el default dice de qué está heredando** («Según la política de la organización: se le
escribe»). «Según la política» a secas obliga a irse a otra pantalla justo en la opción que
tiene casi todo el mundo.

### Desde qué número sale, que es otra pregunta

**Cobrar por WhatsApp y el número emisor son dos cosas distintas**, y confundirlas es el
error que `/config/whatsapp` existe para evitar:

| | Número de Nummo | Número propio (`whatsapp_byo`) |
| --- | --- | --- |
| Configurar | Nada | Conectar la cuenta de Meta |
| Quién paga | Consume `whatsapp_messages_monthly` del plan | El negocio, directo a Meta |
| Crear plantillas propias | No | Sí |

**No tener número propio no es un estado a medias ni un error**: es una de las dos formas
legítimas de tener esto funcionando, así que la pantalla lo cuenta como tal y no como una
carencia con un aviso rojo.

**El token nunca vuelve del backend** — solo `accessTokenLast4`. Se enseña enmascarado y el
formulario **no lo rellena ni al reemplazar**: un campo prerrellenado sería una mentira que
además se guardaría tal cual. Lo mismo con el `appSecret`, del que solo llega `hasAppSecret`.

**Desconectar no apaga la cobranza**: la devuelve al número de Nummo, y con ella vuelve a
gastar cupo. Va en la confirmación, porque es justo lo que nadie adivina.

Y **el número es único en todo Nummo** —es lo que identifica de quién es un webhook
entrante—, así que conectar uno que ya reclamó otra organización responde `409` y se cuenta
como lo que es, no como «algo salió mal».

### Crear plantillas propias, y por qué cuelga del número

`POST` y `DELETE` de plantillas **exigen cuenta propia de Meta**: en la compartida, una
organización podría agotarle a las demás el cupo de creación o dejar un nombre bloqueado
treinta días. Por eso los dos botones aparecen **solo con la cuenta conectada**, y sin ella
la pantalla dice por qué en vez de esconderlos sin explicación.

Del alta hay dos decisiones que conviene no deshacer:

- **Los ejemplos se derivan del texto.** Meta pide un valor de muestra por cada `{{marcador}}`
  para poder aprobar la plantilla, y `template-variables.ts` los saca del propio cuerpo: una
  lista escrita aparte discrepa del texto en cuanto alguien edita una palabra, y aquí una
  discrepancia es una plantilla rechazada o un envío al que le falta un parámetro. Borrar una
  variable del texto retira su ejemplo, que es lo que Meta rechazaría.
- **Sin botones.** `WhatsAppButtonSpec` está en el contrato y es opcional; un recordatorio de
  cobro no los usa, y un repetidor anidado es una pantalla entera para algo que esta función
  no necesita. Se añade el día que haga falta, no por completar el esquema.

### El cupo, y cuándo significa algo

`whatsapp_messages_monthly` sale de `me/capabilities` como los demás topes, y `QuotaStrip` lo
pinta en la pantalla de cobranza. Tres cosas:

1. **Un tope en `null` es «sin límite», nunca cero** (§45.6).
2. **Con número propio conectado el consumo deja de subir.** Una barra que no se mueve y no
   dice por qué parece un contador roto, así que ahí se sustituye por la frase.
3. **`period` es el mes de la organización**, en su zona horaria, no la del navegador.

Agotado **no se pinta en rojo** y no ofrece reintentar: **no hay recargas de cupo**, así que
lo único cierto es que no vuelve a salir hasta el próximo periodo. Las dos salidas reales son
subir de plan o conectar número propio, y las dice las dos.

### Los dos avisos del cupo van en `ACCOUNT`

`whatsapp_quota.warning` (al 80%) y `whatsapp_quota.exhausted` estrenan la categoría
`ACCOUNT` («Cuenta y plan»), y **no es una manía de clasificación**: bajo `RECEIVABLES`, quien
silenciara los avisos de cobranza se perdería justo el que dice que la cobranza va a parar.

La pantalla de preferencias no hizo falta tocarla — se dibuja desde el contrato y agrupa
sobre `NOTIFICATION_CATEGORIES` (§11.1.10), así que la sección apareció sola al añadir la
clave. Su `deepLink` es `/configuracion/plan`, que traduce el puente de §95.16.

### Lo que no se construye, a propósito

- **Nada de opt-out ni «responde STOP»**, ni en las plantillas ni en la UI. Es una decisión
  de producto: Nummo es el cobrador, y darle al deudor un botón para silenciar el cobro
  vaciaría la función. Meta solo lo exige en `MARKETING`.
- **Enviar un mensaje suelto a mano.** El permiso `messaging.send` existe en el catálogo y
  **ninguna ruta lo usa**: no hay endpoint. Se nombra en el editor de roles porque el
  backend lo publica, y nada más.
- **Una bandeja de respuestas.** El webhook recibe estados de entrega y bajas, no
  conversación. De ahí el aviso del formulario de plantillas: un mensaje que invite a
  contestar deja al cliente hablando solo.
- **Recargas de cupo.** Necesitan pasarela de pago, que no existe. No se ofrece un botón de
  comprar mensajes.

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

### Los criterios viajan a la ficha, y vuelven con ella

La ficha de un registro es una **ruta hija** de su lista y abre en cajón por encima, con **la
lista montada detrás** (§87.5). Eso es lo que hace que cerrar sea instantáneo y que no se pierda
el scroll — y también lo que hace que los filtros se caigan si se navega mal: los criterios se
derivan de la URL **en cada render**, así que abrir la ficha con solo su `pathname` deja a la
lista de detrás sin ninguno. Las fichas de estado saltan a «Todos», la lista vuelve a pedir la
página sin filtrar, y al cerrar aparece un listado que no es el que se estaba mirando.

**El rescate de `sessionStorage` no lo tapa, y está bien que no lo tape:** ocurre una vez por
montaje, y aquí no hay montaje nuevo — la lista nunca se fue. Hacer que un efecto reescribiera la
URL cada vez que se queda sin criterios lo arreglaría de refilón, pero a cambio la lista
parpadearía —un render sin filtrar, una petición de más y otro render— cada vez que se abre una
ficha. La causa no es que falte un rescate: es la navegación, que se dejaba los criterios por el
camino.

Así que se navega **con los criterios puestos, en las dos direcciones**, y lo resuelve
`useKeepFilters` (`lib/use-list-filters.ts`), que devuelve el mismo destino con el `search` que ya
lleva la URL:

| Movimiento | Quién lo pone |
| --- | --- |
| Lista → ficha, alta o edición | La lista: `navigate(keepFilters(…))` o `<Link to={keepFilters(…)}>` |
| Ficha → su lista | `DetailDrawer`, **una vez** para todas las fichas y formularios de la app |

**La excepción es la que da la regla:** `DetailDrawer` solo devuelve los criterios si `closeTo` es
**su propia lista** —de la que la ficha es ruta hija—. Registrar un egreso desde una cuenta por
pagar cierra hacia la cuenta, no hacia la lista de egresos, y ahí las mismas claves —`estado`,
`orden`, `pagina`— filtrarían una lista ajena. Un criterio solo vale dentro de la lista que lo
escribió.

De paso, la URL de una ficha compartida lleva el contexto en el que se abrió, que es lo que se
quiere: quien la reciba ve la misma lista debajo.

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
| Ordenar | Dentro del cajón, `FilterSortField` | Pulsando la cabecera de la columna (§18.1) |

Esa fila la dibuja `ListToolbar`, no cada pantalla: dónde va cada filtro según el ancho es una
decisión que debe tomarse **una vez**, no seis.

**El buscador se omite donde el endpoint no acepta un `q`.** Es la misma regla que la
cabecera que no ordena (§18.1, regla 3): una caja de búsqueda que no filtra nada es una
promesa que el listado no puede cumplir. Los tres props del buscador viajan juntos y son
opcionales; hoy los deja fuera el historial de cobranza, que se filtra por estado y por
contacto y no por texto.

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

## 11.1.15. La pantalla de «no encontramos eso»

Hasta ahora **no había ruta `*`**: cualquier URL que no casara —un enlace viejo compartido por
WhatsApp, una ficha borrada— enseñaba la pantalla de error del propio router, en inglés y sin la
navegación de la aplicación. Quien llegaba ahí no tenía manera de volver más que borrar la barra de
direcciones.

Ahora es una pantalla más, **dentro del shell**: la navegación sigue puesta, dice qué pasó en una
línea y ofrece el inicio. No pide disculpas ni echa la culpa (§70): un enlace puede estar mal
escrito o llevar a algo que ya no está, y las dos cosas son normales.

**Y hace un segundo trabajo, prestado y temporal**: antes de rendirse pasa la ruta por
`notificationRoute` (§95.16). Es lo que rescata los avisos de Web Push, que entran por el service
worker con el enlace del contrato tal cual. El día que el backend publique las rutas de verdad, esa
línea deja de traducir nada y la pantalla se queda solo con lo suyo.

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

`Cartera` lleva además **Cobranza** (`/cartera/cobranza`), que es lo que se le ha escrito al
deudor por WhatsApp (§11.1.16). Va en la navegación del negocio y no en Configuración porque
es una lista de trabajo: se entra a ella cuando alguien pregunta por qué no le llegó el
mensaje. Su **política** sí es un ajuste y vive en Configuración.

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

## 18.1. El orden de una tabla

De esa lista, el **ordenamiento** es lo que más se había desalineado entre pantallas, y por un
motivo concreto: funcionaba **por coincidencia**. `DataList` daba cabecera clicable a una columna
cuando su `id` era, letra por letra, el nombre del campo que acepta el endpoint. Donde coincidía
—«Vence» (`dueDate`), «Saldo» (`balance`)— la tabla ordenaba; donde no —la columna `date` de
pagos y egresos, que en el contrato se llama `receivedAt` y `disbursedAt`— la cabecera se quedaba
muda **sin que fallara nada**. Misma lista, mismo componente, y la cartera ordenaba por
vencimiento y por saldo mientras egresos ordenaba por monto y no por fecha.

Un fallo que no se ve no se arregla, así que la conexión entre columna y contrato **se declara**:

1. **El orden lo hace el servidor. Siempre.** `DataList` monta TanStack Table en `manualSorting` y
   no registra `sortedRowModel`. Ordenar en el cliente solo tocaría la página cargada y daría un
   orden global falso (§21.1, §88.4).
2. **Una columna ordena si el endpoint acepta su campo. Ni una menos.** Un campo que el API sabe
   ordenar y la cabecera no ofrece es orden perdido, y es la grieta por la que dos pantallas
   espejo empiezan a comportarse distinto.
3. **Ni una más.** Una cabecera que ordena por algo que el contrato no acepta es una promesa que
   el listado no puede cumplir. Si el orden que falta hace falta de verdad, es **petición de
   contrato** (§21.1), no trabajo de front.
4. **El `id` es vocabulario de la interfaz; el campo, del contrato.** Cuando no coinciden se dice
   con `meta.sortField`. Es obligatorio en las pantallas espejo: la columna «Fecha» es **una**, y
   se llama `receivedAt` de un lado y `disbursedAt` del otro.
5. **Dos puertas, un solo dato.** La cabecera en escritorio y `FilterSortField` dentro del cajón
   —la única vía en móvil, donde las filas son tarjetas y no hay cabeceras—. Las dos escriben en
   la URL, así que no pueden contradecirse. **No hay una tercera:** el control suelto de orden en
   la barra existió, ninguna lista lo usó nunca y se borró.
6. **La dirección: la columna activa alterna; cambiar de columna la conserva.** Es lo que ya hacía
   el cajón («si venías mirando lo más grande primero, sigues queriendo lo más grande primero») y
   ahora hacen las dos puertas igual. Que la cabecera reiniciara a ascendente y el cajón no era
   otra incongruencia, más pequeña y más difícil de ver.
7. **Una sola columna a la vez.** El contrato v1.0.0 acepta un `sort` y un `order`, no una lista
   (§21.1).
8. **La cabecera ordenable es un `<button>` de verdad**, y la activa lleva `aria-sort`
   (`ascending` / `descending`) y su flecha. Sin foco ni anuncio, ordenar es una función que solo
   existe para quien usa ratón.
9. **Un campo ordenable sin columna vive solo en el cajón.** Pasa con «Valor original» en cartera
   y con «Creación» en contactos, maestros y recurrentes: se ofrecen porque el endpoint los
   acepta, y no hay dónde pulsar porque no se enseñan.

### Cómo está hoy

| Lista | Lo que acepta el endpoint | Cabeceras que ordenan |
| --- | --- | --- |
| Cuentas por cobrar / por pagar (`AccountsList`) | `dueDate`, `balance`, `originalAmount` | Vence, Saldo |
| Pagos / egresos (`SettlementList`) | `receivedAt` · `disbursedAt`, `amount` | Fecha (por `sortField`), Monto |
| Acuerdos / gastos recurrentes (`RecurringList`) | `name`, `createdAt` | Ninguna: ningún campo tiene columna |
| Contactos | `name`, `createdAt` | Nombre |
| Movimientos de caja | `occurredAt`, `amount` | Fecha, Monto |
| Los cinco maestros (`MasterCrud`) | `name`, `createdAt` | Nombre (por `sortField` de la columna) |
| Mensajes de cobranza (`MessagesTab`) | — | Ninguna: el endpoint no acepta `sort` |
| Consentimientos (`ConsentsTab`) | — | Ninguna: el endpoint solo acepta `page` y `pageSize` |
| Organizaciones (consola) | — | Ninguna: el endpoint no acepta `sort` |
| Cuentas de caja (`/caja/cuentas`) | — | Ninguna: es un resumen de saldos, no un listado paginado |

Las dos filas sin cabeceras son deliberadas y están comentadas en su código. En recurrentes el
nombre de la plantilla es la **segunda línea** de «Pagador», no una columna: una cabecera clicable
ahí diría que ordena por pagador y ordenaría por otra cosa. El día que el nombre tenga columna
propia, la gana.

### Al montar un listado nuevo

- ¿Qué acepta el `sort` de este endpoint? Sale del contrato, no de lo que parezca razonable.
- Cada campo aceptado: ¿tiene columna? Entonces su cabecera ordena — y si su `id` no es el campo,
  `meta.sortField`.
- El mismo `SortChoice[]` alimenta las cabeceras y el cajón. Una sola lista, no dos.
- Si es una pantalla espejo, **la otra cara ordena por lo mismo** o hay una razón escrita.

---

## 18.2. Lo que declara una columna

Una lista se define **una vez** —`listColumns()`— y de ahí salen la tabla de escritorio y las
tarjetas de móvil (§11.1.3b). Lo que cambia entre las dos presentaciones viaja en `meta`, nunca
en clases sueltas:

| En `meta` | Para qué |
| --- | --- |
| `card` | Qué papel tiene en la tarjeta: `title`, `meta`, `status`, `amount`, `sub` |
| `align: 'right'` | Cifras a la derecha, con `nums`, **en la tabla y en la tarjeta** |
| `hideOnTable` / `hideOnStack` | Lo que sobra en una de las dos presentaciones |
| `label` | Su etiqueta en el pie de la tarjeta, si la cabecera no sirve |
| `sortField` | El campo del contrato que la ordena, cuando no es su `id` (§18.1) |

**Nada de clases de presentación por columna.** `MasterCrud` aceptaba `className` y
`headClassName` por columna y **no las usaba**: los cinco maestros declaraban `nums text-right`
en sus importes y los pintaban a la izquierda, mientras los de cartera iban a la derecha. La
alineación de un importe es del sistema (§19), no de cada pantalla, y por eso hoy es `align`.

**Y el énfasis lo pone el papel, no la posición.** La fila lleva en negrita la columna que la
nombra —la que declara `card: 'title'`—, no la primera que se haya escrito: en conceptos de cobro
y en categorías de gasto la primera es el código, casi siempre vacío, así que se destacaba un «—»
y el nombre quedaba en texto normal.

---

# 19. Tablas en desktop

Mantener:

- encabezado claramente diferenciado, y **clicable donde ordena** (§18.1);
- filas respiradas;
- líneas divisorias discretas;
- hover suave;
- montos alineados a la derecha, siempre, con `meta.align` (§18.2);
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

## 21.2. Cada ficha de estado cuenta lo que va a enseñar

Las fichas llevan número, **todas y en los dos lados de la cartera**. Un número al lado dice el
reparto de la lista sin filtrar nada, que es medio motivo por el que las fichas sustituyeron al
desplegable.

**El número sale del propio listado, no del resumen.** Es una diferencia que se nota, porque
cuentan cosas distintas: el resumen de cuentas por cobrar firma un `pendingCount` que es «lo que
está sin pagar» —vencidas incluidas—, mientras que la ficha «Pendientes» filtra por
`displayStatus=PENDING`, que las excluye. La ficha prometía ocho cuentas y abría seis. Y el
resumen de cuentas por pagar no firma más contador que el de vencidas, así que ese lado enseñaba
una ficha con número y tres sin.

Preguntándoselo al listado —una página de un elemento por ficha, y se lee el `total`— el número
es **exactamente** lo que se ve al pulsarla, cuenta igual en los dos lados y respeta los filtros
avanzados que haya puestos: filtrar por un pagador reparte las fichas de ese pagador. Son cuatro
consultas diminutas y TanStack Query las cachea; se paga poco por no mentir.

Las **cifras de cabecera** siguen saliendo del resumen y son de toda la cartera, sin filtrar. Un
dinero global junto a un contador filtrado serían dos cosas distintas en la misma tarjeta.

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

## 32.1. Notas de voz en el hilo

Un mensaje dictado se pinta como en cualquier app de mensajería: play, onda, duración y hora, con
la transcripción debajo (`AudioPlayer`). Y **sobrevive a la recarga**, que era lo que faltaba: el
audio de la sesión se reproducía y al volver al día siguiente quedaba solo el texto.

El contrato lo dice todo en dos campos de `ChatMessage`:

| Campo | Qué significa | Cómo se pinta |
| --- | --- | --- |
| `source: 'audio'` | Se dictó | Micrófono junto al texto |
| `hasAudio: true` | El servidor todavía guarda el audio | Reproductor |
| `waveform` | Las subidas y bajadas de la voz | La onda, sin descargar nada |
| `audioSeconds` | Cuánto dura | `0:03` antes de reproducir |

Los dos juntos no son lo mismo que cada uno: **dictado sin audio guardado** —almacenamiento de
objetos sin configurar, o audio purgado— se lee como lo que queda de él, su transcripción con el
micrófono delante. Inventar un botón de play que no puede sonar sería peor que no ponerlo.

**El audio se pide al pulsar play, no al pintar el hilo.** La URL que devuelve
`…/messages/{messageId}/audio` es **temporal y firmada**, así que pedirla por adelantado para
treinta mensajes es firmar treinta enlaces que caducan sin que nadie los use.

Como la URL caduca, hay dos redes debajo: se reutiliza cinco minutos (`fetchQuery`, así que dos
pulsaciones seguidas comparten petición) y, si al reproducir ya no vale, el botón se convierte en
un «reintentar» que tira la guardada y pide otra.

**La onda no se saca del audio: viaja con el mensaje.** Las subidas y bajadas de la voz son lo
único que distingue una nota de otra de un vistazo, y sacarlas exige decodificar el audio — así que
descargarlo para dibujarlas anularía todo lo anterior. Se calculan **una vez, al grabar**
(`waveform.ts`: 32 valores de 0 a 1, el volumen medio de cada tramo), viajan al servidor con el
mensaje y vuelven con él. `AudioPlayer` recibe `peaks` y `seconds` y pinta la nota **sin tocar el
audio**; solo cuando faltan decodifica, y hasta entonces la onda va plana.

RMS por tramo y no el máximo: un golpe de mesa dispara el pico y deja el resto de la onda
aplastada, mientras que la media cuadrática dibuja el volumen que de verdad se oye. Dos decimales,
porque a ojo se ven idénticos y la onda entera cabe en 130 bytes.

El backend las guarda y las devuelve (`waveform`, `audioSeconds`), y un valor malformado se ignora
en vez de tumbar la petición — así se pidió en `contract/HANDOFF-audio-historial.md` y así llegó.
Una nota sin onda guardada sigue viéndose plana hasta que suene, que es el caso de las anteriores
a esto.

**La transcripción no se enseña.** Una nota de voz con su texto debajo se lee dos veces y ocupa el
doble para decir lo mismo: si mandaste un audio fue porque no querías escribir, y que Numi conteste
a lo que dijiste ya prueba que entendió. El texto sigue guardado —es lo que queda cuando el audio
ya no está— pero no es lo que se lee en la burbuja. La excepción es el mensaje dictado **sin** audio
guardado: ahí la transcripción es todo lo que hay, y esconderla dejaría una burbuja vacía.

## 32.2. Grabar una nota de voz

**El gesto es el de WhatsApp, y se copia a propósito.** No por parecerse: es el único gesto de
grabar que la gente ya tiene aprendido, y dictarle a Numi se parece más a mandar un audio que a
rellenar un formulario.

| Dónde | Cómo se graba | Por qué |
| --- | --- | --- |
| Dedo (`pointer: coarse`) | **Mantener pulsado** el micrófono | Es el gesto que ya se sabe |
| Ratón | **Un clic** empieza, otro botón para | Sostener el botón del ratón sin moverlo mientras se habla no lo hace nadie — WhatsApp de escritorio tampoco lo pide |

Manteniendo pulsado hay tres salidas, y la barra las dice mientras pasan: **soltar** manda,
**deslizar a la izquierda** cancela (el aviso se va con el dedo y se apaga según se acerca), y
**subir** fija la grabación — a partir de ahí el dedo sobra y manda la barra de siempre, la misma
que usa el ratón. Un toque de menos de 0,7 s no es una grabación: se descarta y se dice por qué.

**El candado se ve desde el primer momento**, no al empezar a subir. Una opción que no se ve no
existe: nadie descubre solo que puede soltar el dedo.

**Y las dos salidas se dibujan igual de fuerte.** Cancelar siempre se vio —el aviso se va con el
dedo y se apaga— pero fijar no: el candado crecía un poco y se llegaba al tope sin haberse
enterado de que se estaba llegando. Subir tiene ahora su propia animación, y lo que cuenta es
**cuánto falta**: el candado se llena de color de abajo arriba como un vaso, el micrófono sube a
su encuentro y el aviso de la barra cambia de «desliza para cancelar» a «sube para fijar». Al
llenarse queda macizo, y eso es que ya está. Es la misma idea que el aviso que se apaga al
cancelar, contada al derecho.

### Cuando queda fijada

A partir del candado el dedo sobra y manda la barra de siempre —la misma que usa el ratón—, y esa
barra se parece a la de WhatsApp por la misma razón que el gesto: hace lo mismo y la gente ya sabe
leerla.

Arriba, **lo que llevas grabado**: el reloj y la **onda en vivo**, que se dibuja midiendo el
volumen del micrófono diez veces por segundo (§32.1 usa la misma medida, `rms`, para resumir el
audio ya grabado). Sin la onda, una grabación fijada es un reloj que corre y no hay forma de saber
si el micrófono está cogiendo algo hasta escuchar lo enviado.

Abajo, **las tres salidas separadas y del tamaño de un pulgar**: tirarlo, pararlo un momento,
mandarlo. Pausar existe porque una nota fijada dura lo que haga falta y a media frase pasa de
todo; reanudar sigue el mismo audio, no empieza otro. Y **tirar la grabación no se confirma**: el
botón está lejos del de enviar y quien lo pulsa acaba de decidir que lo que dijo no vale — un
diálogo ahí solo estorba (§45).

### Seis cosas sin las que «mantener pulsado» no funciona en un móvil

Ninguna se nota cuando está; todas se notan cuando falta. Las dos primeras son la misma historia:
**el gesto se moría antes de empezar**, y se leyó de dos formas distintas —«se cancela con
cualquier movimiento» y, tras dejar de descartar en `pointercancel`, «se bloquea de una»— porque
era el mismo `pointercancel` con dos finales.

1. **El composer no se desmonta mientras el dedo está encima.** El overlay se dibuja **sobre** él,
   no en su lugar. Sustituirlo quitaba del DOM el botón que había recibido el `pointerdown`, y
   quitar ese elemento dispara `pointercancel` **al instante**. Esto es lo que hacía que se
   bloqueara nada más presionar.
2. **`touch-none` en el botón.** Sin él el navegador entiende que el dedo quiere desplazar el hilo,
   se queda con el gesto y también manda `pointercancel`, a los pocos píxeles.
3. **Zona muerta de 14 px.** Nadie sostiene el pulgar quieto mientras habla. Sin ella el pulso de
   la mano contaba como deslizar.
4. **Un eje a la vez, pero revocable.** El primer movimiento que sale de la zona muerta decide si
   esto es cancelar (horizontal) o fijar (vertical), y el otro eje se ignora: un pulgar sube
   torcido, y sin eso acumulaba desplazamiento a la izquierda y cancelaba a medio camino del
   candado. Pero **decidirlo para siempre en catorce píxeles es decidirlo con ruido**: un temblor
   horizontal al acomodar el pulgar dejaba «cancelar» puesto y la subida al candado no contaba
   nunca — se podía grabar y se podía cancelar, pero fijar era imposible. El eje cambia cuando el
   otro manda con holgura (1,6×), que es suficiente margen para que subir torcido siga siendo
   subir.
5. **Sostener el micrófono no puede ser una pulsación larga.** Android decide a los ~500 ms que un
   toque quieto va a ser una **pulsación larga** —la de seleccionar texto— y cancela el gesto. El
   menú no llega a salir, así que desde fuera solo se ve que la grabación se muere sola medio
   segundo después de presionar, y que moverse un poco lo evita (mover descarta la pulsación
   larga). Fue el fallo más largo de esta pantalla y se disfrazó de tres cosas distintas: «se
   cancela con cualquier movimiento», «se bloquea de una» y «si lo dejo quieto se cancela»,
   según lo que hiciéramos al recibir la cancelación.

   Reaccionar a ella estaba mal de las dos maneras posibles —tirar la grabación parecía que
   presionar la cancelara; fijarla, que presionar la bloqueara—, porque las dos eran mentira: el
   dedo seguía ahí. **Lo que hay que hacer es que no ocurra**: `preventDefault` en el `touchstart`
   del botón, con un escucha **no pasivo** puesto a mano (los que registra React son pasivos y ahí
   `preventDefault` no hace nada).

   Y por si acaso, **dos fuentes para el mismo dedo**, porque táctil y puntero son secuencias
   independientes y el sistema puede llevarse una y dejar la otra. `pointercancel` no se escucha
   siquiera; un `touchcancel` no decide nada por sí solo: **espera a ver si la otra secuencia
   sigue hablando** y, si llega cualquier cosa —un movimiento, un dedo que se levanta—, el gesto
   continúa como si nada. Solo cuando no llega nada por ningún lado se da el rastro por perdido.

   Y perder el rastro **nunca descarta**. Que el sistema interrumpa no es la persona diciendo
   «tira esto»: la grabación queda fijada, con sus botones, y decide quien habló. Descartar en
   silencio fue justo lo que hacía que sostener el micrófono pareciera cancelarlo solo.

6. **Fijar cuesta 72 px, y el candado se dibuja justo ahí.** El dedo acaba encima de él: lo que se
   ve es a dónde hay que ir. Dos centímetros de pulgar se recorren queriendo y no se recorren
   sosteniendo — con toques de verdad, una deriva de 65 px no fija nada y una subida de 80 sí.

   Estuvo en 56 y se fijaba sin querer, así que subió a 110 buscando margen; a esa distancia el
   candado quedaba a dos dedos y el gesto se hacía incómodo. **El bloqueo accidental no era
   distancia**: era el eje congelado y el puntero cancelado, los puntos 4 y 5. Arreglados esos, la
   distancia puede volver a ser la cómoda.

**Y los escuchas del puntero van en `window`, no en el botón**, para que el gesto no dependa de
sobre qué elemento está el dedo. Es el mismo cuidado que el arrastre del lanzador de Numi (§87.5).

**El micrófono grande y el candado se anclan al botón medido**, no a la esquina del contenedor. El
micrófono pequeño vive dentro de la caja de escribir y el grande es el doble de ancho: puestos a
ojo quedaban a seis píxeles el uno del otro y el dibujo saltaba bajo el dedo justo al empezar a
grabar. Se mide el botón en el `pointerdown` y los dos se colocan ahí, el candado encima.

**Cómo se prueba esto**, porque tiene truco: un ratón emulado **no reproduce** el fallo. Los
punteros de ratón no se cancelan al desaparecer su objetivo, así que la primera versión pasaba las
pruebas y moría en el teléfono. Hay que mandar toques de verdad
(`Input.dispatchTouchEvent` por CDP) y **contar los `pointercancel`**: con el gesto sano son cero.

Y hay que probar **el pulgar que no quiere nada**: un toque que se sostiene mientras se va yendo
hacia arriba unos pocos píxeles cada décima. Ese es el que descubrió que 56 px se recorrían sin
querer, y no lo encuentra ningún toque que va directo del punto A al B.

**Lo que el arnés no puede ver.** La emulación táctil de un navegador de escritorio no ejecuta lo
que Android hace con una pulsación larga, así que hay una clase entera de fallo —el sistema
llevándose el gesto mientras el dedo sigue puesto— que aquí sale siempre en verde y en el teléfono
no. Se rompió cuatro veces seguidas por adivinar la causa desde este lado. Para eso está
`features/config/gesture-probe.tsx`, en Configuración → Aplicación: apunta con marca de tiempo qué
eventos llegan al sostener un botón **en el aparato donde pasa**. Es herramienta de soporte y se
quita cuando el gesto esté cerrado.

## 32.3. El hilo no se pierde, y avisa cuando contesta

**Cerrar el chat nunca debe perder lo dicho.** El hilo vive fuera del árbol de rutas, así que
cerrar el panel o navegar a otra pantalla no lo tocaba nunca; lo que sí lo perdía era **salir de
la app en el móvil**: el sistema descarta la página y al volver se entraba a un saludo, con lo
dicho hace un minuto en ninguna parte.

El servidor conserva las conversaciones, pero eso solo sirve si le dio tiempo a guardarlas: si la
respuesta iba en camino cuando la app se fue, lo enviado no estaba en ningún sitio. Así que **el
hilo se guarda también en el navegador** (`nummo-numi`), los últimos cincuenta mensajes. Al
arrancar se ve al instante lo último que se habló y aun así se mira el servidor, que puede traer
lo que se dijo desde otro dispositivo: si ya hay hilo local, se respeta.

De un mensaje se guarda todo menos la `audioUrl` de una nota recién grabada, que es un `blob:` de
esa página y muere con ella. Se queda la transcripción y la onda, que es lo que hace que la nota
siga siendo legible al volver.

**Y el turno es del hilo, no del panel.** Si se cierra el chat con una pregunta en el aire, la
respuesta llega igual y se guarda; al volver a abrir, «escribiendo…» sigue puesto si todavía no
ha llegado. Antes ese estado vivía en la mutación, que se desmontaba con el panel: volver a abrir
mostraba un hilo callado como si no hubiera nada pendiente.

**Lo que el navegador no puede arreglar solo** está en `contract/HANDOFF-numi-durabilidad.md`: si
la app se cierra mientras Numi piensa, la petición muere y esa respuesta no existe en ninguna
parte; y una nota de voz recién enviada no se puede volver a escuchar tras recargar, porque el
servidor guarda el audio pero no nos dice con qué `id` lo guardó. Las dos se resuelven en el
backend —guardar el turno antes de llamar al modelo, y devolver los ids que crea—. **Aquí no se
emparejan mensajes por aproximación**: es un parche que se rompe solo, y el dato correcto lo tiene
quien lo crea.

**Cuando Numi contesta con el chat cerrado, lo dice en su icono**: un punto sobre el mark de Numi,
en la barra de abajo en móvil y en el botón flotante en escritorio (`NumiUnreadDot`). Va ahí y no
en un aviso aparte porque la respuesta está en el chat, y el sitio donde se anuncia debe ser el
sitio al que hay que ir. Se apaga al abrir, sin más ceremonia. El rótulo del botón lo dice también
—«Abrir el chat con Numi · respuesta nueva»—: un punto de color no existe para quien no lo ve
(§7).

## 32.4. Una conversación por tema, y todo lo anterior a un scroll

El hilo enseñaba solo el último tramo de la última conversación. Lo demás existía en el
servidor y no había forma de llegar: ni de subir a leer lo de ayer, ni de volver a una
conversación anterior. El panel tiene ahora **dos vistas** y una lleva a la otra.

**Subir trae lo anterior.** Al llegar arriba del hilo entra la página previa, de treinta en
treinta, y también hay un botón —«Ver mensajes anteriores»— porque con teclado no existe
«subir». Lo delicado no es traerlos, es **no mover la vista**: insertar mensajes por arriba
empuja hacia abajo todo lo demás, así que se guarda dónde estaba la lectura y se restaura
antes de pintar. Corregirlo después se vería como un salto.

Solo se mezclan las páginas **de la segunda en adelante**. La primera es la que ya sembró el
hilo al abrir, y un mensaje enviado vive con un id de cliente hasta que el servidor le da el
suyo: si la app se cerró antes de esa respuesta, mezclar la primera página pondría el mismo
mensaje dos veces sin que las dos copias se reconozcan.

**La lista de conversaciones vive en el panel**, como en WhatsApp, no como barra lateral: en
25rem de ancho una barra dejaría el hilo en nada. Se entra por la cabecera y se vuelve con la
flecha. Cada fila abre al pulsarla —el objetivo grande es el que se usa— y sus acciones,
renombrar y borrar, van en un menú aparte: un «borrar» que se pulsa al querer abrir es justo
el error que no se puede deshacer.

El nombre que trae cada conversación lo deriva Numi del primer mensaje, cortado por palabra;
**es un punto de partida, no una decisión**, y renombrar es lo que la convierte en «Cobros del
colegio». Borrar la saca de la lista para siempre, y el diálogo lo dice entero: lo que Numi
haya registrado se queda, porque los movimientos no se borran nunca (§ historia inmutable).

**Qué conversación se está leyendo es del hilo; qué vista se está mirando es de la pantalla.**
Lo primero se guarda —tiene que sobrevivir a cerrar el chat—; lo segundo no: volver a abrir
en el hilo es lo que se espera de un asistente. Y borrar la conversación abierta empieza una
nueva en el acto, que es lo que el backend haría igualmente con un id que ya no reconoce.

## 32.5. Lo enviado se ve, y lo que falla dice por qué

**Numi atiende un turno a la vez, pero escribir no espera a nadie.** Antes, mientras
contestaba, el botón de enviar se apagaba: lo escrito en ese rato no iba a ninguna parte.
Ahora entra en la **cola del hilo** —marcado con un reloj— y sale solo en cuanto hay turno
libre, en el orden en que se escribió. La cola vive en el hilo y no en la pantalla: cerrar
el chat con algo esperando no lo pierde.

Grabar sí espera, y es la única excepción: una nota de voz no se puede encolar porque su
audio es un `blob:` de esta página y no sobrevive a guardarlo.

**Cada mensaje propio dice en qué anda, en palomitas** — a la derecha de la hora y dentro
de la burbuja, como en WhatsApp:

| Estado | Qué se ve | Qué significa |
| --- | --- | --- |
| `queued` | Un reloj | Espera turno; Numi está con otra cosa |
| `sending` | Una palomita | Salió de aquí, nadie ha dicho todavía que llegara |
| `sent`, o sin marca | Dos palomitas | El servidor lo tiene |
| `failed` | — | Su propia línea debajo (más abajo) |

**Sin estado son dos palomitas**, y no ninguna: un mensaje propio sin marca vino del
historial del servidor, así que llegó por definición. Dejarlo pelado pondría los mensajes
de hoy con palomitas y los de ayer sin ellas.

Estuvo como una línea de texto debajo de la burbuja —«En espera», «Enviando»— y ahí hacía
ruido: una frase por mensaje propio pesa más que el mensaje. Un símbolo de doce píxeles
dice lo mismo sin robarle sitio a lo dicho, y es el que la gente ya sabe leer.

**Y la segunda palomita llega cuando el servidor coge el turno**, no cuando el turno
termina. Antes se marcaba al final, así que la marca de «en camino» seguía puesta con la
respuesta ya a media página. Vale cualquier señal de vida del flujo —`start` es la primera
y llega siempre; el primer trozo cubre el turno que no la traiga—.

**Lo que falló sí lleva línea**, debajo de la burbuja: entre la hora y las palomitas no
cabe un «Reintentar», y un fallo sin salida no sirve de nada. Reintentar cuelga del mensaje
que falló, que es lo que se quiere reenviar; devolverlo a la cola es todo lo que hace.

**Y un fallo dice cuál fue.** No es lo mismo quedarse sin internet que quedarse sin cuota,
y hasta ahora las dos cosas se leían igual: «No se pudo contactar a Numi», con un botón de
reintentar que en el segundo caso iba a fallar todas las veces. Cuatro casos, y el tipo
decide qué se ofrece:

| Qué pasó | Qué se dice | ¿Reintentar? |
| --- | --- | --- |
| No hay proveedor de IA (422) | El aviso, y **Ir a Configuración** si administras | No |
| Se acabó el tope (409 `LIMIT_EXCEEDED`) | «Llevas 2000 de 2000 mensajes con Numi este mes» | No |
| El plan no lo incluye (403 `FEATURE_NOT_AVAILABLE`) | «Tu plan no incluye esta función» | No |
| Lo demás (red, servidor) | El mensaje que haya | Sí |

**Un botón que no puede funcionar es peor que ninguno**: la cuota no se rellena por volver
a pulsar. Y las cifras salen del `details` del error, nunca inventadas: si no viene
completo se usa el mensaje del backend tal cual, y un tope que el front no conoce se cuenta
como «se agotó una de las cuotas de tu plan» —jamás enseñando su clave cruda.

## 32.6. Numi contesta mientras escribe, y se puede detener

La respuesta llega **en flujo** (`POST /assistant/chat/stream`, Server-Sent Events), no de
una vez. Antes había que esperar la respuesta entera mirando tres puntos; ahora se ve
escribir. Va sobre `fetch` y no sobre `EventSource` —que solo hace GET y no puede llevar la
cabecera CSRF— ni sobre el cliente generado, que consume el cuerpo entero antes de
devolverlo, que es justo lo que aquí no se puede hacer.

**El transporte vive en `lib/sse.ts`**, no en el chat: el playground del superadmin (§47.5) habla
igual y con un evento más. Ahí están el troceado del flujo —un `read()` puede traer medio evento,
o tres y pico—, el CSRF y la trampa de abajo; en `features/assistant/stream-chat.ts` queda lo
propio del inquilino, que es qué eventos entiende y qué devuelve un turno.

**Y lo que falla antes del primer trozo vuelve como JSON, no como flujo.** Se mira el
`content-type` antes de abrir el lector: tratar un cuerpo JSON como flujo de eventos no produce ni
un evento, y la pantalla se queda esperando un turno que ya falló.

**Los puntos viven dentro de la burbuja de Numi**, no en una fila aparte. La burbuja se abre
vacía en cuanto hay turno y la primera palabra sustituye los puntos en el mismo sitio: nada
aparece ni desaparece, y el hilo no salta.

**Detener vive dentro de la caja de escribir, en el sitio del micrófono.** El botón de la
derecha es uno solo y dice qué se puede hacer ahora mismo: la flecha de enviar en cuanto hay
algo escrito —que sigue haciendo falta, porque lo que se escriba mientras tanto se pone en la
cola (§32.5)—; con la caja vacía, el cuadrado de detener mientras Numi contesta y el
micrófono cuando no. Grabar no compite por ese sitio: una nota de voz no se encola, así que
mientras hay turno el micrófono no serviría de nada.

Estuvo como una pastilla flotando sobre el composer, y eso es una fila que nace y muere con
cada turno: empuja el hilo, aparece lejos del pulgar y ocupa sitio para decir lo mismo. Es la
misma idea de los puntos dentro de la burbuja, llevada al botón — nada aparece ni desaparece,
cambia lo que ya estaba.

Detener **aborta la petición**, y eso es todo: para el servidor, cortar la conexión y cerrar
la pestaña son lo mismo, y los dos dejan de gastar tokens. **Lo ya escrito se queda**, aquí y
en el archivo: es texto real que el usuario leyó. Detener antes de la primera palabra no deja
burbuja vacía.

Tres detalles que cuestan un bug si se olvidan:

- **El evento `start` trae la conversación antes de la primera palabra.** Quien detiene no ve
  el final del turno; sin ese aviso su siguiente mensaje iría sin `sessionId` y el backend
  abriría otra conversación, dejando la primera huérfana con una pregunta y ninguna respuesta.
- **Abortar cierra el flujo limpiamente**, sin `done` y a veces sin lanzar. Eso no es una
  conexión caída: hay que preguntar por la señal antes de dar el flujo por roto.
- **Un turno que falla retira su burbuja**, con lo que llevara escrito. Media frase que nadie
  va a terminar se lee como si fuera la respuesta buena, y al reintentar quedarían las dos.
  Detener es distinto: ahí sí se conserva, porque fue una decisión y no un fallo.
- **El turno acaba en `done`, no cuando se cierre la conexión.** Se leía hasta agotar el
  cuerpo, y entre el último evento y el cierre están el proxy y su keep-alive: el botón de
  detener se quedaba puesto unos segundos sobre una respuesta terminada, ofreciendo cortar
  algo que ya nadie escribía. Con `done` está todo lo que hacía falta, así que se suelta el
  flujo ahí mismo.

Lo que llega por el evento `error` se clasifica exactamente igual que un error HTTP (§32.5):
la cuota agotada a media respuesta dice lo mismo y tampoco ofrece reintentar.

**Un turno pueden ser dos generaciones, y no se leen como una.** Cuando Numi consulta datos
antes de contestar, primero dice lo que va a hacer, consulta y después responde — y las dos
partes salen por el mismo flujo sin nada entre ellas: «…lo más urgente!Con datos de hoy…»,
pegadas y sin un espacio. Se parten en dos párrafos al pintar (`splitGlued`), reconociendo la
juntura por lo que es: un punto o un cierre de exclamación **y acto seguido una mayúscula**,
que dentro de una misma respuesta no lo escribe ningún modelo. Se exige minúscula delante del
punto para no partir «Semillas S.A.S.» ni «J.P. Rojas» por la mitad.

Es una heurística y se sabe: lo correcto es que el flujo marque el corte, y está pedido en
`contract/HANDOFF-numi-streaming.md` junto con el retraso del `done`. Cuando llegue el
marcador, esto se retira.

## 32.7. El hilo se lee: fechas, tandas, copiar y citar

**Un separador cuando cambia el día** —«Hoy», «Ayer», «14 ago»—, no una etiqueta por
mensaje. Va con `role="separator"` porque para un lector de pantalla es eso: una
división del hilo, no un turno más de la conversación.

El día sale del reloj de quien lee, no de UTC. Recortar los diez primeros caracteres del
ISO parece lo mismo y no lo es: en Colombia adelanta cinco horas, así que un mensaje de
las nueve de la noche aparecía bajo el separador de mañana.

**Las tandas no repiten la cara.** Dos burbujas seguidas del mismo lado y con menos de
cinco minutos entre ellas son una sola intervención: solo la primera lleva el avatar de
Numi y las demás guardan su hueco, para que el hilo no se desalinee. Cambiar de lado, o
un silencio largo, o un cambio de día, cortan la tanda.

**Copiar y citar viven al lado de la burbuja**, y aparecen al pasar por encima o con el
foco; en pantalla táctil, donde no hay «encima», se quedan puestas. Copiar es la que más
falta hacía: Numi contesta con cifras y hasta ahora había que seleccionarlas a mano. Ni
una nota de voz ni una respuesta a medio escribir las ofrecen — de la primera lo que hay
es audio, y de la segunda el texto todavía está cambiando.

**Cómo salen las acciones, y por qué son dos interfaces.** Con ratón hay «encima» y con el
dedo no, así que ofrecer lo mismo en los dos sitios significa que en uno sobra.

En **escritorio**, un chevron en la esquina de la burbuja que aparece al pasar por encima
y abre el menú con copiar y citar. Van dentro y no sueltas al lado: una fila de iconos
flotando junto a cada mensaje ensucia un hilo largo. Los pulgares sí se quedan al lado,
porque son estado del mensaje y no una acción escondida.

En **móvil**, mantener pulsado selecciona el mensaje: la cabecera se convierte en barra de
acciones —«1 seleccionado», copiar, citar— y los pulgares salen flotando sobre la burbuja,
como la fila de reacciones de WhatsApp. El gesto se cancela al mover el dedo, porque
desplazar el hilo no es elegir, y se le quita el menú del sistema, que si no se lleva la
pulsación larga para seleccionar texto.

**La cita se pinta como bloque**, con barra de color, quién lo dijo y un recorte de lo
dicho — el de WhatsApp. Pero **viaja dentro del texto del mensaje**, en formato `>` de
markdown, y no como un campo aparte: así **Numi la lee**. Un campo `replyTo` obligaría a
inyectarla en el prompt a mano, y lo que se quiere es justo que el modelo vea a qué se
refiere la pregunta. Quien la dibuja la vuelve a partir al pintar.

Lleva el autor —`> Numi:` o `> Tú:`— por lo mismo: sin él el modelo no sabe si se le cita
a él o al propio usuario, que es lo que la pregunta suele estar distinguiendo. Y al leerla
de vuelta **se exige el autor, no solo el `>`**: alguien puede empezar un mensaje con «> »
porque sí, y pintarlo como cita sería inventarle un origen que no tiene.

**Se cita a cualquiera, también a uno mismo.** Volver sobre lo que pediste hace veinte
mensajes es tan útil como volver sobre lo que Numi contestó.

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

La barra superior es el punto de entrada universal: `⌘K` en escritorio, la lupa en móvil.

**Busca en cinco sitios, no en uno** (`features/search/use-global-search.ts`): contactos, cuentas
por cobrar y por pagar, pagos y egresos, tres resultados de cada uno y el mismo `q` rebotado. Antes
solo consultaba contactos, así que buscar el nombre de quien te debe **no encontraba su cuenta**,
que es justo a lo que se entra. Lo que el contrato todavía no da —el saldo de un contacto, el
nombre del pagador en las listas de dinero— está pedido en `contract/HANDOFF-buscador.md`; hasta
que llegue, la ficha enseña lo que el API firma y nada más (§70).

**Dos formas, un componente:**

| | Forma | Por qué |
| --- | --- | --- |
| Escritorio | Paleta a dos columnas, anclada arriba | La derecha es la ficha del seleccionado, con su acción principal: se encuentra y se resuelve sin salir |
| Móvil | Pantalla completa | Con el teclado abierto, un diálogo centrado dejaba tres filas visibles y media pantalla en blanco |

**En móvil se sale con una flecha atrás, no con «Cancelar».** La palabra se comía setenta píxeles
de una barra de 390 y el placeholder se cortaba a media frase —«Busca un contacto, una cuenta, un
pag…»—, que es justo lo que explica de qué va la caja. La flecha ocupa veinte, va a la izquierda
en el sitio de la lupa y es el gesto que ya trae el buscador de cualquier app del teléfono. En
escritorio no hace falta: está `esc` en el pie y la lupa dice lo suyo.

**Con el campo vacío no se lista el catálogo entero.** Enseñaba veinte destinos —toda la
navegación y todas las acciones— sin un orden que significara nada. Ahora: las acciones **de la
pantalla en la que estás**, los **recientes** (`features/search/recents.ts`, cinco, en
`localStorage`, solo etiqueta y destino: ningún importe sale del servidor) y el resto de acciones.

Los atajos se ven en el pie: `↑↓` navegar, `⏎` abrir, `⇥` la acción del seleccionado, `esc` cerrar.

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

**La forma la define §11.1.5** (`components/ui/sonner.tsx`) y el caso raro, §11.1.6.

---

# 40.1. Actualizar la aplicación instalada

`registerType: 'prompt'`: Nummo **no se recarga sola**. Alguien puede estar a medio formulario, y
en una consola financiera eso no se hace. Pero prompt sin comprobación es lo peor de los dos
mundos —una versión vieja servida desde la caché y ningún aviso—, así que la comprobación es
donde está el trabajo. Todo vive en `pwa/app-update.ts`.

**El navegador no comprueba solo.** Vuelve a por el `sw.js` al navegar, que en una SPA es casi
nunca; instalada como app, Nummo puede pasar días abierta. Se pregunta en cuatro momentos:

| Momento | Por qué |
| --- | --- |
| Al abrir | El despliegue pudo ocurrir con la app cerrada |
| Al volver a la pestaña | Es el «vuelvo al trabajo» de verdad |
| Al recuperar conexión | Sin red la comprobación no sale |
| Cada 30 min | Para la sesión que se queda abierta toda la tarde |

Antes solo estaba el temporizador, y es **el más débil de los cuatro**: el navegador congela los
de una pestaña en segundo plano y en móvil suspende la app entera. De ahí el «a veces sale el
aviso y a veces no». Entre dos comprobaciones hay un mínimo de un minuto, para que volver a la
pestaña no dispare una ráfaga.

**Y hay que preguntar bien.** `registration.update()` vuelve a pedir el `sw.js`, pero el navegador
puede responderlo **desde su propia caché HTTP** y entonces la comprobación no comprueba nada. Por
eso primero se pide el fichero con `cache: 'no-store'` —eso refresca la entrada— y solo después se
llama a `update()`. Esa línea es la diferencia entre detectar el despliegue y creer que no lo hay.

**Al aceptar**, la recarga la dispara el evento `controlling` de vite-plugin-pwa. Si no llega
—un worker que no responde al `SKIP_WAITING`— se recarga a mano a los 4 s: más vale una recarga de
más que un botón que no hace nada.

**La versión es el commit**, no la fecha de compilación (`__BUILD_ID__`, `vite.config.ts`). Una
fecha cambia en cada `vite build` aunque no haya cambiado una línea: se cuela en el bundle, mueve
el hash y hace que el service worker anuncie «versión nueva» por un rebuild del mismo código.

**Ojo con lo que Workbox serializa.** La regla `NetworkOnly` del API se escribía con una función
que leía `API_PATHS`, una constante del `vite.config.ts`. Workbox **convierte esa función a texto**
para meterla en el service worker, así que la constante llegaba al worker como un identificador que
no existe y la regla reventaba con un `ReferenceError` en vez de aplicarse —en silencio, porque el
comportamiento por defecto (ir a la red) coincidía—. Los patrones van escritos dentro del cuerpo,
repetidos. `navigateFallbackDenylist` sí puede leerlos: recibe los regex como dato, no como código.

**Y una salida de emergencia**, `/config/aplicacion`: comprobar a mano, ver la versión instalada y
**vaciar y recargar** —borra las cachés, da de baja los workers y vuelve a descargar—. No toca
`localStorage`, así que la sesión, el tema y las preferencias sobreviven. Existe porque la
alternativa del usuario era «borrar los datos del sitio» en un menú del navegador que casi nadie
encuentra.

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

## 45.1. Una pantalla se enseña entera, no por partes

**El estado de carga es de la pantalla, no de cada consulta.** Si una vista se alimenta de varias
consultas, se espera a todas: mientras alguna esté en vuelo se pinta el esqueleto, y el contenido
aparece de una vez.

Es lo que faltaba en el Panel y en los dos informes. El Panel vive de ocho consultas y llegaban
por separado: la gráfica vacía, la lista de atención vacía, los KPI en cero, y todo recolocándose
a medida que respondía el servidor. Un tablero a medio llenar **no se lee como «cargando»: se lee
como un negocio sin datos**, que es lo contrario de lo que dice medio segundo después. El informe
de cartera era peor todavía —nueve consultas y ningún estado de carga—.

**La excepción son los listados**, y por un motivo concreto: su esqueleto tiene la forma de sus
filas, así que nada cambia de sitio al llegar los datos. Ahí sí puede cargar por bloques, y de
hecho conviene. La regla real detrás de las dos: **lo que se pinta mientras carga tiene que ocupar
el mismo sitio que lo que va a llegar.** Cuando el esqueleto no puede prometer eso, se espera.

Al **recargar con datos ya en pantalla** —cambiar el período de un informe— no se vuelve al
esqueleto: se deja lo anterior a la vista (`isPending && !report`). Parpadear a gris en cada tecla
es peor que un dato un segundo viejo.

## 45.2c. Un formulario que no se puede guardar no se abre

Las listas escondían bien sus botones según el rol, pero **los formularios de crear se abrían a
cualquiera por URL**: un lector llegaba a «Nuevo contacto» o «Nuevo acuerdo» —por un enlace
guardado, por el botón atrás—, lo rellenaba entero y el 403 aparecía **al guardar**, con el trabajo
ya hecho.

Esconder el botón de entrada no es guardar la pantalla. La regla: **la pantalla que escribe
comprueba el permiso ella misma**, y si no lo hay enseña un `EmptyState` con candado en lugar del
formulario y sin pie de acciones. El API sigue siendo el guard de verdad (§48); esto es no ofrecer
lo que no se puede hacer.

Ojo con quién puede qué, que no es «todo o nada»: quien registra pagos no tiene por qué poder
reversarlos. Se comprueba con `useCan('payments.reverse')` (§88.5), **nunca comparando el rol a
mano**: el backend autoriza por permiso, y el rol dejará de predecir lo que alguien puede hacer en
cuanto existan roles personalizados.

## 45.2b. Un fallo no se pinta con ceros

El Panel y Resultados enseñaban su esqueleto mientras cargaban y, **si la petición fallaba**,
seguían adelante con `?? '0'`: cuatro ceros, «0 en mora» y —lo peor— «Nada vencido y nada que
venza en los próximos días. Todo al día». Una afirmación que la pantalla no tenía cómo saber.

No parecía rota: parecía un negocio sano y sin movimiento. Alguien cierra el día tranquilo con
cartera vencida encima, y esa es la única clase de bug que una consola financiera no se puede
permitir — el hueco visual se nota, la respuesta falsa no.

**La regla:** si la consulta que da sentido a la pantalla falla y no hay dato anterior que enseñar,
la pantalla es un `ErrorState` con reintentar. No un cero, no un vacío. El «entero o nada» de
§45.1 vale también para el fallo: entero, esqueleto **o error**.

Ojo con la condición: `isError && !dato`. Con el dato viejo en mano se prefiere enseñarlo a
vaciar la pantalla —un informe de hace un minuto sigue siendo cierto—, y en una lista un fallo al
pasar de página no debe borrar lo que ya se estaba leyendo.

## 45.4. Solo lectura es un modo, no un error

Una organización **suspendida o archivada** queda en solo lectura: consultar y exportar siguen
funcionando —eso no se gatea nunca— y **cualquier** mutación responde `403
ORGANIZATION_SUSPENDED`. Solo la plataforma puede revertirlo; el propietario ya no puede cambiar
el estado de la suya.

Eso no es el fallo de una pantalla, así que **no se cuenta con un aviso**. Un toast por cada clic
diría veinte veces lo mismo y siempre **después** del intento. La forma es al revés:

1. `useCan` apaga las acciones **antes**, leyendo el estado de la organización y no el error
   (§88.5). Los permisos que terminan en `.read` siguen concedidos; los demás, no.
2. `ReadOnlyBanner` lo explica una vez, en la cabecera de todas las pantallas, con `Note` en tono
   de advertencia — el mismo aparte de siempre, no un invento nuevo (§11.1.5).
3. El aviso, si llega a haberlo, dice lo que **sí** se puede: consultar y exportar.

## 45.5. Cuando lo que falla es el plan

Dos errores nuevos que no significan «algo salió mal»:

| Código | HTTP | Qué pasó | Qué se ofrece |
| --- | --- | --- | --- |
| `FEATURE_NOT_AVAILABLE` | 403 | El plan no lo incluye | Mejorar de plan |
| `LIMIT_EXCEEDED` | 409 | Sí lo incluye, pero se acabó el cupo | Liberar espacio **o** mejorar |

Los dos traen `details` con esquema propio, así que el mensaje lleva **cifras**: «Tienes 200 de
200». `used` es lo ya gastado, nunca lo que queda.

Y no son el mismo caso: un **aforo** (`max_contacts`, `max_users`, `max_branches`) se libera
archivando; una **cuota mensual** (`ai_messages_monthly`, `voice_minutes_monthly`) se renueva
sola, así que esperar también es una salida. `isPeriodicLimit` distingue las dos.

Todo esto vive en **un sitio**, `toastApiError` (`features/platform/errors.ts`), que es la forma
de contar que una mutación falló: si el error es de plan dice lo de arriba, y si no, lo de
siempre. Ninguna pantalla se tiene que acordar de los dos códigos, que es justo lo que no habría
pasado con 44 `toast.error` repartidos.

**Y el aviso no se queda en el diagnóstico:** lleva un botón «Ver planes» a `/config/plan`
(§45.6). Decirle a alguien que se quedó sin cupo y dejarlo buscando dónde se arregla es media
respuesta.

Cómo llega ahí es lo único con truco. El `Toaster` se monta en `providers.tsx`, **por encima del
`RouterProvider`**, así que un `<Link>` dentro de un aviso no tendría router del que colgar; y
llamar al router desde `errors.ts` cerraría un ciclo de imports —`router.tsx` monta el shell y el
shell acaba importando quien avisa—. La salida es la misma que ya usa el 401: el shell **presta**
su `navigate` (`setAppNavigate`, `lib/navigate.ts`) y quien avisa lo pide. Sin nadie registrado
cae a una navegación del navegador: recarga, que es peor, pero un botón que no hace nada es mucho
peor.

**Ojo con uno que no viene de un plan:** `limit: "free_organizations"` es el tope anti-abuso de
organizaciones gratuitas por usuario. Llega por la misma vía y se nombra igual —por eso el
mensaje no dice «de tu plan»—, y no hay que distinguirlo.

## 45.6. Dónde se ve el plan

`/config/plan` («Plan y consumo») es el destino de los dos errores de arriba: cuando el backend
dice «no te alcanza», aquí se ve por qué y qué haría falta.

Tres cosas que hay que hacer bien y se hacen mal solas:

1. **Un tope en `null` es «sin límite», nunca cero.** Y un `price` en `null` es **«Consultar»**,
   tampoco cero: el plan gratuito trae `0.00` de verdad, así que pintar el vacío como gratis
   promete algo que nadie ha decidido.
2. **Los dos tipos de tope no salen del mismo sitio.** Las cuotas mensuales (Numi, voz) las lleva
   el servidor en `usage`, que es donde se cobran. Los aforos (contactos, miembros, sedes) cuentan
   filas que existen ahora, así que el conteo lo tiene la propia lista — y contactos va con
   `isActive: 'true'`, porque **lo archivado no gasta cupo**.
3. **`period` es el mes de la organización, no el del navegador.** Viene resuelto en su zona
   horaria; no se recalcula aquí.

Los planes van en **tarjetas y no en una tabla comparativa**: cuatro planes por once filas no
caben en 360 px sin desplazarse en horizontal, que es el gesto que §11.1.3 prohíbe para lo que hay
que leer entero. Y solo se listan las features que **algún** plan incluye: las otras cuatro
existen como clave y se encenderán al construirse, así que hoy serían cuatro «✗» que no comparan
nada.

Cuatro decisiones de la tarjeta, que es lo que se copia mal de una página de precios cualquiera:

1. **El que destaca es el plan contratado, no un «Recomendado».** El contrato no publica esa
   señal, y ponerla aquí sería una decisión de precio escrita en el front (§70).
2. **Sin la micro-etiqueta «PLANES» en versalitas** encima del título, ni el conmutador
   mensual/anual: la primera es el tic que §11.1 prohíbe, y el segundo anunciaría un precio anual
   que el contrato no tiene.
3. **Cada tope con su icono**, al tamaño del texto y sin pastilla detrás — el cuadradito tintado
   por fila es el otro tic de §11.1. Es lo que deja leer la lista de un vistazo.
4. **El botón no finge un carrito.** Mover una organización de plan es una acción de la consola de
   plataforma (§47.2), así que «Consultar Pro» abre un diálogo que dice qué pasa de verdad, y el
   plan contratado no lleva botón sino una marca.

**Estar al tope no se pinta en rojo.** El medidor pasa a ámbar desde el 80 % y, al llenarse, lo
dice con palabras («sin cupo») en vez de subir a `destructive`: el rojo de §7 es para lo vencido y
lo que falló, y un plan Free con «1 de 1 miembros» lo tendría encendido para siempre — que es
exactamente el aviso que se aprende a ignorar.

## 45.7. Un formulario no se rellena dos veces

El patrón que sale solo al escribir una pantalla de edición es este:

```ts
useEffect(() => { if (registro) reset(toForm(registro)) }, [registro, reset])
```

y tiene un fallo que **no se ve leyéndolo**: `registro` no cambia solo cuando se abre otro, sino
cada vez que la consulta trae datos nuevos. Si alguien edita ese mismo registro desde otro sitio,
o si algo invalida la caché mientras se escribe, el efecto se dispara otra vez y el formulario se
rellena de nuevo — **lo escrito desaparece sin decir nada**. Y si el hook reconstruye su resultado
en cada render, el efecto entra en bucle: es literalmente cómo se descubrió, previsualizando el
editor de roles.

**`useHydrateOnce` (`lib/use-hydrate-once.ts`) es la forma de hacerlo**, y lo usan las siete
pantallas que editan algo cargado: contacto, acuerdo, gasto recurrente, empresa, rol, umbral de
aprobación y el tema por defecto. La clave la pone quien llama —no todo lo que se edita tiene
`id`; los ajustes van por `organizationId`— y es ella, no la identidad del objeto, la que decide.

Dos consecuencias que hay que tener presentes:

1. **Si la pantalla se queda tras guardar**, hay que marcarla limpia a mano con lo que se guardó
   (`reset(values)`): ya no va a refrescarse sola. Los cajones que navegan al detalle no lo
   necesitan.
2. **Un diálogo que debe abrir siempre con lo de hoy se monta solo mientras está abierto**
   (`{abierto && <Dialog … />}`), y entonces el estado de partida lo ponen los inicializadores y
   no hace falta efecto. Es lo que hacen el editor de planes y el de condiciones negociadas.

Lo que **no** entra aquí: los diálogos que se rellenan desde estado local (`editing` de un
catálogo) ni los que resetean a vacío al abrirse. Ahí la dependencia no la mueve el servidor.

## 45.2. La puerta de entrada no parpadea

Mientras `GET /auth/me` está en vuelo **no se sabe** si hay sesión, y `isAuthenticated` todavía es
`false`. Pintar el formulario de login mientras tanto hacía que quien ya tenía sesión lo viera un
instante antes de que la respuesta lo mandara al panel — un parpadeo que hace dudar de si la
sesión se cayó.

`ProtectedRoute` ya esperaba; login y registro no. **Las dos caras de la puerta esperan igual**,
con el mismo `PageLoader`.

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

## 46.1. El foco vuelve a donde estaba

Al cerrar cualquier diálogo o cajón —con Escape o con la X— **el foco vuelve al botón que lo
abrió**. Lo hace `useFocusReturn` (`lib/use-focus-return.ts`), enganchado una sola vez en las dos
envolturas por las que pasa todo lo que se abre encima: `Drawer` y `DialogContent`.

No estaba, y se notaba: medido en el navegador, el foco se quedaba en `<body>` y el siguiente Tab
caía en «Nummo — ir al panel», el primer elemento de la página. Quien abría los filtros con el
teclado y los cerraba **volvía al principio de la app** y tenía que recorrer la barra lateral
entera otra vez. Radix suele encargarse de esto solo; aquí no lo hacía, así que se resuelve a mano
y en un solo sitio.

**El destino sale de un rastro del último elemento enfocado fuera de un diálogo**, no de mirar
`document.activeElement` cuando el panel se monta. Ese fue el primer intento y falla justo donde
más se usa: la paleta de comandos tiene un campo con `autoFocus` que se lleva el foco antes, así
que lo que se apuntaba era el propio campo que estaba a punto de desaparecer. El rastro funciona
igual lo abra un clic o un atajo.

Si quien abrió ya no está en la página —una fila que se borró— no se fuerza nada: se deja el
comportamiento por defecto, que devolver el foco a un nodo desconectado no lleva a ninguna parte.

La accesibilidad no se agrega después.

---

# 47. Roles y permisos

La UI debe respetar los permisos del usuario. **Se decide por permiso, no por nombre de rol**
(§88.5): el rol sigue siendo el paquete de siempre —Dueño, Administrador, Contador, Operador,
Consulta— pero lo que gatea un botón es `can('payments.reverse')`, no `role === 'ADMIN'`.

No mostrar acciones ejecutables que el usuario no puede realizar, salvo que exista una razón UX concreta para mostrarlas deshabilitadas con explicación.

Numi debe respetar exactamente los mismos permisos.

## 47.1. El superadmin de plataforma no es un rol de organización

Vive fuera del tenant y en su propia superficie (`/plataforma`, §47.2). Meterlo en el enum de
roles habría convertido la gestión de miembros en una escalada de privilegios, así que **ser
propietario de tu organización no te hace superadmin** — ni al revés.

Se decide con `GET /me/platform-access`, que se pide **en paralelo** con la sesión. Es
**orientativo**: sirve para no ofrecer un menú que va a fallar, y cada petición a `/admin/*` lo
vuelve a comprobar contra la tabla.

## 47.2. La consola de plataforma

Vive **en esta misma app** como ruta protegida, no en un panel aparte: es la misma persona con la
misma sesión, y montar una segunda aplicación para siete endpoints habría duplicado el cliente
HTTP y el sistema visual entero. Su ficha cuelga de la lista como cualquier otra (§87.5) y su
navegación es `SectionedLayout`, la misma de Configuración y Ayuda (§11.1.3).

**Y su navegación es un sidebar propio, no la sub-navegación de Configuración.** Durante un
tiempo la consola navegó con `SectionedLayout`, que está pensado para vivir **dentro** de una
página: una columna clara sobre el fondo, sin peso. Era la única superficie de Nummo donde
navegar no pesaba nada, y cruzar del inquilino a la plataforma parecía cambiar de producto.

Hoy tiene `PlatformSidebarBody`, con la **forma** del sidebar del negocio —superficie oscura,
grupos, el activo con su barra— pero deliberadamente **no con su acento**:

- **Índigo, no azul** (`--sidebar-platform-primary`, el del isotipo aclarado para leerse sobre
  una superficie que va oscura en los dos temas). No es decoración: esta es la única pantalla
  donde alguien mira la contabilidad de otro y, con un interruptor, escribe en ella. Si se
  parece del todo a la app del cliente, se olvida dónde se está — y el sidebar es lo único que
  está siempre a la vista para recordarlo.
- **Bloque «Consola de plataforma»** bajo la marca, y **quién está dentro** en el pie, con su
  condición de superadmin.
- **Ni selector de organización** (un superadmin puede no ser miembro de ninguna) **ni
  secciones del negocio**. En el pie, la salida a Nummo —solo si hay a dónde volver— y el
  estado del sistema.
- **Se pliega a carril de 72 px** desde la cabecera, y la elección se recuerda en
  `localStorage` porque es una preferencia y no un filtro (§21.1). Plegado devuelve **184 px**
  al contenido, que en la tabla de organizaciones y en la comparación de cuatro variantes es
  justo lo que falta; lo que se pierde es el texto, no la estructura — los grupos se separan
  con una raya. (Y no con el nombre recortado: «Plataforma» cabía como «Plata», que en español
  es otra palabra.)

La cabecera se reparte como manda §11.1.1: el sidebar navega, y tema y cuenta viven arriba a
la derecha.

**Y el cuerpo no es el de Configuración.** Alto de ventana, scroll de la pantalla y no de la
página, y contenido centrado en 72rem (`PlatformPage`). La columna de 48rem que comparten Ajustes y Ayuda es la que hace legible un
texto; aquí lo que hay son **tablas densas de administración**, y esa columna las dejaba apretadas
con medio monitor en blanco al lado. Las dos que no la usan son las que no se leen sino que se
operan —la consola de Numi y la comparación—, que traen su propio marco con la barra de contexto
pegada arriba.

**Pero cuelga fuera de `AppShell`, y esto costó una captura de pantalla descubrirlo.** El shell de
la aplicación empieza por «¿a qué organización perteneces?» y enseña el onboarding de «Crea tu
organización» a quien no pertenece a ninguna. Un superadmin **no tiene por qué tener
organización**: administra todas, no es miembro de ninguna. Con la consola dentro, esa puerta se
cerraba antes de que la ruta llegara a montarse, así que `/plataforma` acababa en «Crea tu
organización» — parecía una redirección y era una pantalla tapando a la otra.

Es también lo coherente con el backend: `requirePlatformAdmin` corre **fuera** de `requireTenant`.
Si allí no hace falta un inquilino, aquí tampoco. De ahí que `PlatformShell` lleve el cromo
mínimo —marca, tema, cuenta y una salida a la app si la tiene—: la navegación del negocio no
significa nada mirando la plataforma, y el selector de organización estaría vacío.

Y por si alguien aterriza en el onboarding de todas formas, esa pantalla ofrece la consola cuando
`isPlatformAdmin`: era el único callejón sin salida que quedaba.

| Ruta | Qué hace |
| --- | --- |
| `/plataforma/organizaciones` | Todas, con su plan, su estado y su consumo del período |
| `/plataforma/organizaciones/:id` | La ficha: topes efectivos, condiciones negociadas, cambiar plan, suspender |
| `/plataforma/planes` | Editar los planes, que son filas y no una constante del código |
| `/plataforma/playground/*` | **El playground de Numi** (§47.5): probar el asistente contra una organización real |

Tres cosas de aquí que se hacen mal solas:

1. **Un override tiene tres estados, no dos.** «Lo que diga el plan» no es «sin límite», y «sin
   límite» no es cero. Por eso cada tope lleva un selector y no una casilla, y lo que se deja
   heredado **deja de estar negociado** — se manda el conjunto entero.
2. **Guardar un plan obliga a decir si alcanza a quien ya lo tiene.** El contrato lo pide sin
   valor por defecto a propósito: cambiar topes o precios sin querer a los clientes actuales es de
   las pocas cosas realmente difíciles de deshacer. El desplegable arranca vacío y no se envía sin
   elegir.
3. **Suspender no borra nada.** Deja a la organización en solo lectura (§45.4). Es una medida
   comercial o antiabuso, no dejar a nadie fuera de su propia contabilidad.

Y la consola invalida también el catálogo **público** de planes al guardar: editar el precio de
Pro y que «Plan y consumo» siga enseñando el viejo sería el peor sitio para una caché rancia.

## 47.3. Roles propios de una organización

Los cinco de siempre siguen ahí, y encima una organización puede definir los suyos. Tres reglas
que cambian cómo se piensa la pantalla de miembros:

1. **Un rol propio reemplaza los permisos del rol base, no se suma a ellos.** «Qué puede hacer
   esta persona» tiene que tener una sola respuesta. El rol base se conserva como **etiqueta** —y
   es lo que sigue contando propietarios activos—, así que un miembro tiene rol y, opcionalmente,
   rol propio: dos desplegables, no uno.
2. **Escribirlos se vende con el plan (`custom_roles`); leerlos no.** Quien baja de plan conserva
   los que definió y sus miembros siguen trabajando. Por eso la lista se enseña igual y lo que
   desaparece es el botón: esconderla entera diría lo contrario de lo que hace el backend
   —bloquear crear, nunca borrar—.
3. **El editor ofrece el catálogo entero**, incluidos los tres permisos que el backend reserva al
   propietario. No se filtran aquí porque **el contrato no publica cuáles son**, y escribir esa
   lista en el front sería la segunda fuente de verdad que §88.5 existe para evitar. El backend
   los rechaza nombrándolos, así que el error dice cuál sobra. *(Anotado como petición de
   contrato en `SYNC-STATUS.md`.)*

**Los 57 permisos no se nombran uno a uno.** Todos tienen la forma `recurso.acción`, así que dos
tablas pequeñas —24 recursos y 13 verbos— los componen todos y **componen el que venga**:
`payments.reverse` → «Pagos · Reversar». Una tabla de 53 entradas se queda coja a la primera clave
nueva y nadie se entera; con esto, un recurso desconocido cae en «Otros» con su clave a la vista.

En el editor van **agrupados por área** —la de la navegación, §14— y dentro por recurso, con el
contador y el «Todo» **en el área**: un rol se piensa así («lleva la cartera»), no casilla por
casilla, y «Cartera 3 de 12» responde la cobertura sin abrir nada.

**Una caja por área, no una por recurso.** Veinticuatro rectángulos con borde apilados son la sopa
de tarjetas de §11.1: separan sin jerarquizar. Dentro, los recursos se separan con una línea, que
es lo que ya hace `DetailRows`. Y las casillas van **apiladas bajo su recurso**, no en una columna
de etiquetas al lado: el cajón mide 30rem y una columna fija dejaría a los cuatro verbos de
«Egresos» sin sitio.

En la lista, cada rol se resume por **las áreas que toca**, en fichas. Con recursos salían siete
nombres unidos por `·` que se desbordaban a dos renglones y había que leerlos todos para saber de
qué iba el rol. Y un rol **sin miembros** se lee distinto —«Sin miembros» en gris frente a la
insignia—, porque es el único que se puede archivar sin mover a nadie antes.

Va en **cajón y no en diálogo centrado**: cuelga de la lista de roles y no es un formulario corto.
§11.1.3 mira las dos cosas y aquí apuntan al mismo sitio.

## 47.4. Aprobación de egresos

«Todo egreso mayor a $5.000.000 requiere aprobación» **no lo resuelve un permiso**: necesita
estado en la entidad, y ahí está lo que hay que entender antes de pintar nada.

**El estado vive en el desembolso, no en el gasto.** Un gasto es una obligación; el egreso es el
dinero saliendo, y es eso lo que se aprueba. Por encima del umbral **no se mueve un peso** hasta
que alguien firma, así que un `PENDING_APPROVAL` no es un egreso a medias: es una **solicitud**.
Solo `POSTED` y `REVERSED` tienen movimiento financiero.

De ahí las tres decisiones de pantalla:

1. **La ficha opera sobre `POSTED`**, no sobre «no está reversado» (§94.0). Un pendiente no tiene
   nada que revertir ni anticipo que repartir.
2. **`disbursements.approve` es condición necesaria, no suficiente**: el backend comprueba además
   que quien aprueba no sea quien registró. El contrato **no publica el autor**, así que eso no se
   puede anticipar — el botón se ofrece y el error lo dice. Es la excepción consciente a «no
   ofrecer lo que va a fallar».
3. **El rechazo pide motivo**, que se guarda con quién decidió. No se borra nada.

El umbral va en Configuración › Gastos › **Aprobación de egresos**, hermana de las políticas de
interés en cartera: es una política, no un catálogo, tiene endpoint propio y va detrás de la
feature `approvals`. **Vacío la apaga** — es «sin umbral», no «umbral cero», que haría pasar por
aprobación hasta el café.

**Sin notificaciones**, y la pantalla lo dice: quien aprueba los encuentra filtrando la lista de
egresos por «Espera aprobación».

## 47.5. El playground de Numi

La segunda superficie de plataforma (§47.2), y la única donde se **prueba** el producto en vez de
administrarlo: se elige una organización real, se suplanta un rol, se habla con Numi y se ve qué
costó el turno. Cuelga de `/plataforma/playground` y **ningún usuario de una organización la ve**.

Corre el **mismo** caso de uso que atiende a un cliente —mismo system prompt, mismas herramientas,
mismo grounding—, así que lo que se ve aquí es lo que pasa en producción. Lo que cambia lo cambia
**estrechando**, nunca ampliando: un rol suplantado no puede más que ese rol.

**Cinco destinos y por verbo, no nueve por endpoint.** Empezó con una entrada de menú por
ruta del contrato —consola, herramientas, comparar, regresión, actividad, historial,
puntuaciones, escrituras y conocimiento—, que es el modelo de datos y no el del trabajo (§14).
Lo que la persona hace son cinco cosas; lo demás es una pestaña de la que le corresponde, y las
rutas viejas redirigen a la suya para que ningún enlace guardado muera.

| Ruta | Qué hace | Pestañas |
| --- | --- | --- |
| `/plataforma/playground` | **Probar**: hablar con Numi suplantando un rol | — |
| `…/comparar` | El mismo mensaje contra 2–4 variantes de modelo o prompt | — |
| `…/regresion` | **Proteger**: el conjunto de regresión | Casos · Corridas |
| `…/vigilar` | Lo que pasó con clientes de verdad | Resumen · Turnos · Puntuaciones |
| `…/controlar` | Qué puede hacer Numi y qué dejó hecho | Herramientas · Escrituras · Conocimiento |

**Cinco cosas de aquí que se hacen mal solas**, y las cinco pintan un panel que miente:

1. **`null` no es cero.** Los tokens que un proveedor no reporta llegan `null` = «no lo sé». Se
   pintan «—» (`formatTokens`). Un cero ahí inventa un ahorro de caché que no ocurrió, y es
   exactamente el número que alguien va a mirar para decidir si el prompt cacheado sirve de algo.
   Cuando **ninguno** se sabe, la traza lo dice con palabras: un panel entero de guiones parece
   roto y no lo está.
2. **`costMicroUsd` son micro-dólares** (÷ 1.000.000) y puede ser `null` → «Sin precio
   configurado», nunca `$0`. Va con código ISO —`USD 0,0032`— y no con `$`, que aquí es el peso
   (§9.2).
3. **`generations` puede traer dos.** Cuando el grounding obliga a reintentar son dos llamadas y
   los tokens del turno son la **suma**. Por eso la cabecera sale de `trace.usage` y no de la
   primera generación: enseñar solo esa saca el coste a mitad de precio.
4. **`read_write` escribe de verdad** en la contabilidad del cliente. Interruptor con estado
   visible y aviso al encenderlo, nunca una casilla en un menú. El modo por defecto es solo
   lectura, y una organización que no está activa **no lo ofrece** (§88.5: no se ofrece lo que va
   a responder 403).
5. **Lo que falla antes del primer trozo vuelve como JSON, no como SSE** —sin proveedor,
   organización suspendida, sin clave—. Se mira el `content-type` antes de abrir el lector
   (`lib/sse.ts`), y el mensaje se enseña **tal cual**: «falta ANTHROPIC_API_KEY» es accionable y
   traducirlo a «no se pudo contactar a Numi» borra la única parte que dice qué hacer.

Y dos cosas que **no** se construyen, por decisión de producto:

- **Reversa masiva de escrituras.** Deshacer movimientos de dinero en bloque es una operación de
  dinero, y las reversas ya existen una a una con su auditoría (§55). El panel dice qué revisar.
- **Un formulario para pegar API keys.** El backend no las acepta: se manda `{ provider, model }`
  y la clave la resuelve el servidor.

**El catálogo de herramientas enseña el porqué de cada ausencia** (`offered` / `withheld`): «no
aparece porque el rol no puede» y «no aparece porque estás en solo lectura» son dos bugs distintos,
y sin distinguirlos los dos se investigan igual. Va en **tabla y no en acordeón**: con veinticuatro
filas plegadas, el motivo —que es la mitad del valor— había que ir a buscarlo abriéndolas una por
una. La fila abre la **ficha** de la herramienta —qué es, qué permiso pide, por qué se ofrece o no,
su esquema literal y el formulario para correrla—, que es lo que se mira **después** de encontrarla.

**Y los vacíos dicen qué hacer.** Sin proveedor de IA no hay turno que valga, y eso se descubría
enviando un mensaje y leyendo el error mientras cinco pantallas vacías lo callaban cada una por su
cuenta; hoy lo dice la barra de contexto en cuanto se sabe. El resto siguen la misma regla: el vacío
de «elige una organización» trae el botón que la elige, el de un panel sin datos propone ampliar la
ventana o incluir las pruebas, y el de escrituras dice de dónde sale un identificador de
conversación (§27: un vacío que solo describe deja el trabajo en manos de quien lo lee).

**Los criterios de la corrida viven en la URL** (`useRunSettings`, §21.1), compartidos por las
cuatro pantallas de prueba. Es lo que hace que «volver a correrla» desde un pulgar abajo abra la
consola con la pregunta y la organización ya puestas, y que saltar de la consola al ejecutor no
obligue a reelegir.

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

**Todas salen de `components/ui/chart.tsx`**: `Chart` para series en el tiempo —barras, líneas,
áreas, apiladas— y `DonutChart` para composición. Ninguna página dibuja la suya.

Debajo hay **Recharts**. Hasta el rediseño se dibujaban a mano en SVG, y para una línea de seis
meses funcionaba; pero cada gráfica nueva era empezar de cero —ejes, escalas, tooltips y
responsive otra vez— y con un módulo de informes por delante eso no escala. Es la excepción
razonada a §63: la dependencia se justifica por lo que viene, no por lo que hay.

**El envoltorio existe para que Recharts no se filtre a las páginas**, y por eso nadie lo importa
directo:

- **Color por token.** Las series piden `chart-1…5`, `success` o `destructive`. Van a los tokens
  crudos (`--chart-1`), no a los de Tailwind: `@theme inline` **no emite** `--color-chart-1` a
  CSS —eso significa `inline`—, así que dentro de un SVG resolvería a nada y todo saldría negro.
- **Dinero en los dos idiomas** (§62): compacto en el eje, exacto en el tooltip.
- **Y lo que no es dinero, tampoco**: `unit="count"` pinta cuentas —turnos de Numi por día,
  tokens— sin `$` delante. El valor por defecto sigue siendo `money`, que es casi todo lo que
  grafica la app; la excepción existe porque una cifra de tokens con símbolo de peso no es un
  formato pobre, es una cifra falsa.
- **Un solo tooltip** para todas, con el formato de §58.
- **Vacío explícito** (§45) en vez de unos ejes sin nada dentro.
- **Sin animación** si el sistema pide menos movimiento.
- **La cola agrupada en «Otros»** en el donut: doce porciones de dos grados no son un dato (§59).
  El CSV exporta todas las filas; la gráfica resume, el archivo no.

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

**Recharts** entró por esta puerta y conviene saber a cambio de qué: **+115 kB gzip**, en el
mismo trozo que las gráficas, así que solo lo descargan el Panel y los informes. Se justificó por
el módulo de informes que viene —escribir a mano cada tipo de gráfica nueva no escala— y a
condición de envolverla: las páginas usan `Chart`, no Recharts (§57).

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
- [ ] Si es un listado: ordena por **todas** las columnas que el endpoint acepta (§18.1).
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
| **@fontsource/instrument-serif** | 5.3 | Serif de los destacados del titular en la portada. Estática (regular + itálica), no variable: esa familia no tiene versión variable. |
| **@fontsource-variable/archivo** · **bricolage-grotesque** | 5.3 | Candidatas a grotesca de titulares, **a decidir en `/laboratorio`** (§97.5). Las dos traen eje de ancho. Se importan dentro de la ruta del laboratorio, no en `index.css`: cuando se elija una, esa —y solo esa— sube a la entrada de la portada y las otras dos se desinstalan. |

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
| **Playwright** | 1.62 | E2E (`smoke`, `numi`, `flujo-maestro`). Contra el backend real. |
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
    palette/             # la capa de paletas de la portada: ranuras → tokens, contraste (§97.2)
  marketing/             # la página pública: portada, secciones, señales y datos (§97)
  pages/                 # pantallas sueltas que no son un dominio (health, laboratorio)
  pwa/                   # service worker y actualización, prompt de instalación, aviso sin conexión
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

  **Esas quince rutas llevan `handle: OVERLAY`**, y no es decorativo: es lo único que distingue
  «abrir una ficha» de «cambiar de pantalla», porque en la URL las dos son igual de nuevas. Lo
  lee el scroll (abajo).

- **Cada pantalla empieza por arriba.** Bajabas en una lista larga, cambiabas de sección y
  aparecías al final de la nueva, mirando el pie de una página cuyo título no habías visto.

  Lo hace `PageScrollRestoration` (`app/page-scroll.tsx`), que envuelve al `ScrollRestoration` de
  React Router: guarda la posición por clave, así que **destino nuevo → arriba, volver atrás →
  donde estabas**. La clave la da `getKey`, quedándose con la coincidencia más profunda que no sea
  `OVERLAY`: por eso `/cartera/cxc` y `/cartera/cxc/abc` comparten clave y abrir la ficha no mueve
  la lista de detrás.

  **No se hace con un `useEffect` y `scrollTo(0, 0)` por cada cambio de `pathname`**, que es la
  solución que sale primero: arregla el caso obvio y rompe los otros dos —pierde el sitio al
  volver atrás y manda al principio la lista al abrir un cajón encima—.

- **Quien llega desde algún sitio vuelve a él.** Registrar un pago desde una cuenta por cobrar
  terminaba en la ficha del pago: dos pantallas más allá, con la cartera —lo que se estaba
  revisando— perdida. Ahora el enlace lleva un `?volver=…` (`withReturn` / `returnPath`, en
  `lib/settlement.ts`) y tanto la X del cajón como el final del formulario respetan ese destino;
  sin él, todo sigue como antes y se cae en la ficha recién creada.

  En la URL y no en el `state` del router, para que sobreviva a una recarga como el resto de los
  criterios (§21.1). Y **se valida antes de navegar**: solo rutas internas, que `//otro.sitio` es
  una URL absoluta disfrazada de ruta.

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

- El contrato vive en `contract/openapi.json` (v1.0.0, **160 paths / 226 esquemas**) y en vivo en
  `http://localhost:4010/openapi.json`.
- Los handoffs por área están en `contract/HANDOFF-fase-0.md` … `HANDOFF-fase-11.md`, más los
  temáticos (`HANDOFF-whatsapp-cobranza.md`, `HANDOFF-buscador.md`, …), y el resumen en
  `contract/SYNC-STATUS.md`. **Léelos antes de construir una sección nueva.**
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

## 88.4b. Mover dinero dos veces

Todas las mutaciones que mueven dinero aceptan `Idempotency-Key`. **Con la misma clave y el mismo
cuerpo el backend devuelve la respuesta original en vez de volver a mover el dinero**, y ahí está
toda la gracia: si la petición salió pero la respuesta se perdió —un túnel, un móvil que cambia de
red— reintentar no duplica la transferencia.

Las diez rutas la mandan: registrar pago y egreso, transferencias, aplicar anticipos, reversar
pago y egreso, ajustes y condonaciones de cartera, y causar mora.

**Una clave por intento, no por reintento** (`lib/idempotency.ts`). Es la parte que se hace mal
sola:

- Generarla en cada clic **no sirve de nada**: dos clics son dos claves y dos movimientos. Contra
  el doble clic manda el botón deshabilitado mientras la mutación está en vuelo; la clave es
  contra la red, que es lo que no se ve.
- Generarla una vez y no renovarla nunca es peor: la segunda transferencia igual hecha **a
  propósito** se la tragaría como repetida. Por eso `renew()` se llama al acertar.

`useIdempotencyKey()` da las dos mitades (`key`, `renew`) y cada pantalla la renueva en su camino
de éxito — ojo con las que tienen dos acciones, que la clave es de una sola: en cuentas por cobrar
se renueva al causar mora, no al generar mensualidades.

## 88.5. Permisos: qué se ofrece y qué no

El backend **dejó de autorizar por nombre de rol**. Cada operación del contrato viene anotada con
`x-required-permission` (135 de las 160) y `GET /organizations/:orgId/me/capabilities` responde de
una vez lo que la UI necesita: rol, `permissions[]`, plan, features, topes, período y consumo.

En el front eso es **una sola pieza**:

```ts
const can = useCan()               // features/platform/permissions.ts
const canReverse = can('payments.reverse')
```

Tres reglas que la sostienen:

1. **El permiso lo dice el contrato, no una tabla nuestra.** El que se pasa a `can()` es el
   `x-required-permission` del endpoint que el botón va a llamar. El tipo `Permission` sale del
   enum generado, así que un permiso renombrado rompe `tsc` en vez de dejar un botón gateado
   contra una cadena muerta.
2. **Nada de agrupar por comodidad.** Aquí vivían tres predicados de rol —`canManageOrg`,
   `canEditContacts`, `canManageAgreements`— y el primero cubría **nueve** permisos distintos: la
   pantalla de sedes y la de catálogos se gateaban igual aunque el API las separa. Registrar un
   pago (`payments.create`) y registrar un egreso (`disbursements.create`) son dos permisos, no
   uno.
3. **Un componente compartido no decide autorización.** `AccountDetail` y `SettlementDetail`
   reciben `canSettle` / `canManage` / `canReverse` / `canApply` **como props**, porque el permiso
   es distinto en cada cara del espejo (§87.2).

4. **`useCan` también apaga lo que la organización no puede hacer.** Si no está `ACTIVE`, todo lo
   que no termine en `.read` devuelve `false`: es el mismo corte que hace `requireTenant` en el
   backend, y se aplica **antes** del intento (§45.4).

De `roles.ts` solo queda el **nombre** de un rol (`roleLabel`, `ASSIGNABLE_ROLES`): lo que se
enseña y lo que se asigna en la pantalla de miembros.

**Y sigue sin ser una frontera de seguridad.** Zod valida en cliente para dar buen feedback y
`useCan` decide qué se dibuja; el backend revalida todo. Ocultar un botón no protege nada —solo
evita ofrecer lo que va a responder 403—.

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
  `bg-slate-100` ni un hex. Hay **dos** excepciones vivas, las dos por el mismo motivo —no son
  decisiones de diseño—: `THEME_COLOR` en `theme-provider.tsx`, que alimenta la meta `theme-color`
  del navegador y no puede ser una variable CSS; y la tabla de colores de `masters/catalogs.ts`,
  que traduce el enum de paleta **que elige el usuario** para sus conceptos y categorías (§11.1.12).
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
| Lógica de dominio (`permissions.ts`, `quick-actions.ts`, `utils.ts`) | Vitest | Reglas de permiso y de negocio del front |
| Componentes con comportamiento | Testing Library | Lo que el usuario ve y hace, no el estado interno |
| Flujos completos | Playwright | Login, navegación, Numi y **el ciclo del dinero** (§92.3) |

## 92.3. El E2E del flujo maestro

`e2e/flujo-maestro.spec.ts` es el único test que **mueve dinero de verdad**, contra `nummo-api`
en :4010: crea un pagador, le firma un acuerdo, genera su mensualidad, la cobra a medias, causa la
mora y la condona. Luego el espejo del gasto, una transferencia y que la caja lo refleje.

Los unitarios prueban cada pantalla con el API simulado; este prueba lo único que ninguno puede:
**que las piezas encajen con el backend real, en orden, y que lo que una pantalla escribe otra lo
lea.**

Dos reglas que salieron de encontrarse el E2E anterior podrido:

- **Crea sus propios datos, con un sello único por ejecución.** El anterior afirmaba sobre la
  siembra —«María Gómez», «Banco Principal», «COP 1.465.775,00»— y sobre nombres de secciones que
  el rediseño cambió. Se puede correr dos veces seguidas sin limpiar nada.
- **Afirma sobre lo que la pantalla promete, no sobre lo que hoy dice.** El `auth.setup.ts`
  esperaba un encabezado «Panel» que dejó de existir cuando el tablero pasó a saludar por el
  nombre: con eso caído, **la suite entera no llegaba ni a autenticarse**. Ahora espera a que el
  shell esté montado, que es lo que de verdad significa «entré».

**Un E2E que no se corre no protege nada, y este no se corría.** Si el CI no lo levanta, hay que
levantarlo a mano de vez en cuando — y el día que una pantalla se rediseñe, se actualiza en el
mismo commit, como cualquier otra prueba.

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
- **Un par de pantallas espejo se prueba con una sola suite parametrizada**
  (`test/accounts-list-suite.tsx`, `test/settlement-list-suite.tsx`): cada cara aporta sus
  palabras, su endpoint y lo que de verdad la distingue, y las afirmaciones se escriben una vez.
  Dos archivos de pruebas calcados son el mismo duplicado que el componente compartido vino a
  quitar, y se separan igual de rápido — con el agravante de que unas pruebas que no coinciden no
  avisan de nada.

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
| Cuentas por cobrar / por pagar | `AccountsList` (lista), `AccountDetail` (ficha) | `copy`, un hook que consulta su endpoint y sus acciones propias |
| Aplicar anticipo de pago / de egreso | `AdvanceAllocationDialog` | `copy` (dos frases) y dos hooks: sus cuentas abiertas y su endpoint de reparto |
| Registrar pago / egreso | `SettlementDrawer` | `copy` (una docena de palabras) y `onSubmit` |
| Pagos / egresos | `SettlementList`, `SettlementDetail`, `CashflowKpis` | `copy` y un hook que consulta su endpoint |
| Acuerdos / gastos recurrentes | `RecurringList` | `copy` y un hook que consulta su endpoint |

`SettlementDrawer` nació de dos archivos de ~310 líneas idénticos salvo por eso. Hoy el
formulario vive una vez y cada página son ~120 líneas: sus palabras, su consulta de cuentas
abiertas y su llamada al contrato. La lógica que no es de pantalla —qué cuenta admite dinero, qué
entrega el formulario— vive en `lib/settlement.ts`, donde se puede probar sin montar nada.

`AccountsList` fue el **cuarto en llegar, y el que más caro salió**. Cuentas por cobrar y por
pagar eran dos archivos de ~500 líneas **idénticos en un 64%**: las mismas seis columnas en el
mismo orden, los mismos filtros, el mismo CSV. Compartían las dieciséis piezas de
`components/` y aun así estaban duplicadas — lo copiado no eran las piezas, era el montaje. Hoy la
pantalla vive una vez (`components/accounts-list.tsx`) y cada cara son ~130 líneas.

**Las diferencias reales entre esas dos caras viajan explícitas**, que es distinto de la deriva.
Hoy son dos:

- **Causar mora**, solo en cobrar. Es de dominio —a un proveedor no se le cobran intereses— y va
  en `actions`, la lista de operaciones periódicas propias de un lado.
- **Los estados de un movimiento**: un egreso puede quedar `PENDING_APPROVAL` o `REJECTED` —las
  aprobaciones por umbral—, y un pago que entra no lo aprueba nadie. Por eso `SettlementList`
  recibe sus `statuses` como prop: una lista común con los cuatro le ofrecería a pagos dos
  filtros que su endpoint rechaza. Y `SettlementDetail` opera sobre `POSTED`, no sobre «no está
  reversado»: un egreso que espera firma no movió un peso, así que no hay nada que revertir ni
  anticipo que repartir.

Hubo una tercera que lo parecía y no lo era, y vale la pena contar cómo se cerró. Los números de las fichas
de estado salían del resumen, y `PayablesSummary` solo firma el de vencidas: cuentas por pagar
enseñaba una ficha con número y tres sin. Se leyó primero como deriva, se comprobó contra el
contrato y se dejó así a propósito (§70: un dato que no se tiene no se inventa) — mirar el
contrato antes de «arreglarlo» evitó inventar un número.

Pero «no se inventa» no es lo mismo que «no se puede saber». El dato existía en otro sitio: el
propio listado cuenta cualquier estado, en los dos lados. Hoy los números salen de ahí (§21.2) y
la diferencia ya no existe.

`AdvanceAllocationDialog` fue el quinto y el más pequeño: dos diálogos de ~150 líneas idénticos
en dos tercios. Repartían el mismo anticipo con la misma aritmética —qué cuenta sigue abierta, el
reparto automático por vencimiento, el total asignado, no dejar pasar más crédito del que hay— y
solo se diferenciaban en dos frases y en cómo llama cada API a la cuenta (`receivableId` /
`expenseId`). Que la aritmética del dinero viviera dos veces era justo lo que no debía pasar: un
ajuste en el redondeo de un lado y el otro repartiendo distinto. Hoy el reparto vive una vez y
cada cara son ~75 líneas de traducción: de dónde salen sus cuentas y cómo se llama cada una en el
cuerpo del POST.

Las **fichas** llegaron después que las listas y con dos formas distintas de parecerse.

`SettlementDetail` —la ficha de un pago y la de un egreso— eran dos archivos calcados línea por
línea: el mismo encabezado, el mismo aviso de crédito sin asignar, la misma lista de
aplicaciones y la misma reversión. Cambiaban una docena de palabras y a dónde apunta cada
enlace. Ahí no había nada que decidir: se juntaron enteras.

`AccountDetail` —la ficha de una cuenta por cobrar y la de una por pagar— es el caso
interesante, porque **no son iguales y no debían serlo**. Comparten el esqueleto: encabezado con
el saldo como cifra protagonista, desglose, detalle, el botón de saldar con su «volver» y el
menú de cerrar la cuenta. Pero cobrar tiene mora, causaciones y ajustes, y pagar no —a un
proveedor no se le cobran intereses—. La tentación era extraer «casi todo» y dejar la diferencia
disimulada con banderas. Va al revés: el esqueleto se comparte y lo propio entra por **slots
declarados** (`menuItems`, `afterBalance`, `afterDetail`, `dialogs`), que se leen desde fuera. Un
slot vacío dice «esta cara no tiene esto»; una bandera diría «aquí pasa algo que no te voy a
contar».

Y al revés: **si tocas un lado del espejo, revisa el otro en el mismo commit.**

**Cómo se extrae uno de estos sin romperlo:** primero una suite de pruebas contra las **dos**
pantallas tal como están —lo que ve el usuario y lo que sale hacia el API, nunca estructura
interna—, y **una sola suite parametrizada**, que escribirla dos veces sería repetir en los tests
el duplicado que se está quitando. Después se extrae. Si la suite sigue pasando **sin tocarla**,
la extracción fue fiel; si hay que retocarla, algo cambió de comportamiento. Es la diferencia
entre refactorizar y reescribir con los dedos cruzados.

**Y una suite que llega tarde también sirve, para otra cosa.** `SettlementList` se extrajo sin
red y estuvo mucho tiempo sin ninguna prueba que mirara esa pantalla; cuando por fin la tuvo
(`test/settlement-list-suite.tsx`, las dos caras) fue para sujetar lo que ya se había separado en
silencio: la cabecera «Fecha» llevaba tiempo sin ordenar y nadie podía verlo (§18.1). Compartir
componente evita que las pantallas se separen; solo las pruebas avisan cuando se separan igual.

| Propuesto (§64) | En el código hoy | Ruta |
| --- | --- | --- |
| `PageHeader` | ✅ `PageHeader` | `components/page-header.tsx` |
| `MetricCard` | ✅ `KpiTile` | `components/kpi-tile.tsx` |
| `StatusBadge` | ✅ `StatusBadge` (+ atajo `StatusDot`) | `components/ui/status-badge.tsx` |
| `Money` | ✅ como función, no como componente | `formatMoney` / `formatAmount` en `lib/format.ts` (§9.1) |
| `DateDisplay` | ❌ no existe como componente | funciones `formatDateHuman` y `formatRelativeTime` en `lib/format.ts` |
| `DataTable` | ✅ `DataList` (tabla + tarjetas apiladas, y las cabeceras que ordenan — §18.1) | `components/ui/data-list.tsx` |
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
| `ContactPicker` | `components/contact-picker.tsx` | Selector de contacto con búsqueda, y con «crear "Netflix"» donde el endpoint lo acepta (§11.1.14) |
| `MoneyField` / `MoneyInput` | `components/money-field.tsx`, `ui/money-input.tsx` | Entrada de importes (crudo con punto, vista agrupada) |
| `Chart` · `DonutChart` | `components/ui/chart.tsx` | **Las gráficas de la app** (Recharts envuelto) |
| `MonthlyFlowChart` | `components/monthly-flow-chart.tsx` | Flujo mensual, en barras o línea |
| `BrandMark` · `BrandLockup` | `components/brand-mark.tsx` | Marca |
| `ThemeProvider` · `ThemeToggle` | `components/theme-provider.tsx`, `theme-toggle.tsx` | Tema claro/oscuro/sistema y su selector |
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
| `SectionedLayout` | `components/ui/sectioned-layout.tsx` | Sección con navegación propia: columna en escritorio, `Drawer` bajo `lg` |
| `SettingsLayout` · `HelpLayout` | `features/config/`, `features/help/` | Los dos usos de `SectionedLayout` |
| `FormDialog` | `components/ui/form-dialog.tsx` | Formulario corto en diálogo centrado (Configuración) |
| `AccountFormDrawer` | `components/account-form-drawer.tsx` | Cuenta nueva a mano, de cobro o de pago (las dos caras, un componente) |
| `AccountsList` | `components/accounts-list.tsx` | **La lista de una cartera**, de cobro o de pago (§94.0) |
| `AccountDetail` | `components/account-detail.tsx` | **La ficha de una cuenta**, de cobro o de pago; lo propio de cada cara entra por slots (§94.0) |
| `SettlementDetail` | `components/settlement-detail.tsx` | **La ficha de un movimiento**, pago o egreso (§94.0) |
| `AdvanceAllocationDialog` | `components/advance-allocation-dialog.tsx` | **Repartir un anticipo** entre cuentas abiertas, de cobro o de pago (§94.0) |
| `AudioPlayer` | `features/assistant/audio-player.tsx` | Nota de voz del hilo: play, onda y duración (§32.1) |
| `waveform.ts` | `features/assistant/waveform.ts` | Calcular, redondear y validar la onda de una nota de voz |
| `HoldToRecord` | `features/assistant/hold-to-record.tsx` | Lo que se ve mientras se mantiene pulsado el micrófono (§32.2) |
| `RecordingBar` | `features/assistant/recording-bar.tsx` | La barra de una grabación fijada: onda en vivo, pausa, tirar y enviar (§32.2) |
| `NumiUnreadDot` | `features/assistant/numi-avatar.tsx` | El punto sobre el icono de Numi cuando contestó con el chat cerrado (§32.3) |
| `Note` | `components/ui/note.tsx` | Aparte dentro de un texto: nota, aviso o truco |
| `Toaster` + `toast` | `components/ui/sonner.tsx`, `sonner` | **Los avisos de la app** (§11.1.5) — se monta una vez en `providers.tsx` |
| `useAppUpdate` · `checkForUpdate` · `clearAppCache` | `pwa/app-update.ts` | Detectar y aplicar un despliegue nuevo (§40.1) |
| `listColumns` | `components/ui/list-columns.ts` | Declarar columnas tipadas para `DataList`, con su papel en la tarjeta |
| `RowIconBadge` | `components/ui/row-icon.tsx` | Icono o iniciales de una fila, solo en la tarjeta de móvil |
| `catalogs.ts` · `CatalogIcon` | `features/masters/` | Los 161 iconos y los 22 colores del contrato, y el glifo con su color (§11.1.12) |
| `catalogRowIcon` · `CatalogRef` | `features/masters/catalogs.ts` | El icono de la tarjeta de una fila que pertenece a un catálogo, cruzado por id (§95.19) |
| `IconColorPicker` | `features/masters/icon-color-picker.tsx` | Elegir icono y color en su propio diálogo, con buscador y temas (§11.1.12) |
| `fold` | `lib/text.ts` | Comparar texto sin tildes ni mayúsculas — la paleta, la guía y el selector de iconos |
| `notificationRoute` | `features/notifications/deep-link.ts` | Del `deepLink` del contrato a una ruta que existe aquí — puente temporal (§95.16) |
| `NotFoundPage` | `features/platform/not-found-page.tsx` | La ruta `*`: explica y ofrece salir, y rescata los destinos que llegan crudos (§11.1.15) |
| `IdentityField` | `features/masters/identity-field.tsx` | Elegir el icono y el color de un catálogo, en los dos |
| `CatalogOrderDrawer` | `features/masters/order-drawer.tsx` | El orden propio de un catálogo, con la lista entera |
| `AutoChargeSection` | `components/auto-charge-section.tsx` | **El auto-registro de un recurrente**, en las dos caras (§11.1.13) |
| `KpiStrip` + `KpiTile` | `components/kpi-tile.tsx` | Cifras de cabecera en una sola superficie |
| `FilterChips` | `components/ui/filter-chips.tsx` | Filtro principal como fichas visibles con contador |
| `ListToolbar` | `components/ui/list-toolbar.tsx` | La fila de controles de un listado |
| `FilterSheet` · `FilterSheetTrigger` · `FilterField` · `FilterSortField` | `components/ui/filter-sheet.tsx` | Filtros avanzados y orden, en hoja inferior / cajón |
| `BalanceKpis` | `components/balance-kpis.tsx` | Total, vencido y al día de una cartera |
| `SectionSwitch` | `components/section-switch.tsx` | Salto entre pantallas espejo, solo en móvil |
| `useCapabilities` | `features/platform/hooks.ts` | Rol, permisos, plan, topes y consumo — **una llamada al entrar** |
| `useCan` | `features/platform/permissions.ts` | **El único gate de la UI**: `can('payments.reverse')` (§88.5) |
| `useOrgReadOnly` | `features/platform/permissions.ts` | ¿La organización está suspendida o archivada? (§45.4) |
| `ReadOnlyBanner` | `features/platform/read-only-banner.tsx` | El aviso persistente de solo lectura, en todas las pantallas |
| `toastApiError` | `features/platform/errors.ts` | **Cómo se cuenta que una mutación falló**, plan incluido (§45.5) |
| `setAppNavigate` · `navigateApp` | `lib/navigate.ts` | Navegar desde fuera de React (avisos, §45.5) |
| `usePlans` | `features/platform/hooks.ts` | El catálogo de planes en venta (§45.6) |
| `useLimitUsage` | `features/platform/use-limit-usage.ts` | Cuánto llevas de cada tope — aparte, que el sidebar no lo necesita |
| `PlanPage` | `features/platform/plan-page.tsx` | «Plan y consumo»: el destino de todo `LIMIT_EXCEEDED` |
| `useFeature` | `features/platform/permissions.ts` | ¿El plan incluye esta feature? Orientativo, como `useCan` |
| `permissionLabel` · `groupPermissions` | `features/platform/permission-labels.ts` | Los 57 permisos en palabras, **compuestos** (§47.3) |
| `RolesPage` · `RoleFormPage` | `features/config/` | Roles propios de la organización y su editor (§47.3) |
| `ApprovalPolicyPage` | `features/config/approval-policy-page.tsx` | El umbral de aprobación de egresos (§47.4) |
| `usePlatformAccess` | `features/platform/hooks.ts` | ¿Se ofrece la consola? Orientativo, no autorización (§47.1) |
| `PlatformShell` | `features/admin/platform-shell.tsx` | Shell de la consola, **fuera de `AppShell`** (§47.2) |
| `PlatformSidebarBody` | `features/admin/platform-sidebar.tsx` | Su navegación: el idioma del sidebar del negocio, con otro contenido |
| `PlatformPage` | `features/admin/platform-page.tsx` | El cuerpo de una pantalla de plataforma: alto de ventana y 72rem |
| `AdminOrganizationsPage` · `AdminOrganizationDetailPage` | `features/admin/` | Las organizaciones de la plataforma y su ficha |
| `OverridesDialog` | `features/admin/overrides-dialog.tsx` | Negociar features y topes: **tres** estados, no dos |
| `AdminPlansPage` | `features/admin/plans-page.tsx` | Editar planes, con la decisión de si alcanzan a los actuales |
| `planLabel` · `featureLabel` · `limitLabel` | `features/platform/labels.ts` | Planes, features y topes en las palabras del usuario |
| `orgStatus` | `features/organizations/labels.ts` | Tono y nombre del estado de una organización |
| `NotificationBell` | `features/notifications/notification-bell.tsx` | La campana de la cabecera con su contador — **solo el botón** (§11.1.8) |
| `NotificationsDrawer` | `features/notifications/notifications-drawer.tsx` | **El centro de notificaciones**, montado una vez en el shell (§11.1.8) |
| `useNotificationStream` | `features/notifications/hooks.ts` | Enterarse de un aviso nuevo sin recargar (§11.1.9) |
| `NotificationPreferencesPage` | `features/notifications/preferences-page.tsx` | De qué te avisamos y por dónde (§11.1.10) |
| `NotificationPolicyPage` | `features/notifications/policy-page.tsx` | La política de avisos de la organización (§11.1.10) |
| `PushDevices` | `features/notifications/push-devices.tsx` | Activar los avisos con la app cerrada, y los dispositivos suscritos (§11.1.11) |
| `pushSupported` · `subscribeToPush` · `deviceLabel` | `pwa/push.ts` | La mecánica de Web Push en el navegador |
| `push-sw.js` | `public/push-sw.js` | Lo que hace el service worker con un aviso que llega (§11.1.11) |
| `subscribeToRealtime` | `lib/realtime-stream.ts` | **La conexión en vivo de la app**, una para todos (§11.1.9) |
| `useResourceStream` | `app/resource-stream.ts` | Refrescar la lista que otro dejó vieja (§11.1.9) |
| `formatRelativeTime` · `localDay` | `lib/format.ts` | «hace 5 min» y el día del reloj de quien lee, no el de UTC |
| `useHydrateOnce` | `lib/use-hydrate-once.ts` | Rellenar un formulario **una vez por registro** (§45.7) |
| `useListFilters` | `lib/use-list-filters.ts` | Filtros en la URL, recordados en la sesión |
| `useKeepFilters` | `lib/use-list-filters.ts` | Navegar a la ficha —y volver— sin dejarse los criterios (§21.1) |
| `ListResult<T>` | `lib/list-result.ts` | Lo que devuelve cualquier hook de listado |
| `postEventStream` · `asRecord` | `lib/sse.ts` | **El transporte de un flujo de eventos sobre POST** — lo comparten el chat del inquilino y el playground |
| `PlaygroundConsolePage` | `features/playground/console-page.tsx` | La consola del playground (§47.5) |
| `PlaygroundRunsPage` | `features/playground/runs-page.tsx` | El historial de corridas, turno por turno |
| `TraceView` · `TraceHighlights` · `TraceDrawer` | `features/playground/` | La traza de un turno: entera, resumida en cuatro cifras, o pedida por su id |
| `ToolCatalog` | `features/playground/tool-catalog.tsx` | Qué herramientas ve el modelo y **por qué no ve las otras** |
| `useRunSettings` · `RunSettingsFields` | `features/playground/run-settings.ts`, `run-settings-fields.tsx` | Contra qué se prueba, en la URL y compartido por las cuatro pantallas |
| `readSchemaFields` | `features/playground/schema-fields.ts` | El esquema de una herramienta como formulario — o `null`, y entonces es JSON |
| `formatTokens` · `formatCost` · `phaseSlices` | `features/playground/metrics.ts` | Las cifras de un turno sin mentir: `null` es «—», los micro-dólares se dividen |
| `CodeBlock` · `JsonBlock` · `Disclosure` · `CopyButton` | `features/playground/code-block.tsx` | Texto literal y bloques que se abren, para prompts y argumentos |
| `QuietButton` | `features/playground/quiet-button.tsx` | La acción secundaria de un panel: gris, pequeña, subrayada al pasar |
| `RunContextBar` | `features/playground/run-context-bar.tsx` | **Contra qué se prueba, en una línea** — y el interruptor de escritura |
| `SystemPromptDialog` | `features/playground/system-prompt-dialog.tsx` | El prompt vigente a tamaño de leerse, con su huella y su contador |
| `TraceRail` | `features/playground/trace-rail.tsx` | La traza al lado de la conversación, no detrás de un botón |
| `TracePanel` · `TraceDrawer` | `features/playground/trace-drawer.tsx` | **Cómo se abre una traza**, con la traza en la mano o solo con su id |
| `OriginFilter` · `OrganizationFilter` | `features/playground/panel-filters.tsx` | Los dos filtros que comparten las pestañas de Vigilar |
| `PlaygroundVigilarPage` | `features/playground/vigilar-page.tsx` | Resumen, Turnos y Puntuaciones: la misma pregunta a tres escalas |
| `PlaygroundProtegerPage` | `features/playground/proteger-page.tsx` | Casos y corridas del conjunto de regresión |
| `PlaygroundControlarPage` | `features/playground/controlar-page.tsx` | Herramientas, escrituras y conocimiento |
| `previousRange` · `delta` | `features/playground/ranges.ts` | La ventana anterior y el cambio, **pedidos** al backend y no estimados |
| `CollectionPolicyPage` | `features/messaging/collection-policy-page.tsx` | La política de cobranza por WhatsApp (§11.1.16) |
| `WhatsAppTemplatesPage` | `features/messaging/templates-page.tsx` | Las plantillas y su estado en Meta, de solo lectura |
| `CollectionPage` | `features/messaging/collection-page.tsx` | **Cobranza**: mensajes y consentimiento, en dos pestañas |
| `MessagesTab` · `ConsentsTab` | `features/messaging/` | El historial de «por qué no le llegó» y quién puede recibir |
| `CollectionRemindersSection` | `features/messaging/collection-reminders-section.tsx` | El tri-estado de un acuerdo, diciendo de qué hereda (§11.1.16) |
| `describeQuietWindow` · `isWithinQuietHours` | `features/messaging/quiet-hours.ts` | La ventana de silencio, **cruzando la medianoche** sin caso aparte |
| `WhatsAppAccountPage` | `features/messaging/whatsapp-account-page.tsx` | La cuenta de Meta del negocio: conectar, reemplazar y desconectar (§11.1.16) |
| `TemplateFormDialog` | `features/messaging/template-form-dialog.tsx` | Crear una plantilla propia, con un ejemplo por variable |
| `parseVariables` · `buildExamples` | `features/messaging/template-variables.ts` | Las variables `{{}}` de una plantilla, derivadas del texto y no escritas aparte |
| `QuotaStrip` | `features/messaging/quota-strip.tsx` | El cupo mensual de cobranza, y cuándo deja de significar algo |
| `messageStatus` · `skipReasonLabel` · `consentStatus` | `features/messaging/labels.ts` | Los dos caminos de un mensaje, el porqué de un `SKIPPED` y el efecto de un consentimiento |

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

### 95.14. Orden de las tablas — ✅ **cerrada**

§21.1 firmaba desde hacía tiempo que en escritorio se ordena «pulsando la cabecera de la
columna». El código lo cumplía **a medias y en silencio**: `DataList` marcaba la cabecera como
ordenable comparando el `id` de la columna con el nombre del campo del endpoint, así que la
función existía donde los dos nombres coincidían por casualidad y desaparecía donde no.

El reparto real era este: cartera ordenaba por «Vence» y «Saldo»; pagos y egresos ordenaban por
«Monto» pero **no por «Fecha»** —su columna es `date` y el contrato la llama `receivedAt` /
`disbursedAt`—; los cinco maestros no ordenaban por ninguna cabecera —sus columnas se generan con
ids `col-0`, `col-1`…—; contactos y movimientos sí. Ninguna pantalla estaba «mal escrita»: el
mecanismo era el que fallaba.

**Resuelto:** la conexión entre columna y contrato se declara (`meta.sortField`), la regla queda
escrita en §18.1 y probada en dos sitios: `data-list.test.tsx` para el mecanismo, y las suites de
listado para el recorrido completo —cabecera → URL → API— en cartera y en pagos y egresos, que
hasta ahora no tenían ninguna prueba de pantalla. De paso cayeron tres cosas que venían del mismo sitio: el control suelto de orden de
la barra de `DataList`, que **ninguna** lista usaba (y con él sus props `search` y `filters`,
también muertas desde que existe `ListToolbar`); las clases por columna de `MasterCrud`, que
nadie leía y dejaban los importes de los maestros alineados a la izquierda; y la negrita por
posición, que destacaba el código en vez del nombre (§18.2).

### 95.16. Los deep links de las notificaciones no llevan a ninguna parte — ⏸️ **puenteado en el cliente; la petición de contrato sigue**

Cada notificación trae un `deepLink` ya compuesto por el backend, y **ninguno de los once
coincide con una ruta de esta aplicación**. No es un despiste puntual: es un vocabulario de rutas
distinto del nuestro, escrito antes de mirar el router.

| Lo que manda el backend | La ruta que existe aquí |
| --- | --- |
| `/cartera/cobros/:id` | `/cartera/cxc/:id` |
| `/cartera?filter=vencidos` | `/cartera/cxc?estado=OVERDUE` |
| `/cartera` | `/cartera/cxc` |
| `/pagos/:id` | `/cartera/pagos/:id` |
| `/gastos/cuentas/:id` | `/gastos/cxp/:id` |
| `/gastos?filter=vencidos` | `/gastos/cxp?estado=OVERDUE` |
| `/gastos` | `/gastos/cxp` |
| `/egresos/:id` | `/gastos/egresos/:id` |
| `/egresos/:id?action=approve` | `/gastos/egresos/:id` (la ficha ya trae aprobar/rechazar, §47.4) |
| `/caja/cuentas/:id` | `/caja/cuentas` — **no hay ficha por cuenta**, es un resumen de saldos (§18.1) |
| `/configuracion/miembros` | `/config/miembros` |

**Se arregla en el backend**, y ahí sigue pedido: el propio backend tiene el sitio correcto para el
cambio, `deep-link.ts`, y su comentario explica por qué los enlaces se componen ahí y no viajan
como dato. Una tabla de traducción en el cliente es una segunda fuente de verdad para las rutas,
que §87.5 declara en un solo sitio.

**Y aun así hay una, porque el 404 era peor.** Pulsar un aviso llevaba a una pantalla que no
existe: eso no es una brecha pendiente, es el centro de notificaciones roto. El puente vive en
`features/notifications/deep-link.ts` (`notificationRoute`) y está escrito para **retirarse solo**:
lo que no reconoce pasa tal cual, así que el día que el backend publique las rutas de arriba
ninguna regla casa, todo sigue funcionando y el archivo se borra de una pieza. Su prueba recorre
los once destinos, y el aviso de ejemplo del centro trae ya el enlace **tal como lo manda el
contrato**, no el que nos vendría bien.

Las claves de los filtros van **en español** y son las de `useListFilters` (§21.1), no `filter=`.

Lo que el puente no puede arreglar es lo que no existe: `/caja/cuentas/:id` cae en el resumen de
saldos porque aquí no hay ficha por cuenta, y `?action=approve` se descarta porque aprobar y
rechazar están en la propia ficha (§47.4).

**Y se traduce en dos sitios, porque se entra por dos.** El centro traduce antes de navegar; el
service worker de Web Push **no puede** —es un script clásico que abre la URL tal cual, sin router
al que preguntar—, así que la ruta llega cruda a la aplicación. Por eso la traducción vuelve a
intentarse en la pantalla de «no encontrada» (§11.1.15): quien aterriza en un destino del contrato
acaba en su ficha, y quien aterriza en cualquier otra cosa ve una pantalla que se lo explica.

### 95.17. El contrato no publica los días de antelación que hay — ⏸️ **abierta, es petición de contrato**

`GET /notifications/preferences` devuelve `supportsLeadDays` y un `leadDays` que ya viene
**resuelto**: los días de la organización menos los que esa persona haya descartado. Lo que no
devuelve es **cuáles hay**.

Con eso, un selector de días solo puede restar. Quien pase de «5 y 1» a «1» no vuelve a ver el 5
por ninguna parte, y encima el front no distingue «los elegí todos» de «no elegí ninguno»: las dos
respuestas son el mismo array. Un control que va en una sola dirección en una pantalla de ajustes
es peor que no tenerlo, así que hoy los días **se leen** («Te avisamos 5 y 1 días antes»).

Se cierra con un campo: los días que ofrece la organización para ese tipo, junto a
`supportsLeadDays`. Con eso el selector es directo — las casillas son ese conjunto y lo marcado es
`leadDays`.

### 95.18. La lista de dispositivos no dice cuál es este — ⏸️ **abierta, es petición de contrato**

`GET /me/push-subscriptions` devuelve `id`, `deviceLabel` y `lastUsedAt`. Sin el `endpoint` no hay
forma de cruzar esa lista con la suscripción que tiene el navegador delante, así que tres filas que
digan «Chrome · Android» son indistinguibles y «dar de baja este» es adivinar.

Hoy se resuelve guardando en el navegador el `id` que devolvió el alta junto a su `endpoint`. Es
suficiente para el caso normal y **se queda corto en los de siempre**: almacenamiento limpio, otro
perfil, una suscripción que el push service rotó. Ahí la fila sigue en la lista hasta el siguiente
envío, que es cuando el backend la borra al recibir un 410.

Se cierra devolviendo el `endpoint` en `PushSubscription` —es del propio usuario— o un `isCurrent`
resuelto en el servidor.

### 95.19. Las listas de dinero traen el id del catálogo, no su icono — ⏸️ **pintado con el cruce que ya había; el campo sigue pedido**

§11.1.3b prometía que, en cuanto los conceptos de cobro y las categorías de gasto tuvieran icono y
color, las listas de cartera y de gastos los pasarían desde la fila. Se cumplió en los dos catálogos
(§11.1.12) y en el contrato de las listas de dinero **no hay de dónde**: `ReceivableBalance`,
`ExpenseBalance`, `BillingAgreement`, `ExpenseSchedule` y los dos de pagos traen `billingConceptId` /
`expenseCategoryId` y nada más.

Se pinta igualmente, **cruzando cada fila contra el catálogo que esas mismas pantallas ya cargaban
para el nombre** (`catalogRowIcon`, §94): son cien registros como mucho, el viaje ya se hacía y no
hay uno nuevo. Lo que sigue abierto no es de rendimiento sino de dónde vive la verdad: una lista que
se pagina en el servidor no debería necesitar un segundo viaje para saber cómo se pinta cada fila, y
un catálogo de más de cien elementos dejaría filas sin icono sin decirlo.

Y en **pagos y egresos** falta además el dato, no solo el adorno: `PaymentListItem` solo trae
concepto cuando el movimiento es directo (`directBillingConceptId`), así que de un pago aplicado a
cartera —que puede saldar cuentas de conceptos distintos— y de un anticipo no se puede decir de qué
concepto son. Ahí la fila dice **qué es** en vez de de qué es: el icono lo pone su propósito
(`PAYMENT_PURPOSE_ICONS` y su espejo), que es lo máximo que el contrato permite y ya distingue una
fila de otra en una lista donde todas eran el mismo billete.

Se cierra devolviendo `conceptIcon` / `conceptColor` —o el objeto entero, como ya se hace con
`payerName`— en las vistas de saldos, en las dos de recurrentes y en las dos de movimientos.

### 95.20. Abrir una ficha borraba los filtros de su lista — ✅ **cerrada**

§21.1 se titula «Filtros que sobreviven a la navegación» y prometía justo eso desde hacía tiempo.
No sobrevivían a la navegación más corta de todas: **abrir una ficha de la propia lista**.

La lista no se desmonta —la ficha es una ruta hija que abre en cajón encima—, y sus criterios se
derivan de la URL en cada render. Pulsar una fila navegaba solo al `pathname`, así que la lista de
detrás se quedaba sin criterios en el mismo momento en que se abría el cajón: las fichas de estado
saltaban a «Todos» y se pedía otra vez la página sin filtrar. Cerrar remataba la faena, porque
`DetailDrawer` volvía también con el `pathname` pelado. Filtrar por «Vencidas», abrir una cuenta y
cerrarla dejaba la cartera entera sin filtrar, y lo mismo en las otras seis listas.

Con el botón «atrás» del navegador no pasaba —la entrada anterior del historial sí llevaba los
criterios—, y por eso el fallo se leía como un capricho: la misma acción con dos resultados según
por dónde se cerrara.

**Resuelto:** se navega con los criterios puestos en las dos direcciones (`useKeepFilters`), y el
regreso lo pone `DetailDrawer` una vez para toda la app — devolviéndolos **solo** cuando vuelve a
su propia lista, que es lo que impide que el «volver» de registrar un pago desde una cuenta lleve
los filtros de una lista a otra. Probado en `detail-drawer.test.tsx` (el cierre) y en las suites de
cartera y de pagos/egresos (la apertura).

### 95.21. Ochenta y cuatro iconos se quedaban cortos — ✅ **cerrada en el contrato**

Una organización que factura almuerzos, rutas escolares y uniformes acababa eligiendo el mismo
`package` tres veces: no había pizza, ni bus escolar, ni camiseta. No se podía resolver en el
cliente —`BillingConceptIcon` es un enum cerrado y una clave que no esté en él es un 422 al
guardar—, así que se pidió al backend con una lista verificada contra `lucide-react`.

**Resuelto de un tirón:** el contrato pasa de 84 a **161 iconos** y de 18 a **22 colores** —la
paleta de Tailwind entera, con `sky`, `stone`, `zinc` y `neutral`—. Los 77 nuevos entran por temas
en el mismo orden del enum, con su nombre en español y sus palabras del negocio, y las cuatro
familias nuevas llevan su variante oscura como las demás.

Y funcionó como estaba pensado que funcionara: al regenerar, `tsc` señaló las 77 claves sin dibujo
y las 4 sin clase, y la prueba de cobertura no dejó pasar ninguna sin tema. Nada se quedó fuera del
selector en silencio, que era justo el riesgo.

### 95.15. Lo que ya cumple

Vale la pena dejarlo escrito para no "arreglarlo":

- Tokens semánticos en los tres bloques (`:root`, `.dark`, `@theme inline`) ✅
- Cero colores hardcoded en componentes ✅
- Cero `any` en el código propio ✅
- `nums` (`tabular-nums`) aplicado a todos los importes ✅
- `prefers-reduced-motion` respetado en todas las animaciones ✅
- Listas: tabla densa en escritorio → tarjetas con jerarquía en móvil (§11.1.3b), desde un solo
  modelo de columnas ✅
- Esqueletos de carga en listas; `NumiLoader` reservado a esperas significativas ✅
- Permisos aplicados en UI por **permiso del contrato** (`useCan`), no por nombre de rol ✅
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
   el `Drawer` detrás de «Secciones» (§11.1.3)— que absorbe las doce pantallas de ajustes. El
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

**El gráfico de flujo se puede ver en línea o en barras**, con el selector sobre él: la pregunta
del Panel es de tendencia, y una línea la responde de un vistazo; las barras están a un toque para
comparar meses concretos. *(Se dibujaba a mano en SVG; hoy lo hace `Chart` sobre Recharts —§57.)*
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

## Fase 7 — Permisos del contrato ✅ **completada**

**Por qué aquí:** el backend dejó de autorizar por nombre de rol (Fase 9 del API), y todo lo que
viene después —planes, consola— se apoya en `/me/capabilities`.

1. `features/platform/`: `useCapabilities` (una llamada al entrar) y `useCan`, el **único** gate
   de la UI, tipado contra el enum generado. → §88.5
2. Los tres predicados de rol de `roles.ts` desaparecen y sus **28 llamadores** piden el permiso
   de su propio endpoint. `canManageOrg` cubría nueve permisos distintos.
3. `AccountDetail` y `SettlementDetail` reciben los predicados **como props**: el permiso es
   distinto en cada cara del espejo (§87.2).
4. Las pruebas que fijaban un rol ahora fijan permisos, que es lo que la pantalla mira.

**Verificación:** typecheck limpio, 0 warnings de lint, 244 tests en verde.

---

## Fase 8 — Los tres estados nuevos ✅ **completada**

1. **Solo lectura como modo** (§45.4): `useCan` apaga toda escritura si la organización no está
   `ACTIVE`, y `ReadOnlyBanner` lo explica una vez en la cabecera de todas las pantallas.
2. **Los dos errores de plan** (§45.5) con cifras y salidas concretas, en un solo sitio:
   `toastApiError` sustituye los 44 `toast.error(getErrorMessage(…))`.
3. `lib/errors.ts` gana los lectores tipados sobre el enum cerrado del contrato.

**Verificación:** typecheck limpio, 0 warnings, 255 tests en verde.

---

## Fase 9 — Plan y consumo ✅ **completada**

`/config/plan`: el plan actual, cuánto llevas de cada tope y el catálogo en venta (§45.6). Es el
destino al que apuntan los dos errores de la fase anterior.

**Verificación:** typecheck limpio, 0 warnings, 260 tests en verde.

---

## Fase 10 — Consola de plataforma ✅ **completada**

`/plataforma`, detrás de `GET /me/platform-access` (§47.1, §47.2): organizaciones con su plan y su
consumo, ficha con condiciones negociadas, cambio de plan, suspensión y edición de planes. De paso
vuelve al pie del sidebar el enlace a «Estado del sistema», que §11.1.1 dejó anotado esperando
justo a esto.

**Verificación:** typecheck limpio, 0 warnings, 271 tests en verde, build OK.

---

## Fase 11 — Roles propios ✅ **completada**

Configuración › Roles y su editor (§47.3), y la asignación en Miembros. Los 57 permisos se
componen de dos tablas pequeñas en vez de nombrarse uno a uno, así que el catálogo puede crecer
sin que nadie se acuerde de esta pantalla.

**Verificación:** typecheck limpio, 0 warnings, 334 tests en verde.

---

## Fase 12 — Aprobación de egresos ✅ **completada**

El umbral en Configuración › Gastos y el aprobar/rechazar en la ficha del egreso (§47.4), por un
slot nuevo de `SettlementDetail` — porque un pago que entra no lo aprueba nadie.

**Verificación:** typecheck limpio, 0 warnings, 341 tests en verde, build OK.

---

## Fase 13 — Centro de notificaciones ✅ **completada**

La campana con su contador y el panel detrás (§11.1.8), enganchados al stream único de la
aplicación (§11.1.9), que ya existía porque el chat lo estrenó.

1. Contrato nuevo copiado y `pnpm api:gen`: 127 paths / 160 operaciones. De paso entran cuatro
   permisos (`notifications.*`, 57 en total) y dos features de plan (`notifications_email`,
   `notifications_whatsapp`) — la prueba de `permission-labels` avisó de los primeros, que es
   justo para lo que está.
2. `features/notifications/`: hooks, traducción de la clave de icono a glifo y tono, campana y
   cajón. Las tres escrituras detrás de `notifications.manage`; la campana, detrás de
   `notifications.read`.
3. `formatRelativeTime` en `lib/format.ts`, y `localDay` sube ahí desde el asistente, que lo tenía
   privado: dos copias del mismo cálculo de fecha eran el duplicado de siempre esperando a
   separarse.
4. La cabecera pasa de dos controles a tres, con la razón escrita en §11.1.1.

**Verificación:** typecheck limpio, 0 warnings de lint, 450 tests en verde (22 nuevos: 16 del
centro —incluido el recorrido campana → panel → API y la trama del stream— y 6 de las dos
funciones de fecha), build OK.

**Lo que queda de esta tanda del backend, y no es deuda del front:** los `deepLink` no coinciden
con el router (95.16, petición de contrato). Y sin construir todavía: preferencias por tipo y
canal, la política de la organización, Web Push, las tramas `resource` del stream, el icono y el
color de conceptos y categorías, el auto-registro de recurrentes y el alta de contraparte por
nombre.

---

## Fase 14 — Preferencias y política de avisos ✅ **completada**

`/config/notificaciones` (§11.1.10): el catálogo entero por categorías, con su interruptor, la
columna de móvil y el detalle que sale en la pantalla de bloqueo.

1. La pantalla se dibuja desde el contrato —tipos, `supportedChannels`, `availableChannels`— y lo
   único escrito a mano es el rótulo de cada aviso, que es el titular con el que va a llegar.
2. `INAPP` no se ofrece como casilla: el motor lo descarta al interrumpir, así que apagarla no
   apagaría nada.
3. Un botón, dos endpoints, y solo viaja lo que cambió — el diff se calcula al enviar.
4. Los días de antelación se leen: el contrato no publica los que hay (95.17).
5. Y su otra mitad, `/config/avisos`: la hora de los recordatorios y los dos umbrales de la
   organización, en Configuración › Organización y detrás de su propio permiso. Las dos pantallas
   se enlazan, que es lo que contesta de dónde salen los días que la primera solo enseña.

**Verificación:** typecheck limpio, 0 warnings de lint, 479 tests en verde (29 nuevos: 12 de las
preferencias, 9 de la política y 8 de las palabras), build OK.

---

## Fase 15 — Web Push ✅ **completada**

Los avisos llegan al teléfono con la aplicación cerrada (§11.1.11).

1. `public/push-sw.js` con las escuchas `push` y `notificationclick`, enganchado por
   `workbox.importScripts` para no tener que pasar la app a `injectManifest`.
2. `pwa/push.ts`: soporte, permiso, la conversión de la clave VAPID y el nombre del aparato, todo
   probado sin montar React.
3. `PushDevices` en la pantalla de preferencias —donde está la columna «Móvil», que sin esto no
   entrega nada— con sus tres callejones explicados: sin clave pública, sin soporte y con el
   permiso denegado.
4. De paso, un fallo del service worker que llevaba tiempo y no se veía: la regla `NetworkOnly` del
   API leía una constante del `vite.config.ts` que Workbox no puede serializar (§40.1).

**Verificación:** typecheck limpio, 0 warnings de lint, 495 tests en verde (16 nuevos: 8 de la
mecánica del navegador y 8 de las decisiones de la pantalla), build OK con `push-sw.js` en el
manifiesto.

---

## Fase 16 — Las listas se refrescan solas ✅ **completada**

`app/resource-stream.ts`: las tramas `resource` del stream, que llegaban desde que existe la
conexión y no las escuchaba nadie (§11.1.9).

1. Cinco recursos, cada uno a sus endpoints por prefijo de URL, más los informes con cualquiera de
   ellos. Ninguna tabla de «qué informe depende de qué», que no está en el contrato.
2. Cada recurso invalida **solo lo suyo**: el fan-out lo hace el servidor, que sabe qué tocó de
   verdad —un pago emite `payments`, `receivables` y `treasury`—.
3. Se monta en el shell, junto al centro de notificaciones, compartiendo la misma conexión.

**Verificación:** typecheck limpio, 0 warnings de lint, 502 tests en verde (7 nuevos sobre el
reparto, incluidos los catálogos que se parecen y el recurso desconocido), build OK.

---

## Fase 17 — La identidad de los catálogos ✅ **completada**

Conceptos de cobro y categorías de gasto con icono, color y orden propios (§11.1.12).

1. `masters/catalogs.ts` traduce los dos enums del contrato —84 iconos y 18 colores entonces; hoy
   161 y 22 (§95.21)— a glifos y a clases, tipado contra el enum generado.
2. `IdentityField` en los dos formularios, con «sin poner» como opción visible en ambos.
3. El icono junto al nombre en la tabla y en la tarjeta; `RowIcon` gana un `className` para poder
   llevar un color que no es ninguno de los cinco tonos semánticos.
4. `position` entra en el orden que ofrecen las dos listas (§18.1) y es su valor por defecto, con
   un cajón propio para cambiarlo. Las **trece** consultas que alimentan un selector piden ese
   orden: uno que solo se ve en su pantalla no sirve de nada.
5. `MasterCrud` gana `rowIcon`, `sortChoices`, `defaultSort` y `actions` — los otros tres maestros
   siguen exactamente igual, y `namedSort` impide que `position` les llegue.

**Verificación:** typecheck limpio, 0 warnings de lint, 515 tests en verde (13 nuevos: la tabla de
catálogos y el recorrido de la pantalla, incluido que ordenar solo escriba lo que se movió),
build OK.

---

## Fase 18 — El auto-registro de un recurrente ✅ **completada**

`AutoChargeSection` en las fichas de acuerdo y de gasto recurrente (§11.1.13).

1. Un componente para las dos caras: lo que cambia son las palabras y el endpoint.
2. Interruptor con confirmación propia, y la cuenta y el método dentro de esa confirmación — la
   unión discriminada del contrato no admite «encendido sin cuenta», y la pantalla tampoco.
3. Cada cara dice lo suyo antes de aceptar: en cartera, que marcar cobrado apaga mora, interés y
   recordatorios; en gastos, que por encima del umbral no paga sino que pide firma.
4. El permiso es el de registrar el movimiento, no el de gestionar el recurrente, y viaja como prop.
5. `DetailSection` gana un `action`, que es lo que deja poner el interruptor junto a su título.

**Verificación:** typecheck limpio, 0 warnings de lint, 521 tests en verde (6 nuevos en una sola
suite para las dos caras, §92.3), build OK.

---

## Fase 19 — Alta de contraparte por nombre ✅ **completada**

Firmar un acuerdo o un gasto recurrente sin pasar antes por contactos (§11.1.14).

1. `ContactPicker` gana la fila de crear, al final de los resultados y solo cuando lo escrito no
   coincide ya con uno.
2. «Exactamente uno de los dos» lo imponen el `refine` de cada formulario y el propio selector: el
   contrato lo pide con un refine que no baja al JSON Schema, así que aquí no hay tipo que ayude.
3. Solo al crear y solo empresas, con la razón dicha en la pantalla en vez de descubierta al
   guardar.

**Verificación:** typecheck limpio, 0 warnings de lint, 526 tests en verde (5 nuevos sobre el
selector, incluido que elegir un contacto borre el nombre escrito), build OK.

---

## Fase 20 — El catálogo se ve en las listas, y un maestro se edita en móvil ✅ **completada**

Tres cosas que se vieron al usar la aplicación en el teléfono, no al leer el contrato.

1. **Editar un maestro por debajo de `lg` era imposible.** El lápiz vivía en una columna
   `hideOnStack`: la tarjeta se pulsaba y no pasaba nada. Ahora abre la fila entera (`onRowClick`)
   y el chevron lo anuncia, como en todas las demás listas (§11.1.3b, regla 4).
2. **El icono salía dos veces en la tarjeta de los dos catálogos**, en la pastilla y pegado al
   nombre; el de la celda pasa a ser `hidden lg:block` (§11.1.12).
3. **Las listas de dinero pintan el icono de su concepto o su categoría** —cartera, cuentas por
   pagar, acuerdos, recurrentes, pagos y egresos— con el cruce contra el catálogo que ya se hacía
   para el nombre (`catalogRowIcon`). En pagos y egresos solo lo tienen los movimientos directos:
   el contrato no dice a qué concepto se aplicó lo demás (§95.19).

De paso, dos duplicados menos: `RecurringList` resuelve el nombre del catálogo una vez en lugar de
hacerlo cada cara en su hook, y `RowIcon.className` **suma** al tono en vez de sustituirlo —así una
categoría sin color elegido no pierde también la pastilla—.

**Verificación:** typecheck limpio, 0 warnings de lint, 541 tests en verde (5 nuevos: el cruce del
icono en sus tres casos y que la fila de un maestro abra su edición con permiso y no sin él),
build OK.

---

## Fase 21 — Que un aviso lleve a alguna parte ✅ **completada**

1. **Pulsar una notificación llevaba a un 404.** Los once `deepLink` que compone el backend usan
   un vocabulario de rutas que no es el del router (§95.16), y eso rompía el centro entero: se leía
   el aviso y se aterrizaba en una pantalla que no existe. `notificationRoute` traduce lo conocido
   y **deja pasar lo demás**, así que el día que el backend publique las rutas de verdad el puente
   deja de tocar nada y se borra. El aviso de ejemplo de la suite trae ya el enlace tal como lo
   manda el contrato: si se hubiera escrito así desde el principio, el 404 no habría llegado a la
   pantalla de nadie.
2. **Y se entra por dos sitios, no por uno.** El service worker de Web Push abre la URL tal cual
   —no tiene router al que preguntar—, así que la aplicación gana por fin su ruta `*`
   (§11.1.15): explica qué pasó con la navegación puesta, y antes de rendirse vuelve a intentar la
   traducción. Sin eso, el aviso del teléfono seguía cayendo en un 404 aunque el centro ya no.
3. **En pagos y egresos el icono ya distingue las filas.** El concepto solo viaja en los
   movimientos directos, así que el resto lo pone su propósito: un abono a cuenta, un anticipo y un
   ingreso directo dejan de ser el mismo billete repetido (§95.19).

**Verificación:** typecheck limpio, 0 warnings de lint, 557 tests en verde (16 nuevos: los once
destinos del contrato, lo que no se reconoce, lo que no es interno, que aterrizar en un destino
crudo acabe en su ficha, y que ningún propósito se quede sin icono en las dos caras), build OK.

---

## Fase 22 — Elegir un icono sin perder el botón de guardar ✅ **completada**

1. **Un diálogo ya no crece más que la pantalla.** Estaba centrado con `translate` y sin alto
   máximo, así que un formulario largo se salía por los dos lados y «Guardar» quedaba fuera de
   alcance en un teléfono. El arreglo es de `DialogContent`, no de cada pantalla (§11.1.3).
2. **El icono y el color se eligen en su propio diálogo** (`IconColorPicker`), con **buscador** y
   los iconos **por temas** (§11.1.12). El formulario se queda con una fila que resume lo elegido.
3. La búsqueda entiende el negocio, no el inglés del contrato: «arriendo» encuentra la casa,
   «nómina» el equipo, «matrícula» el birrete. Y `fold` deja de estar copiado en tres sitios.

Lo que **no** se pudo hacer aquí: más iconos. El enum del contrato tiene 84 y una clave inventada
es un 422 — la petición, con 77 claves ya verificadas contra `lucide-react`, queda en §95.21.

**Verificación:** typecheck limpio, 0 warnings de lint, 572 tests en verde tras juntar con `main`
(8 nuevos aquí: los temas cubren todas las claves sin repetirlas, cada icono y cada color tienen
nombre, la búsqueda por nombre, por palabra del negocio y por tema, y el recorrido de elegir en el
selector), build OK.

---

## Fase 23 — El catálogo de presentación, completo ✅ **completada**

El backend cerró §95.21 de un tirón: **161 iconos y 22 colores**, con las claves nuevas colocadas
dentro de los temas que el enum ya tenía y no al final.

1. `pnpm api:gen` y las tablas de `catalogs.ts` regeneradas desde el enum: glifos, temas, nombres en
   español y palabras del negocio para el buscador —«ruta escolar» encuentra `bus-front`, «vacuna»
   encuentra `syringe`, «lavandería» encuentra `washing-machine`—.
2. Las cuatro familias nuevas (`sky`, `stone`, `zinc`, `neutral`) con su variante oscura, y los
   grises con `-300` como los otros grises: un `-400` en gris oscuro sobre tarjeta se lee mal.
3. **El aviso funcionó.** `tsc` señaló las 77 claves sin dibujo y las 4 sin clase, y la prueba de
   cobertura las 77 sin tema. Ninguna se quedó fuera del selector en silencio, que es exactamente
   lo que §11.1.12 decía que este diseño tenía que garantizar.

**Verificación:** typecheck limpio, 0 warnings de lint, 567 tests en verde —cinco menos: se fueron
con el buscador—, build OK.

Y al verlo en un teléfono con todo dentro salieron cuatro cosas más, arregladas en el mismo sitio:
la rejilla **desbordaba a lo ancho** —celda de tamaño fijo dentro de una columna que reparte el
ancho, §11.1.12—, el **aro de lo seleccionado salía cortado** contra el borde del contenedor que lo
recorta, los once temas seguidos convertían el diálogo en un rollo de papel, y el buscador sobraba
teniendo el tema. Hoy hay un tema a la vez, elegido, y la rejilla vive en un panel con acolchado.
`ambulance` se pasa a Salud: iba entre los vehículos porque así llegó del enum, y ahí no es lo que
alguien busca.
## Fase 24 — Playground de Numi ✅ **completada**

La segunda superficie de plataforma (§47.5): consola con suplantación de rol, traza del turno,
ejecutor de herramientas, comparación de variantes, conjunto de regresión y los paneles de lo que
ya pasó. Nueve rutas bajo `/plataforma/playground`, contra las 18 del contrato — todas usadas.

**La actividad y el historial son dos escalas, no dos pantallas.** El resumen por día dice
**cuánto** pasó; los turnos dicen **qué** pasó, uno a uno. Hacen falta las dos —el pico de p95 de
un martes tiene nombre y apellido— pero separarlas en dos destinos obligaba a saber de antemano en
cuál estaba la respuesta, que es justo lo que no se sabe al venir a mirar. Hoy son pestañas de
`…/vigilar`, con las tres rutas viejas redirigiendo a la suya.

**Y la comparación con el período anterior se pide, no se estima.** `GET /stats` mide una ventana
y solo una, así que «+18 % respecto al anterior» sale de una **segunda llamada** a la misma ruta
con la ventana inmediatamente anterior del mismo tamaño (`ranges.ts`). Sin período anterior —o con
un anterior en cero— no hay porcentaje: se enseña la cifra sola.

Trajo tres cosas que no son suyas y son de todos: el transporte SSE salió de
`features/assistant/stream-chat.ts` a `lib/sse.ts` —lo hablan dos pantallas—, `Chart` aprendió a
graficar cuentas y no solo dinero (§57), y `ChatComposer` acepta `textOnly` para una consola donde
un clip «próximamente» y un micrófono muerto no llevan a ninguna parte.

**Verificación:** typecheck limpio, 0 warnings, 468 tests en verde, build OK. **Sin verificar
contra el backend en el navegador**: la base local no tiene sembrado el usuario demo, así que las
pantallas autenticadas no se pudieron abrir con datos reales.

---

## Fase 25 — Cobranza por WhatsApp ✅ **completada**

El backend cerró las fases 0–3 de cobranza y las verificó contra la API real de Meta; el
contrato pasa a **153 rutas / 205 esquemas** (`contract/HANDOFF-whatsapp-cobranza.md`).

1. `pnpm api:gen`, y **el aviso volvió a funcionar** (§95.21): `tsc` señaló las dos features
   nuevas (`whatsapp_outbound`, `whatsapp_byo`) y el tope `whatsapp_messages_monthly` sin
   nombre, en las tablas de `platform/labels.ts` y en los fixtures de sus pruebas. Ninguno se
   quedó sin traducir en silencio.
2. `features/messaging/`: la política, las plantillas, el historial con su consentimiento y el
   tri-estado del acuerdo (§11.1.16).
3. **Las horas de silencio en su propio módulo con pruebas.** `22:00 → 07:00` es el caso
   normal y cualquier resta ingenua da negativo justo ahí; el módulo lo resuelve sin caso
   aparte.
4. Siete permisos nuevos entran en `permission-labels.ts` con un área propia, **Cobranza**: sin
   eso el editor de roles los habría listado crudos bajo «Otros».
5. `ListToolbar` gana un buscador opcional. El endpoint de mensajes no acepta `q`, y una caja
   que no filtra es la misma promesa incumplida que una cabecera que no ordena (§18.1).

**Lo que no se construyó, por decisión de producto o porque no hay endpoint:** opt-out y
«responde STOP», enviar un mensaje suelto a mano (`messaging.send` no lo usa ninguna ruta),
conectar la cuenta de Meta de la organización (fase 5) y WhatsApp como canal de las
notificaciones internas (fase 4), que es otra cosa: aquel destinatario es un miembro con
cuenta, éste es un deudor.

**Verificación:** typecheck limpio, 0 warnings de lint, 657 tests en verde (32 nuevos: 13 de
la ventana de silencio, 10 de la política, 13 del historial y el consentimiento y 9 del
tri-estado), build OK. **Sin verificar contra el backend en el navegador**: no hay
`nummo-api` corriendo en este entorno.

---

## Fase 26 — Número propio, plantillas y cupo ✅ **completada**

El backend cierra la fase 12 (`nummo_api/HANDOFF-fase-12.md`): el contrato pasa a **160 paths /
226 esquemas** con `/whatsapp/account`, y la cobranza gana cuenta propia de Meta y avisos de
cupo.

1. **`/config/whatsapp`**: conectar, reemplazar y desconectar la cuenta de Meta del negocio.
   No tenerla **no es un error** —se envía por el número de Nummo y se gasta cupo—, el token
   nunca vuelve y desconectar no apaga la cobranza (§11.1.16).
2. **Crear y borrar plantillas propias**, detrás de tener número propio. Los ejemplos que Meta
   pide se derivan del texto (`template-variables.ts`, con pruebas) en vez de escribirse
   aparte.
3. **`QuotaStrip`** en la pantalla de cobranza: el cupo del mes, con `null` como «sin límite» y
   la frase que sustituye a la barra cuando hay número propio y el consumo deja de subir.
4. **La categoría `ACCOUNT`** y sus dos avisos de cuota. La pantalla de preferencias no se
   tocó: agrupa desde el contrato, así que la sección apareció sola al añadir la clave — que
   es exactamente lo que §11.1.10 prometía.
5. `notificationRoute` traduce `/configuracion/plan`, el destino de los dos avisos (§95.16).

**El aviso de tipos volvió a hacer su trabajo**: al regenerar, `tsc` señaló los dos únicos
huecos —la categoría sin rótulo y los dos tipos sin titular— y nada más, lo que de paso
confirmó que el resto de la fase 25 seguía encajando con el contrato nuevo.

**Una errata del backend, anotada y no arreglada desde aquí:** `/whatsapp/account` va etiquetada
con el tag `Assistant`, así que Orval reparte esos tres hooks al archivo del asistente. Se
importan de donde están —el código generado no se edita (§88.2)— y queda pedido al contrato.

**Verificación:** typecheck limpio, 0 warnings de lint, 680 tests en verde (23 nuevos: 10 de
las variables de plantilla, 9 de la pantalla de cuenta y 4 del cupo), build OK. **Sin
verificar contra el backend en el navegador**: no hay `nummo-api` corriendo en este entorno.

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
| ✅ 7 | Permisos del contrato | medio | — (contrato) |
| ✅ 8 | Suspensión y errores de plan | medio | 7 |
| ✅ 9 | Plan y consumo | bajo | 7, 8 |
| ✅ 10 | Consola de plataforma | medio | 7, 9 |
| ✅ 11 | Roles propios de la organización | medio | 7 |
| ✅ 12 | Aprobación de egresos | medio | 7, 9 |
| ✅ 13 | Centro de notificaciones | medio | 7 (contrato) |
| ✅ 14 | Preferencias y política de avisos | bajo | 13 |
| ✅ 15 | Web Push | medio | 14 |
| ✅ 16 | Las listas se refrescan solas | bajo | 13 |
| ✅ 17 | La identidad de los catálogos | medio | — (contrato) |
| ✅ 18 | El auto-registro de un recurrente | medio | 17 |
| ✅ 19 | Alta de contraparte por nombre | bajo | — (contrato) |
| ✅ 20 | El catálogo en las listas y la edición en móvil | bajo | 17 |
| ✅ 21 | Que un aviso lleve a alguna parte | bajo | 13 |
| ✅ 22 | Elegir un icono sin perder el botón de guardar | bajo | 17 |
| ✅ 23 | El catálogo de presentación, completo | bajo | 22 (contrato) |
| ✅ 24 | Playground de Numi | medio | 7, 10 |
| ✅ 25 | Cobranza por WhatsApp | medio | 7, 9 (contrato) |
| ✅ 26 | Número propio, plantillas y cupo | medio | 25 (contrato) |
| ✅ 24 | Playground de Numi (plataforma) | medio-alto | 10 (contrato) |

**Regla de oro del plan:** una fase por rama y por revisión. Nada de rediseñar cuatro
secciones a la vez — el documento existe precisamente para que no haga falta.

---

# 97. La página pública

La portada (`/`) es la primera superficie de Nummo que alguien ve **sin cuenta**: vende, mide de
dónde viene cada visita y deja que Numi conteste preguntas de preventa. El contrato que la
sostiene está en `contract/HANDOFF-landing.md`; esta sección es lo que la portada cambia **de
este documento**.

## 97.1. Por qué esta sección existe: una consola no es una portada

Todo lo escrito hasta aquí describe la **consola** — una herramienta que alguien abre veinte
veces al día para trabajar. Una portada es otro medio: se lee una vez, de arriba abajo, y quien
la lee todavía no sabe qué es esto. Tres reglas del documento chocan de frente con eso, y la
salida es **acotarlas, no derogarlas**: siguen valiendo enteras dentro de la consola.

| Regla | Qué dice | Qué vale en la portada |
| --- | --- | --- |
| §3.1 Colores de marca | El azul `#2563EB` y el gradiente del isotipo, «no reemplazarlos arbitrariamente» | La portada lleva **su propia paleta**, elegida en el laboratorio (§97.2). El isotipo (`--logo-*`) no se re-tematiza en ninguna de las dos: es la marca |
| §11.1 (3) Versalitas | Prohibidas las micro-etiquetas en mayúsculas con `letter-spacing` | Se permite **una por sección**, y solo como rótulo que orienta la lectura. Dos en una sección vuelve a ser el vicio que §11.1 describe |
| §11.1 (2) Icono en pastilla | Prohibido el icono dentro del cuadradito tintado | Se permite en **pasos numerados**, donde la superficie es lo que sostiene la secuencia. No se extiende a tarjetas ni a features |

Las dos de §11.1 salieron de criticar el Panel y **ahí siguen valiendo**: en una consola las
versalitas gritan y la pastilla es relleno. En una portada la etiqueta orienta y el icono con
superficie sostiene un paso.

## 97.2. La paleta se decide mirando, no en un mockup

Una paleta que enamora en un hero puede ser ilegible en una tabla de cifras, y **eso solo se ve
mirándola ahí**. Por eso existe `/laboratorio`: cada candidata se pinta sobre el hero real *y*
sobre superficies de consola de verdad —KPIs, tabla, badges, botones, campos, burbuja de Numi—,
en claro y en oscuro **a la vez**, con la lectura de contraste al pie.

Es una herramienta de desarrollo: la ruta solo se registra bajo `import.meta.env.DEV`, va fuera
de `ProtectedRoute` y fuera de `AppShell` —como `/login`—, y no entra al bundle de producción.

**La capa de paletas** (`src/lib/palette/`) es lo que lo hace posible. Una candidata son **19
ranuras crudas por modo**, no las ~77 declaraciones de `index.css`: superficie (`surface`,
`raised`, `sunken`, `line`), tinta (`ink`, `inkMuted`, `onFilled`), marca (`accent`,
`accentDeep`, `accentLink`, `accentSoft`), estado (`positive`/`positiveText`,
`caution`/`cautionText`, `danger`/`dangerText`) y shell (`shell`, `shellRaised`). De ahí sale el
juego completo de tokens, así que **el test y lo que se pinta no pueden divergir**.

Tres decisiones dentro de la capa que conviene no volver a discutir:

1. **La tinta de un relleno se elige, no se fija** — y **no maximizando contraste**. Sobre el
   azul del sidebar la tinta oscura contrasta más que la blanca y aun así va blanca: un botón
   primario con letra negra no se lee como un botón primario. La regla es preferir la clara y
   bajar a la oscura solo cuando el relleno no la sostiene (corte en 3:1), que es justo lo que
   separa el azul y el rojo del teal y el ámbar.
2. **`--logo-*` y `--chart-*` quedan fuera de las ranuras.** El isotipo porque es la marca; las
   series porque su orden es una decisión razonada (el ámbar es la 4ª para separar egresos de
   ingresos) y re-derivarla toca cuando haya paleta elegida.
3. **Las candidatas se aplican con custom properties en línea.** Los estilos en línea ganan a
   `.dark`, pero **solo en los tokens que se emitan**: uno que falte cae al valor de la app y la
   muestra miente en silencio. `tokens.test.ts` compara la lista emitida contra la declarada en
   `index.css` y exige que no falte ninguno.

## 97.3. Un rojo no puede hacer dos trabajos

Escribiendo el test de contraste salió una brecha que llevaba tiempo abierta y que **no es de la
portada, es de la consola**.

`--success-strong` y `--warning-strong` existen porque el teal y el ámbar de relleno no se leen
como texto (§3.2). Al rojo nunca se le aplicó el mismo razonamiento, y en **modo oscuro** no hay
un solo valor que sirva para las dos cosas:

- para que el blanco encima pase AA hace falta luminancia **≤ 0.183**;
- para leerse como texto sobre el fondo oscuro hace falta **≥ 0.209**.

No hay solape. No es cuestión de afinar el tono. Por eso entra **`--destructive-strong`**, y por
eso el botón «Eliminar» de la consola en oscuro se queda hoy en **3.76:1** — está anotado como
deuda conocida en `palettes.test.ts`, con un test que obliga a borrar la excepción el día que se
arregle. Los 51 `text-destructive` que hay en `src/` siguen apuntando a `--destructive`:
migrarlos es trabajo aparte.

## 97.4. El contraste es una compuerta, no una revisión

`src/lib/palette/palettes.test.ts` recorre **cada candidata × cada modo** y falla si algún par
baja de su mínimo: 4.5:1 para texto, 3:1 para el anillo de foco. Una candidata que no pasa **no
se presenta a decisión**.

**`--border` no está en la tabla, y es deliberado.** La 1.4.11 pide 3:1 para lo que identifica un
*control*, no para el filo entre una tarjeta y su fondo: el borde de hoy da 1.18:1 y es un borde
perfectamente normal. Exigirle 3:1 obligaría a una línea dura que ningún sistema usa para esto.
Si un borde se vuelve invisible, eso se ve en el laboratorio.

## 97.5. Tipografía

La portada añade una **serif para los destacados** del titular —`@fontsource/instrument-serif`,
estática, regular e itálica— y la grotesca de los titulares se decide en el laboratorio entre
Sora (la de la consola, como control), Archivo y Bricolage Grotesque. Las dos últimas traen eje
de ancho, así que **«apretada» se pide con `font-stretch`, no cambiando de familia**.

Cuidado con un detalle que cuesta media hora descubrir: `index.css` declara las fuentes en un
bloque **`@theme inline`**, y lo que hace `inline` es meter el valor *dentro* de la utilidad en
vez de emitir `var(--font-display)`. Pisar `--font-display` en un ancestro **no cambia nada**;
hay que aplicar `font-family` como declaración propia.

Las tres familias se importan **dentro de la ruta del laboratorio**, no en `index.css`: así viven
en su propio trozo y no las descarga quien entra a la consola. Cuando se elija una, esa —y solo
esa— sube a la entrada de la portada.

## 97.6. El titular a dos tonos, y por qué tiene su propio token

El gesto que la portada repite en cinco secciones: **primera línea en tinta, segunda en un
tono apagado**, y a veces una palabra suelta en serif cursiva. Vive en `SectionHeading`, una
vez y no cinco.

La segunda línea usa **`--heading-muted`**, no `--muted-foreground`, y la diferencia no es
cosmética: son dos umbrales distintos. `--muted-foreground` se lee como **cuerpo** y vive en
4.5:1; `--heading-muted` es **siempre** texto grande —48 px para arriba— y vive en 3:1.
Usarlo para un párrafo deja el párrafo por debajo de AA; usar el otro para el titular lo
apaga de más.

Al valor que traen los mockups (~`#8fa396`) la salvia da **2.4:1** sobre el crema y **2.1:1**
sobre la banda salvia — por debajo incluso del 3:1 de texto grande. Oscurecida a `#63796c`
queda en 4.15 y 3.68. Su par de contraste mide contra **las dos** superficies claras, porque
el gesto aparece sobre las dos.

## 97.7. Las señales

Van **por lotes**, con intervalo y `navigator.sendBeacon` en `pagehide` — no evento a
evento: un observador de scroll sobre diez secciones genera decenas en un solo
desplazamiento.

Tres reglas del contrato que quedan cumplidas **por construcción** y no por disciplina:

1. **El catálogo es cerrado.** `LandingEventInput` llega de Orval como unión discriminada,
   así que un nombre inventado **no compila**. Un nombre fuera del catálogo tumba el lote
   entero con 422, y esto es la diferencia entre enterarse al escribir y en producción.
2. **`accepted: 0` no es un error** y no se reintenta. Es lo que responde el servidor cuando
   ya había visto el lote; la deduplicación es suya, por sesión.
3. **Un lote se corta en 20.** El de más no es «uno de más»: es un 422 que se lleva por
   delante los veinte buenos.

Y una que no es del contrato: **la analítica nunca rompe la página.** Todo falla en
silencio — incluida la cola, que atrapa ella misma en vez de confiar en el transporte
(`void promesa` no atrapa un rechazo, y de ahí al informe de errores de la página).

**`numi_asked` existe en el catálogo pero el cliente no puede emitirlo**: lo escribe el
endpoint que contesta.

> **Pendiente con el backend** (issue #2 de `nummo_api`): el catálogo se fijó antes de que
> la página existiera y dos nombres no calzan. Sobra `integrations` —no hay sección de
> integraciones ni está prevista— y falta el de «El desorden cuesta», que es la sección
> justo después del hero. Hasta que se cambie, esa sección va sin señal: mejor un hueco que
> un nombre que miente.

## 97.8. Las rutas públicas no piden CSRF

`customFetch` pide token en toda mutación, y `ensureCsrfToken()` **no lee una cookie: hace
una petición** a `/api/v1/auth/csrf`. Sin guard, la primera señal de cada visitante
disparaba una llamada a un endpoint de **auth** desde una página sin sesión.

Las rutas `/api/v1/public/*` están exentas: no autorizan nada y el contrato no lo pide. La
portada hace exactamente una petición al cargar.

## 97.9. Los datos de la portada, sin TanStack Query

La consola usa Query y hace bien: decenas de lecturas que se invalidan entre sí. La portada
tiene **una** —los precios— y no invalida nada.

Orval genera, al lado de cada hook, la **función plana** que el hook envuelve. La portada se
apoya en esa función a través de `useRecursoPublico`: el tipo sigue saliendo del contrato y
lo único que se pierde es la caché, que aquí sobra — el backend manda
`Cache-Control: public, max-age=300` y el navegador la respeta mejor que nosotros.

Las cuatro trampas de precios, que ninguna se ve sin backend y por eso están todas en tests:

| Llega | Significa | NO significa |
| --- | --- | --- |
| `price: null` | «A consultar» | Gratis, ni cero |
| `price: "0.00"` | Gratis | — |
| `value: null` en un tope | Sin límite | — |
| `value: 0` en un tope | Un tope real (WhatsApp en el gratis) | Sin límite |
| Una clave ausente en un plan | «No se sabe» | «No lo tiene» |

Y de Numi de preventa: **quedarse sin cuota no es un error.** Llega `200` con
`exhausted: true`, y el sitio de la caja de texto **lo ocupa el registro**, no un aviso. Son
seis preguntas por visitante y no se renuevan: el tope *es* el empujón. Con el asistente
apagado —como está en desarrollo por defecto— responde igual, así que ese es el primer
estado que se ve y está diseñado.

## 97.10. El movimiento: un gesto por sección, y sin librería

Cada sección tiene **un** gesto y solo uno: la cinta se desplaza, las tarjetas del desorden
flotan, la línea del área se dibuja, los pasos se encienden en secuencia, la elipse del
cierre se traza. Nada de eso necesita `motion` (~34 kB gzip) en la página donde el peso se
paga en tasa de rebote: es `IntersectionObserver` + CSS.

El mecanismo es uno para todas. `useReveal` pone **`data-revelado`** en el elemento que
observa, y el CSS revela lo que lleve `data-revelar`. **Las dos formas del selector hacen
falta**, y por una razón que costó una tarde encontrar:

```css
[data-revelado][data-revelar],   /* observa y se revela el mismo elemento */
[data-revelado] [data-revelar]   /* observa un contenedor, se revelan sus hijos */
```

Con solo la primera, seis secciones se quedaban en **opacidad 0**: presentes en el DOM,
encontrables por los tests, y **invisibles** en pantalla. Un fallo que ningún test de
componente ve, porque el elemento está ahí.

Y su gemelo: `[data-revelar]` **arranca** en opacidad 0, así que en
`prefers-reduced-motion` no basta con quitar la animación — eso dejaría la portada en
blanco para quien pidió menos movimiento. Se muestra todo, quieto.

**El gráfico va en SVG a mano, no en Recharts.** Son ~115 kB gzip (§63) y aquí no hace
falta ninguna de las cosas que justifican ese peso: no hay datos de verdad, ni ejes que
calcular, ni interacción. Es una ilustración de lo que la consola enseña.

Dos avisos sobre las superficies oscuras de la portada (la cinta, «Del movimiento a la
acción», el panel de Numi): sus tintas salen de `--sidebar-*`, que va oscuro en los dos
modos por definición (§3.2). Y **`--success-strong` no vale ahí**: es el tono pensado para
leerse sobre claro, y sobre el shell desaparece — encima de oscuro va el de relleno, que es
el claro.


## 97.11. Dos entradas, un repo

`index.html` es **la portada** y `app.html` **la consola**, que vive bajo `/app` con
`basename: '/app'` en su router.

No pueden compartir router: el `basename` hace que ese router **solo atienda `/app/…`**. A
cambio, las rutas de dentro se siguen escribiendo igual —`/cartera/cxc`, no
`/app/cartera/cxc`—, así que los 55 enlaces internos no cambiaron ni uno.

Lo que sí cambia son los enlaces que van **de la portada a la app**: esos no pasan por
ningún router y son anclas de verdad. Viven en `marketing/links.ts`, en un solo sitio.
Estuvieron repartidos en cinco archivos durante la Fase 2 y después de la mudanza apuntaban
a ninguna parte — la próxima mudanza es una línea.

`appType: 'mpa'` apaga el fallback de página única de Vite, que devolvía la portada para
cualquier ruta desconocida de la app.

> **Al desplegar:** el hosting tiene que servir `app.html` para `/app` y `/app/*`. En dev y
> en `preview` lo hace un middleware de `vite.config.ts`; en producción es configuración del
> servidor, y sin ella la consola da 404 en cualquier recarga.

### El service worker es de la app, no del sitio

`id`, `start_url` y `scope` van a **`/app/`**, y la portada queda **fuera del precache**
(`globIgnores: ['index.html', 'assets/portada-*']`).

Con `scope: '/'` la portada caía dentro, y una portada precacheada **sirve el precio viejo
después de cambiarlo** — justo en la página que publica la tarifa.

Un worker servido desde `/sw.js` puede **estrecharse** a `/app/` sin ninguna cabecera
especial; lo que necesitaría `Service-Worker-Allowed` es lo contrario, ampliar.

Se comprueba en `pnpm preview`, que es la única forma de probarlo de verdad: el worker
registra en `/app/`, controla la app, y `navigator.serviceWorker.controller` es `null` en la
portada.

## 97.12. La portada se lee sin ejecutar JavaScript

`pnpm build` renderiza la portada a texto y la incrusta en `dist/index.html`:

```
tsc -b && vite build && pnpm build:ssr && node scripts/prerender.mjs
```

Sin esto, ahí hay un `<div>` vacío. Google acaba ejecutando el JavaScript, pero **WhatsApp,
Slack, Twitter y cualquier previsualización de enlace no lo ejecutan**: verían una página en
blanco donde debería estar el titular.

Con `renderToString` y **no** con un navegador sin cabeza. Un navegador daría lo mismo, pero
ataría `pnpm build` a tener Chromium instalado, y un build que necesita un navegador se
rompe en el primer contenedor que no lo trae.

**No se hidrata, a propósito.** Hidratar obligaría a que el primer render del cliente
coincidiera con el del servidor byte a byte, y el cliente sabe cosas que Node no —si el
sistema pide oscuro, sobre todo—. Sería una discrepancia garantizada a cambio de nada: este
HTML está para quien lee sin ejecutar.

### Esconder es la mejora, no el punto de partida

El prerender destapó un fallo que llevaba desde la Fase 2: `[data-revelar]` arranca en
opacidad 0 y quien pone `data-revelado` es JavaScript. Sin él —quien navega sin JavaScript,
y el HTML que leen las previsualizaciones— la portada salía **con el medio invisible**.

Ahora esconder depende de que **haya** JavaScript: un script en línea en el `<head>` pone
`.con-js` antes de pintar, y la regla que esconde cuelga de esa clase. En línea y no en el
módulo, porque un `<script type="module">` es diferido y para entonces ya se pintó.

> Se comprueba con el navegador y **JavaScript desactivado**: las diez secciones visibles,
> el titular en su `h1` y el CTA apuntando a `/app/register`. Los precios salen en esqueleto,
> que es lo correcto — esa lectura vive en un efecto.

## 97.13. Consentimiento antes que Clarity

**Por defecto no se carga nada.** Clarity entra **solo** con un sí explícito, y hasta
entonces no existe en la página — comprobado contando peticiones a otros dominios: cero
antes de aceptar.

**Lo que no depende del sí**, y es la mitad importante: la medición propia. Las señales de
`/public/signals` son de primera parte, no identifican a nadie y no salen del dominio; y la
atribución que de verdad decide —qué campaña trajo un registro— la escribe el servidor en
una cookie `HttpOnly` que el front ni lee. Decir «no» no nos deja ciegos en lo que importa,
y por eso el aviso puede permitirse ser honesto en vez de insistente: **las dos opciones
pesan lo mismo**.

**Sin `VITE_CLARITY_ID` configurado no se pregunta nada.** Un banner de cookies en una
página que no pone cookies de terceros es teatro: molesta, entrena a la gente a aceptar sin
leer y no protege nada.

El aviso decide **después de montar**, no durante el render: si no, acabaría incrustado en
el HTML prerenderizado, y esa decisión es de cada visitante.

## 97.14. El botón que queremos que pulsen tiene su propio color

`--cta` **no es `--primary`**, y la diferencia no es de nombre. `--primary` es «el color de
acción de este sistema» —el que la consola usa en todos sus botones y que ahí no puede
moverse—; `--cta` es «con qué se pinta el botón que queremos que pulsen en la portada», y
la respuesta cambia por paleta: en la de marca es el azul profundo casi negro (`#0F172A`,
el `--nummo-dark` de §3.1), y en la de los mockups es el durazno.

**Y cambia con el modo**, que es lo que obliga a que sea una ranura de la paleta y no una
regla derivada: un navy sobre una página clara resalta, y ese mismo navy sobre una página
oscura es un botón invisible. Cada candidata declara qué usa en cada modo — `azul` pasa al
azul de acción en oscuro.

La tinta de encima **no se declara nunca**: la elige `inkOnFill`. Sale blanca sobre el navy
y oscura sobre el durazno, donde el blanco daría 1.9:1.

> El mismo error aparece en cualquier superficie que use el tono del shell, que es oscuro en
> **los dos** modos: sobre una página clara resalta sola y sobre una oscura se funde. El
> aviso de Numi del hero lleva un `ring` por eso — el borde es lo que le devuelve el filo.

### El suelo de visibilidad del botón no es AA

`palettes.test.ts` comprueba que `--cta` se distingue del fondo, **con un mínimo de 1.5 que
no sale de la norma**. La 1.4.11 pide 3:1 al contorno que hace falta para *identificar* un
control, no al relleno de un botón que ya se identifica por su forma y su texto: exigirle
3:1 tumbaría el durazno de los mockups sobre el crema, que da 1.71:1 y se ve perfectamente.

La razón de contraste solo mide **luminancia** y no sabe nada del salto de tono. Lo que hay
que atrapar es el caso real —un navy sobre página oscura, 1.15:1— y el suelo se pone entre
los dos.

## 97.15. El tema lo elige quien visita

La portada lleva el **mismo `ThemeToggle` que la consola**, leyendo el mismo store. Es una
preferencia de la persona, no de la página: quien tiene la app en oscuro no espera que la
portada le dé un fogonazo blanco, ni al revés.

Es distinto del `?modo=` de desarrollo (§97.2), que fuerza un modo para mirar sin tocar el
tema del sistema y **no llega a producción**. Este sí, y va en la barra.

La paleta por defecto de la portada es **`azul`**, la de marca. Se cambia en una línea:
`PALETA_PORTADA`, en `marketing/theme.ts`.

## 97.16. La tarjeta de un plan, y las dos reglas que acota

La tarjeta vive en `components/plan-card.tsx` y **la comparten la portada y «Plan y consumo»
de la consola**. Se parecían tanto que copiarla era lo más rápido, y en dos semanas habrían
contado historias distintas sobre los mismos planes.

Las ilustraciones (`plan-art.tsx`) son geométricas y de marca: los colores salen de
`--logo-*`, los cuatro del isotipo, que **no se re-tematizan** (§3.2) — así se ven igual en
claro y en oscuro. Los grises sí siguen al tema. Los `id` de los degradados se generan con
`useId` porque son globales al documento: dos tarjetas con el mismo `id` harían que la
segunda pintara con el degradado de la primera.

**El movimiento va en clases, no en `style` en línea.** Un estilo en línea no se puede
apagar desde `prefers-reduced-motion` sin JavaScript. Y sin movimiento el trazo tiene que
quedar **dibujado**, no a medias: `plan-art-draw` arranca con el camino oculto, así que
quitarle la animación a secas dejaría la ilustración incompleta.

### Dos acotaciones, dichas y no calladas

1. **El icono del tope va en pastilla tintada**, que es lo que §11.1 (2) llama «el patrón de
   plantilla por excelencia» y que la consola respetaba hasta ahora — su propio comentario
   decía «al tamaño del texto y sin pastilla detrás». Entra porque el diseño aprobado lo
   pide y porque aquí no es *cada fila de una lista*: son cinco filas dentro de una tarjeta
   que ya es un objeto cerrado. Queda escrito para poder revertirlo si se decide que no.
2. **El «Recomendado» solo va en la portada.** El API no publica esa señal, así que ponerla
   dentro de la consola sería escribir una decisión de precio en el front (§70). En una
   portada elegir a qué plan se empuja es marketing. Se destaca **el último**, el más capaz:
   destacar el del medio ponía la insignia sobre el único plan sin tarifa publicada.

### En la consola el catálogo se abre, no se incrusta

En escritorio, «Plan y consumo» ofrece **«Ver planes»** y el catálogo sale en un diálogo
ancho. Incrustadas en el panel las tres tarjetas se quedaban en unos 300 px y todo se partía
en dos líneas — los nombres de los topes truncados, el precio en dos renglones.

En móvil van **apiladas y a la vista**: ahí el problema del ancho no existe, y un modal
ocuparía la pantalla entera para enseñar lo mismo añadiendo un paso.

Pedir un plan desde el catálogo **cierra el catálogo antes de abrir la consulta**: dos
diálogos apilados dejan al segundo bajo el velo del primero y `esc` cierra el equivocado.

> **Lo que no se hizo:** el conmutador **Mensual / Anual** de la referencia. El contrato
> tiene un solo importe por plan —no hay precio anual en ninguna parte— así que ese
> conmutador sería decoración que no cambia nada, o peor, insinuaría una tarifa que nadie ha
> fijado.
