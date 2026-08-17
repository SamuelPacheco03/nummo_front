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

Ejemplo conceptual:

```css
--background
--surface
--surface-subtle
--foreground
--muted-foreground
--border
--primary
--primary-foreground
--accent
--success
--warning
--danger
```

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

Base recomendada:

```css
--background: #F8FAFC;
--surface: #FFFFFF;
--surface-subtle: #F1F5F9;

--foreground: #0F172A;
--muted-foreground: #475569;

--border: #E2E8F0;

--primary: #2563EB;
--secondary: #4F46E5;
--accent: #14B8A6;
--accent-secondary: #22C7D6;
```

El fondo general debe ser ligeramente diferente al fondo de cards/paneles.

Evitar páginas completamente blancas sin separación visual.

---

# 5. Tema oscuro

Base oficial:

```css
--background: #0B1220;
--surface: #111827;
--surface-subtle: #0F172A;

--foreground: #F8FAFC;
--muted-foreground: #94A3B8;

--border: #1F2937;

--primary: #3B82F6;
--secondary: #6366F1;
--accent: #2DD4BF;
--accent-secondary: #22D3EE;
```

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
$820 mil
```

pero solo cuando la reducción ayude a leer la interfaz.

Nunca perder precisión en:

- formularios;
- movimientos;
- comprobantes;
- detalles;
- confirmaciones;
- tablas contables.

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

## Cards principales

```text
14–18 px
```

## Inputs

```text
10–12 px
```

## Botones

```text
10–12 px
```

## Chips

```text
999 px
```

## Paneles especiales de Numi

```text
14–18 px
```

No usar `border-radius: 24px` en todo.

No convertir la interfaz en una colección de píldoras.

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
`api/`. `components/` y `lib/` **nunca** importan de `features/`. Un componente compartido
que necesita saber de un dominio está mal ubicado.

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
- **Patrón de detalle sobre lista:** cuando el detalle debe abrirse en cajón sin perder la
  lista de fondo, la ruta de detalle se declara **hija** de la de lista y la lista renderiza
  su `<Outlet />` dentro de un `DetailDrawer`. Así se conservan filtros y scroll (sección 78).

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

| Propuesto (§64) | En el código hoy | Ruta |
| --- | --- | --- |
| `PageHeader` | ✅ `PageHeader` | `components/page-header.tsx` |
| `MetricCard` | ✅ `KpiTile` | `components/kpi-tile.tsx` |
| `StatusBadge` | ⚠️ `StatusDot` + 4 copias por feature | `components/ui/status-dot.tsx` (+ brecha 95.9) |
| `Money` | ❌ no existe como componente | función `formatAmount` en `lib/format.ts` |
| `DateDisplay` | ❌ no existe como componente | función `formatDateHuman` en `lib/format.ts` |
| `DataTable` | ✅ `DataList` (tabla + tarjetas apiladas) | `components/ui/data-list.tsx` |
| `EmptyState` | ❌ no existe | texto suelto en cada pantalla (brecha 95.4) |
| `NumiLoader` | ✅ `NumiLoader` | `components/ui/loader.tsx` |
| `NumiInlineLoader` | ✅ `NumiLoader compact` / `Loader` | `components/ui/loader.tsx` |
| `NumiPanel` | ✅ `NumiPanel` + `NumiWidget` | `features/assistant/` |
| `ConfirmOperation` | ✅ `ConfirmDialog` | `components/ui/confirm-dialog.tsx` |
| `AccountCard` | ❌ no existe | lista inline en `features/finances/accounts-page.tsx` |
| `QuickAction` | ❌ no existe | — (brecha 95.3) |

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
| `DetailDrawer` | `components/ui/detail-drawer.tsx` | Cajón de detalle (abajo en móvil, derecha en ≥sm) |
| `Sheet` · `Dialog` · `Popover` · `DropdownMenu` | `components/ui/` | Primitivas Radix |
| `Field` · `Label` · `Input` · `Textarea` · `NativeSelect` | `components/ui/` | Formularios |
| `SegmentedControl` | `components/ui/segmented-control.tsx` | Alternador de pocas opciones |
| `InfoHint` | `components/ui/info-hint.tsx` | Ayuda contextual breve |
| `Skeleton` | `components/ui/skeleton.tsx` | Esqueletos de carga |
| `MasterCrud` | `features/masters/master-crud.tsx` | CRUD genérico de maestros |

---

# 95. Auditoría: brechas entre este documento y el código

Estado a la fecha de esta revisión. **Cada línea se cierra o se reclasifica; ninguna se
ignora.** La columna "Resolución" dice quién gana: el documento o el código.

### 95.1. Navegación desktop — **alta**

El documento (§14) propone una navegación por modelo mental: `Inicio · Cartera · Ingresos ·
Gastos · Contactos · Cuentas · Análisis · Numi · Configuración`.

El sidebar real tiene **7 grupos y 21 enlaces**, e incluye un grupo **"Maestros"** que expone
entidades del backend (Conceptos de cobro, Categorías de gasto, Métodos de pago, Cuentas) —
justamente lo que §14 prohíbe. "Políticas de interés" también está en primer nivel.

**Resolución: gana el documento.** Maestros y Políticas de interés son configuración, no
operación diaria: deben vivir bajo Configuración. Ver fase 2 del plan.

### 95.2. Navegación mobile — **alta**

El documento (§15) pide bottom navigation con acción central "Nuevo".
El código usa un `Sheet` lateral con el sidebar completo: 21 enlaces en un cajón, y ninguna
acción rápida de creación.

**Resolución: gana el documento.** Ver fase 3.

### 95.3. Dashboard — **alta**

El documento (§16) pide: resumen financiero → acciones rápidas → flujo de caja → necesita tu
atención → insight de Numi → actividad reciente.

El código muestra **9 KPIs en 3 grupos** (Realizado / Pendiente / Esperado) y **10 paneles**,
sin acciones rápidas, sin bloque de "necesita tu atención" y sin insight de Numi. §77 prohíbe
explícitamente "dashboards con 20 KPIs".

**Resolución: gana el documento**, conservando la idea buena del código (las tres lentes
Realizado/Pendiente/Esperado) pero reducida y con jerarquía. Ver fase 4.

### 95.4. Estados vacíos — **alta**

El documento (§27, §75) pide un empty state que explique la funcionalidad y ofrezca el
siguiente paso. El código muestra frases sueltas: `"Sin datos."`, `"No hay pagos con estos
filtros."`, `"Sin cuentas."` — sin componente compartido y sin CTA.

**Resolución: gana el documento.** Crear `EmptyState` y distinguir dos casos: *sin datos
todavía* (explica + CTA) vs *sin resultados para el filtro* (ofrece limpiar filtros).
Ver fase 1.

### 95.5. Formato monetario — **media-alta**

El documento (§9) pide `$350.000`. `formatAmount` produce `COP 350.000,00`: prefijo ISO y
siempre dos decimales, también en listados y KPIs.

**Resolución: gana el documento, con matiz.** Símbolo `$` y sin decimales en listados, KPIs y
gráficas; **precisión completa** en formularios, comprobantes, detalles y confirmaciones
(§9 lo exige). Requiere separar `formatAmount` (preciso) de `formatMoney` (de lectura) en
`lib/format.ts`. Ver fase 1.

### 95.6. Radios — **media**

El documento (§11) pide 14–18px en cards y 10–12px en inputs y botones.
El código usa `--radius: 0.5rem` → cards a 8px, con el comentario explícito *"consola densa:
esquinas nítidas, superficies planas"*.

**Resolución: gana el código, se corrige el documento.** Una consola financiera densa se lee
mejor con esquinas contenidas; 16px en cada card la infantiliza. La escala oficial pasa a ser
**cards 8–12px · inputs y botones 6–8px · chips 999px**. Actualizar §11 al cerrar la fase 1.

### 95.7. Escala tipográfica — **media**

§8 pide títulos de página de 28–32px en escritorio; `PageHeader` usa `text-xl sm:text-2xl`
(20/24px).

**Resolución: punto medio.** Subir a `text-2xl lg:text-3xl` (24/30px) mantiene la jerarquía
que pide el documento sin romper la densidad. Ver fase 1.

### 95.8. Command bar global — **media**

§36 describe una barra superior universal ("Buscar o preguntarle algo a Numi…").
En escritorio **no existe header**: el `<header>` del shell es `lg:hidden`. No hay búsqueda
global ni entrada de acciones.

**Resolución: gana el documento**, pero es la pieza más cara: se hace al final. Ver fase 6.

### 95.9. `StatusPill` duplicado — **media-alta (deuda de clean code)**

Hay **cuatro** implementaciones casi idénticas del mismo indicador de estado:

- `StatusPill` en `features/receivables/receivables-list-page.tsx`
- `ExpenseStatusPill` en `features/expenses/expenses-list-page.tsx`
- `ScheduleStatusPill` en `features/expenses/schedules-list-page.tsx`
- `StatusChip` en `features/expenses/disbursements-list-page.tsx`

Peor: las páginas de **detalle importan el pill desde la página de lista**
(`import { StatusPill } from './receivables-list-page'`), lo que acopla dos pantallas y
arrastra la lista entera al bundle del detalle. Además `TONE_DOT` está duplicado en
`features/receivables/labels.ts` y `features/expenses/labels.ts`.

**Resolución: refactor.** Un único `StatusBadge` en `components/ui/`, que recibe `tone` y
`label`; `StatusTone` y `TONE_DOT` suben a `lib/` o a `components/ui/`. Ver fase 1.

### 95.10. Estado de error sin componente — **media**

§45 exige estado de error en toda pantalla. Existe, pero como **bloque rojo copiado en 15
archivos** (`border-destructive/40 bg-destructive/5 …`).

**Resolución: refactor.** Un `ErrorState` compartido, hermano de `EmptyState`. Ver fase 1.

### 95.11. Modo oscuro: `--primary` — **baja**

§5 fija `--primary: #3B82F6` en oscuro. El código mantiene `#2563EB` para el relleno del
botón (blanco encima da 5.2:1) y reserva `#3B82F6` para enlaces, foco y estados activos vía
`--brand`.

**Resolución: gana el código, se corrige el documento.** La decisión está razonada por
contraste. §5 debe documentar el par `--primary` / `--brand`.

### 95.12. Nomenclatura de tokens — **baja**

§3.2 y §4 hablan de `--surface` y `--surface-subtle`; el código usa el juego de shadcn:
`--card`, `--popover`, `--secondary`, `--muted`.

**Resolución: gana el código, se corrige el documento.** Renombrar tokens rompería todos los
componentes de `ui/` sin ganar nada. §3.2/§4/§5 deben listar los nombres reales.

### 95.13. Confirmación de operaciones de Numi — **media**

§34 exige que Numi muestre un **resumen estructurado** con `[Cancelar] [Confirmar]` antes de
ejecutar. El código implementa el flujo de dos pasos, pero como **texto** (`isConfirmation()`
detecta la confirmación por lenguaje natural), no como componente con botones.

**Resolución: gana el documento.** Una operación financiera no debería confirmarse escribiendo
"ok". Ver fase 5.

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

## Fase 1 — Cimientos del sistema visual

**Por qué primero:** todo lo demás se apoya aquí. Rediseñar el dashboard antes de tener
`EmptyState` significa rediseñarlo dos veces.

**Alcance**

1. `lib/format.ts`: separar `formatMoney` (lectura: `$350.000`) de `formatAmount`
   (precisión: `$350.000,00`). Documentar cuál va en cada contexto. Tests. → brecha 95.5
2. `components/ui/status-badge.tsx`: un único `StatusBadge`. Migrar las 4 copias. Subir
   `StatusTone` y `TONE_DOT` a un solo sitio. Borrar los exports desde páginas de lista.
   → brecha 95.9
3. `components/ui/empty-state.tsx`: icono + título + explicación + CTA, con variante
   *sin resultados de filtro*. Migrar los ~15 textos sueltos. → brecha 95.4
4. `components/ui/error-state.tsx`: sustituir el bloque rojo repetido en 15 archivos.
   → brecha 95.10
5. Ajustar `--radius` y `PageHeader` a la escala acordada (95.6, 95.7).
6. Corregir en este documento §3.2, §4, §5 y §11 con los nombres y valores reales
   (95.6, 95.11, 95.12).

**Se nota en:** todas las pantallas, sin cambiar ninguna estructura.
**Riesgo:** bajo. **Tamaño:** mediano.

---

## Fase 2 — Navegación de escritorio

**Por qué segunda:** define dónde vive cada pantalla; conviene antes de rediseñarlas.

**Alcance**

1. Reagrupar el sidebar al modelo mental (§14): mover **Maestros** y **Políticas de interés**
   bajo Configuración; agrupar Cartera / Gastos / Caja / Informes con nombres de usuario.
   → brecha 95.1
2. Mantener las rutas actuales y añadir redirecciones si alguna cambia: no romper enlaces
   guardados ni el historial.
3. Sidebar navegable con teclado y con estado activo evidente (§46).

**Se nota en:** el shell completo. **Riesgo:** medio (toca rutas). **Tamaño:** pequeño-mediano.

---

## Fase 3 — Experiencia móvil

**Por qué tercera:** es la brecha más grande frente al documento y el uso real (cobrar y
registrar se hacen desde el teléfono).

**Alcance**

1. Bottom navigation: `Inicio · Cartera · Nuevo · Numi · Más` (§15).
2. Acción central **Nuevo** → hoja inferior con: registrar ingreso, registrar egreso,
   registrar pago, crear cobro, crear contacto, transferencia.
3. "Más" abre el resto de secciones; el `Sheet` deja de ser la única navegación.
4. Auditar objetivos táctiles a 44×44 (§43) y formularios móviles (§44): ancho completo,
   teclado numérico en importes, una sola columna.

**Se nota en:** todo el uso móvil. **Riesgo:** medio. **Tamaño:** grande.

---

## Fase 4 — Dashboard

**Por qué cuarta:** ya existen `EmptyState`, `StatusBadge`, formato de dinero y navegación
definitiva; el dashboard puede componerse sin inventar piezas.

**Alcance**

1. Reordenar según §16: resumen → acciones rápidas → flujo de caja → necesita tu atención →
   insight de Numi → actividad reciente.
2. Reducir de 9 KPIs a **4 protagonistas** (saldo disponible · por cobrar · vencido · por
   pagar). Lo demás baja de rango o se mueve a Informes. → brecha 95.3
3. Componente `QuickAction` + fila de acciones rápidas.
4. Bloque "Necesita tu atención": cartera vencida, próximos cobros, próximos pagos —
   con **contexto**, no solo cifra (§2.2).
5. Un único insight de Numi, y solo si aporta.

**Se nota en:** la primera pantalla que ve todo el mundo.
**Riesgo:** medio. **Tamaño:** grande.

---

## Fase 5 — Listados, detalles y Numi operativo

**Alcance**

1. Pasar listas y fichas por el checklist §18–§21: filtros frecuentes visibles, filtros
   activos evidentes, "limpiar filtros" fácil.
2. Revisar las fichas de detalle contra §53 (auditoría: qué pasó, cuándo, quién) y §55
   (reversión, nunca "eliminar").
3. Confirmación estructurada de operaciones de Numi: tarjeta de resumen con
   `[Cancelar] [Confirmar]`, en lugar de confirmar escribiendo. → brecha 95.13
4. Respuestas enriquecidas de Numi (§32, §33): cifra, breakdown, tabla breve, acciones.

**Riesgo:** medio. **Tamaño:** grande.

---

## Fase 6 — Command bar y pulido

**Por qué última:** es la pieza más cara y la que más depende de que todo lo demás esté en su
sitio.

**Alcance**

1. Header de escritorio con barra universal: buscar · preguntar a Numi · ejecutar acciones
   (§36). → brecha 95.8
2. Atajos de teclado y navegación completa por teclado (§46).
3. Pulido final: animaciones (§41), microinteracciones, revisión de contraste en ambos temas.
4. Repaso completo del checklist §81 pantalla por pantalla.

**Riesgo:** medio-alto. **Tamaño:** grande.

---

## 96.1. Resumen

| Fase | Tema | Riesgo | Depende de |
| --- | --- | --- | --- |
| 1 | Cimientos del sistema visual | bajo | — |
| 2 | Navegación de escritorio | medio | 1 |
| 3 | Experiencia móvil | medio | 1, 2 |
| 4 | Dashboard | medio | 1, 2 |
| 5 | Listados, detalles y Numi | medio | 1, 4 |
| 6 | Command bar y pulido | medio-alto | todas |

**Regla de oro del plan:** una fase por rama y por revisión. Nada de rediseñar cuatro
secciones a la vez — el documento existe precisamente para que no haga falta.
