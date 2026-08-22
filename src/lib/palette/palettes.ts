/**
 * La capa de paletas: **21 ranuras crudas por modo**, de las que sale el juego
 * completo de tokens semánticos (`tokens.ts`).
 *
 * Sin esta capa cada candidata serían las ~77 declaraciones de `index.css` × 2 modos,
 * escritas a mano, y el test de contraste leería una copia en vez de lo que se pinta.
 * Con ella una candidata son 42 valores y **una sola** fuente: el test, las muestras
 * del laboratorio y el hero leen exactamente el mismo objeto.
 *
 * Lo que NO entra en las ranuras, a propósito:
 *
 * - **`--logo-*`**: los cuatro colores del isotipo son la marca y no se re-tematizan
 *   (§3.2). Valen igual en las tres candidatas.
 * - **`--chart-*`**: el orden de las series es una decisión razonada —el ámbar es la
 *   4ª para separar egresos de ingresos— y re-derivarla por paleta es conversación
 *   para cuando haya una elegida.
 */

/**
 * Las 21 ranuras. Cada candidata las rellena dos veces, una por modo.
 *
 * `accentLink` existe aparte de `accent` porque no son el mismo trabajo: el relleno de
 * un botón puede ser oscuro, pero un enlace sobre el fondo tiene que leerse como texto,
 * y en oscuro eso obliga a un tono más claro que el del botón.
 */
export interface PaletteSlots {
  /* Superficie */
  /** Fondo de la página. */
  surface: string
  /** Lo que se levanta sobre el fondo: tarjeta, popover. */
  raised: string
  /** Superficie sutil hundida: chips, fondos de sección, hover de UI. */
  sunken: string
  /** Bordes y contornos de campo. */
  line: string

  /* Tinta */
  /** Texto principal sobre las superficies del modo. */
  ink: string
  /** Texto secundario: metadatos, ayudas. Se lee como CUERPO, así que va a 4.5:1. */
  inkMuted: string
  /**
   * La **segunda línea de un titular a dos tonos**, que es el gesto de firma de la
   * portada: la primera línea en tinta y la segunda en este tono, más apagado.
   *
   * Existe aparte de `inkMuted` por la misma razón que `positiveText` existe aparte de
   * `positive`: son dos trabajos con dos umbrales. Esto es SIEMPRE texto grande —48 px
   * para arriba—, así que se mide contra 3:1 y puede permitirse un tono que como cuerpo
   * sería ilegible. Usarlo para un párrafo es el error que este comentario existe para
   * evitar.
   */
  inkDisplay: string
  /** Tinta para escribir ENCIMA de un relleno saturado. */
  onFilled: string

  /* Marca */
  /** Relleno de la acción principal. */
  accent: string
  /** Hover de la acción principal: la marca pide más profundo, no más claro (§3.2). */
  accentDeep: string
  /** Enlaces, foco y estados activos. */
  accentLink: string
  /** Superficie lavada de marca: la burbuja propia del chat de Numi. */
  accentSoft: string

  /* Estado */
  /** Verde/teal de RELLENO: puntos, barras, badges. */
  positive: string
  /** La versión del anterior que se lee como TEXTO (§3.2). */
  positiveText: string
  /** Ámbar de RELLENO. */
  caution: string
  /** La versión del anterior que se lee como TEXTO. */
  cautionText: string
  /** Rojo de RELLENO: el botón «Eliminar», el badge de error. */
  danger: string
  /**
   * La versión del anterior que se lee como TEXTO — mensajes de validación, estados de
   * error. Existe por la misma razón que `positiveText` y `cautionText`, y se descubrió
   * tarde: en modo oscuro **ningún** rojo sirve para las dos cosas. Para que el blanco
   * encima pase AA hace falta luminancia ≤0.183, y para leerse sobre el fondo oscuro
   * hace falta ≥0.209. No hay solape, así que no es cuestión de afinar el tono: son dos
   * valores. La consola de hoy tiene uno solo y por eso su botón «Eliminar» en oscuro se
   * queda en 3.76:1 (anotado en `palettes.test.ts`).
   */
  dangerText: string

  /**
   * El relleno de la **llamada a la acción de la portada**.
   *
   * Existe aparte de `accent` porque no es la misma pregunta. `accent` es «el color de
   * acción de este sistema»; esto es «con qué se pinta el botón que queremos que pulsen»,
   * y la respuesta cambia por paleta: en la de marca es el azul profundo casi negro, y en
   * la de los mockups es el durazno.
   *
   * Y **cambia con el modo**, que es lo que obliga a que sea una ranura y no una regla: un
   * navy sobre una página clara resalta, y ese mismo navy sobre una página oscura es un
   * botón invisible. Cada candidata dice qué usa en cada modo.
   */
  ctaFill: string

  /* Shell */
  /** El sidebar de la consola, que va oscuro en los DOS modos (§3.2). */
  shell: string
  /** Lo que se levanta dentro del sidebar: fila activa, separadores. */
  shellRaised: string
}

export interface Palette {
  id: PaletteId
  /** Nombre para la pestaña del laboratorio. */
  name: string
  /** Qué defiende esta candidata, en una línea. */
  note: string
  light: PaletteSlots
  dark: PaletteSlots
}

export type PaletteId = 'azul' | 'bosque' | 'bruma'
export type PaletteMode = 'light' | 'dark'

/**
 * La paleta de hoy, extraída literal de `index.css`.
 *
 * No es relleno: es el **control**. Una candidata nueva se juzga contra algo real y ya
 * rodado, no contra el recuerdo de cómo se veía. Y como sale del CSS vigente, sirve de
 * prueba de que el derivador es fiel a la consola tal y como existe (`tokens.test.ts`).
 */
const azul: Palette = {
  id: 'azul',
  name: 'Azul',
  note: 'La de hoy. El control contra el que se comparan las otras dos.',
  light: {
    surface: '#f8fafc',
    raised: '#ffffff',
    sunken: '#f1f5f9',
    line: '#e2e8f0',
    ink: '#0f172a',
    inkMuted: '#475569',
    inkDisplay: '#64748b',
    onFilled: '#ffffff',
    accent: '#2563eb',
    accentDeep: '#1d4ed8',
    accentLink: '#2563eb',
    accentSoft: '#dbeafe',
    positive: '#14b8a6',
    positiveText: '#0f766e',
    caution: '#f59e0b',
    cautionText: '#b45309',
    danger: '#dc2626',
    dangerText: '#dc2626',
    ctaFill: '#0f172a',
    shell: '#0f172a',
    shellRaised: '#1e293b',
  },
  dark: {
    surface: '#0b1220',
    raised: '#111827',
    sunken: '#1f2937',
    line: '#1f2937',
    ink: '#f8fafc',
    inkMuted: '#94a3b8',
    inkDisplay: '#94a3b8',
    onFilled: '#ffffff',
    accent: '#2563eb',
    accentDeep: '#1d4ed8',
    accentLink: '#3b82f6',
    accentSoft: '#1e3a63',
    positive: '#14b8a6',
    positiveText: '#2dd4bf',
    caution: '#f59e0b',
    cautionText: '#fbbf24',
    danger: '#ef4444',
    dangerText: '#ef4444',
    ctaFill: '#2563eb',
    shell: '#070d17',
    shellRaised: '#16202f',
  },
}

/**
 * La de los mockups, leída de ellos y no imaginada.
 *
 * El salto de verdad respecto a lo de hoy no es el verde: es el **fondo**. Cambia el gris
 * azulado por un crema, y con él la temperatura de todo lo demás — los grises neutros
 * sobre crema se ven sucios, así que hasta los bordes van tibios.
 *
 * Y la acción principal **no es verde, es durazno**. Es lo que más sorprende de los
 * mockups y lo que más cuesta creer hasta que se mide: el durazno solo sostiene tinta
 * oscura (8.4:1) y con blanco encima da 1.9:1. `inkOnFill` lo resuelve sola —el durazno
 * cae por debajo del corte de 3:1 con la tinta clara y baja a la oscura—, así que aquí no
 * hay nada que declarar: basta con no «arreglarlo» poniéndole blanco a mano.
 *
 * El verde profundo se queda con dos trabajos que sí son suyos: la tinta y las secciones
 * oscuras.
 */
const bosque: Palette = {
  id: 'bosque',
  name: 'Bosque',
  note: 'La de los mockups: crema, verde bosque, menta y durazno.',
  light: {
    surface: '#f4f1e9',
    raised: '#ffffff',
    /*
      La banda salvia con la que alternan las secciones (el ritmo, el CTA final). Ocupa la
      ranura de superficie hundida porque eso es: el fondo un punto más denso sobre el que
      se apoya una sección entera.
    */
    sunken: '#dce7dc',
    line: '#e0dbcd',
    ink: '#14231b',
    inkMuted: '#51665a',
    /*
      La salvia de las segundas líneas. En los mockups se ve más clara —alrededor de
      #8fa396— y a ese valor da 2.4:1 sobre el crema y 2.1:1 sobre la banda salvia: por
      debajo incluso del 3:1 de texto grande. Oscurecerla hasta aquí la deja en 4.2 y 3.7,
      que es lo que hace legible el gesto que la portada repite en cinco secciones.
    */
    inkDisplay: '#63796c',
    onFilled: '#ffffff',
    accent: '#f5a97c',
    accentDeep: '#e89563',
    /* El enlace no puede ser el durazno: como texto sobre crema no llega. Va el verde. */
    accentLink: '#2c5a43',
    accentSoft: '#b9dec6',
    positive: '#a8d5ba',
    positiveText: '#1b6647',
    caution: '#f0a878',
    cautionText: '#9c4c18',
    danger: '#b3392c',
    dangerText: '#b3392c',
    ctaFill: '#f5a97c',
    shell: '#14231b',
    shellRaised: '#1f3227',
  },
  dark: {
    /*
      El oscuro no está en los mockups: se deriva. Las secciones oscuras de la portada ya
      dicen cuál es el verde profundo de la marca, así que el modo oscuro es esa misma
      superficie llevada a página entera, con la tinta crema que ya usan.
    */
    surface: '#0e1712',
    raised: '#17241c',
    sunken: '#22322a',
    line: '#2c3d33',
    ink: '#f1ece0',
    inkMuted: '#9aab9f',
    /* Sobre el fondo oscuro la salvia de los mockups sí se lee (6.1:1), así que se queda. */
    inkDisplay: '#8fa396',
    onFilled: '#ffffff',
    accent: '#f5a97c',
    accentDeep: '#e89563',
    accentLink: '#8ad7b6',
    accentSoft: '#1d3729',
    positive: '#7fceac',
    positiveText: '#8ad7b6',
    caution: '#f0a878',
    cautionText: '#f3bb94',
    danger: '#bd4236',
    dangerText: '#e2695c',
    ctaFill: '#f5a97c',
    shell: '#0a110d',
    shellRaised: '#1b2a21',
  },
}

/**
 * Neutro cálido con el teal de marca llevado a profundo.
 *
 * La tercera vía: ni el azul de hoy ni el salto entero al verde. Conserva el teal del
 * isotipo —así el logo sigue perteneciendo a la página— pero lo baja a un tono que
 * **se puede leer como texto**, que es exactamente lo que el teal de relleno no puede.
 */
const bruma: Palette = {
  id: 'bruma',
  name: 'Bruma',
  note: 'Neutro cálido con el teal de marca en profundo.',
  light: {
    surface: '#f7f4f0',
    raised: '#ffffff',
    sunken: '#efeae3',
    line: '#ddd5c9',
    ink: '#1b1916',
    inkMuted: '#544e46',
    inkDisplay: '#6b6459',
    onFilled: '#ffffff',
    accent: '#0f766e',
    accentDeep: '#0b5b55',
    accentLink: '#0f766e',
    accentSoft: '#d7ebe8',
    positive: '#14b8a6',
    positiveText: '#0f766e',
    caution: '#d99a3d',
    cautionText: '#8e5a19',
    danger: '#bc3a2f',
    dangerText: '#bc3a2f',
    ctaFill: '#0f766e',
    shell: '#1b1916',
    shellRaised: '#2d2822',
  },
  dark: {
    surface: '#13110e',
    raised: '#1d1a16',
    sunken: '#29241e',
    line: '#342f28',
    ink: '#f5f0e9',
    inkMuted: '#a89f93',
    inkDisplay: '#a89f93',
    onFilled: '#ffffff',
    /* Igual que en «bosque»: a #17958a el blanco encima se quedaba en 3.68:1. */
    accent: '#128073',
    accentDeep: '#0d6b64',
    accentLink: '#2dd4bf',
    accentSoft: '#123a35',
    positive: '#14b8a6',
    positiveText: '#2dd4bf',
    caution: '#e0a44a',
    cautionText: '#f0c07a',
    danger: '#be3e34',
    dangerText: '#e2645a',
    ctaFill: '#128073',
    shell: '#0c0a08',
    shellRaised: '#231e19',
  },
}

/** Las candidatas, en el orden en que se miran: primero contra qué se compara. */
export const PALETTES: readonly Palette[] = [azul, bosque, bruma]

export function paletteById(id: PaletteId): Palette {
  const found = PALETTES.find((p) => p.id === id)
  if (!found) throw new Error(`Paleta desconocida: ${id}`)
  return found
}
