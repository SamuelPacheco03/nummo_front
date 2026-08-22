import { inkOnFill, luminance, rgbTriplet } from './contrast'
import type { Palette, PaletteMode, PaletteSlots } from './palettes'

/**
 * Expande las 21 ranuras de una candidata al juego completo de tokens semánticos que
 * consume `components/ui/`.
 *
 * **La regla que hay que entender antes de tocar esto:** el resultado se aplica como
 * custom properties EN LÍNEA sobre el envoltorio de cada muestra. Los estilos en línea
 * le ganan a `.dark` de `index.css`, pero **solo en los tokens que aquí se emitan**. Un
 * token olvidado no falla: cae al valor de la app y la candidata miente en silencio,
 * que es la peor forma de fallar en una pantalla cuyo trabajo es decidir. Por eso
 * `tokens.test.ts` compara esta lista contra la de `index.css` y exige que no falte
 * ninguno.
 */

/** Los cuatro del isotipo: son la marca y valen igual en las tres candidatas (§3.2). */
const LOGO = {
  '--logo-teal': '#14b8a6',
  '--logo-cyan': '#22c7d6',
  '--logo-blue': '#2563eb',
  '--logo-indigo': '#4f46e5',
} as const

/**
 * El acento de la consola de plataforma. Fijo a propósito: el sidebar va oscuro en los
 * dos modos, así que su acento no puede re-tematizarse (§47.2).
 */
const PLATFORM_PRIMARY = '#818cf8'

/** Opacidad del velo detrás de lo que se abre encima. En oscuro tapa más. */
const SCRIM_ALPHA: Record<PaletteMode, number> = { light: 0.45, dark: 0.65 }

/**
 * Los dos polos de tinta de un modo: lo más oscuro y lo más claro de que dispone la
 * candidata para escribir ENCIMA de un relleno.
 *
 * El polo claro es `onFilled`, que es literalmente para lo que existe. El oscuro no
 * puede ser `ink` sin más: en modo oscuro `ink` es casi blanca, y el texto sobre el
 * teal de éxito —que es claro en LOS DOS modos— saldría blanco sobre claro, a 2.3:1.
 * En un modo oscuro el extremo profundo no está en la tinta sino en la superficie, así
 * que se toma la más oscura de las dos por luminancia en vez de fijarla por nombre.
 */
function inkPoles(s: PaletteSlots): readonly [string, string] {
  const oscura = luminance(s.ink) <= luminance(s.surface) ? s.ink : s.surface
  return [oscura, s.onFilled]
}

export function derive(palette: Palette, mode: PaletteMode): Record<string, string> {
  const s: PaletteSlots = palette[mode]

  /*
    Las dos tintas entre las que elige cada relleno. No se fija a mano cuál va: sobre el
    teal de éxito el texto es oscuro en los DOS modos porque el teal es claro en los dos,
    y sobre un verde bosque profundo tiene que ser claro. Decidirlo por contraste es lo
    único que sobrevive a las tres candidatas.
  */
  const inks = inkPoles(s)

  /*
    El sidebar va OSCURO en los dos modos (§3.2), así que sus tintas y su acento no
    pueden salir del modo activo: en claro, `inkMuted` es gris oscuro y sobre el sidebar
    no se vería. Salen siempre del lado oscuro de la candidata, que es el que está
    pensado para fondos así. La superficie sí sigue al modo, porque en oscuro el sidebar
    baja por debajo del fondo en vez de quedar por encima.
  */
  const d = palette.dark

  return {
    ...LOGO,

    '--background': s.surface,
    '--foreground': s.ink,
    /*
      El velo sale SIEMPRE del tono más profundo de la candidata, no del modo activo:
      es el mismo color en claro y en oscuro y solo cambia cuánto tapa, igual que hoy.
    */
    '--scrim': `rgb(${rgbTriplet(palette.dark.shell)} / ${SCRIM_ALPHA[mode]})`,

    '--card': s.raised,
    '--card-foreground': s.ink,
    '--popover': s.raised,
    '--popover-foreground': s.ink,

    '--primary': s.accent,
    '--primary-foreground': inkOnFill(s.accent, inks),
    '--primary-hover': s.accentDeep,

    '--brand': s.accentLink,
    '--brand-foreground': inkOnFill(s.accentLink, inks),

    '--chat-bubble': s.accentSoft,
    '--chat-bubble-foreground': inkOnFill(s.accentSoft, inks),

    '--secondary': s.sunken,
    '--secondary-foreground': s.ink,
    '--muted': s.sunken,
    '--muted-foreground': s.inkMuted,
    /*
      Token NUEVO, de la portada: la segunda línea de un titular a dos tonos. No es
      `--muted-foreground` aunque se le parezca — ese se lee como cuerpo y va a 4.5:1,
      y este es siempre texto grande y vive en el umbral de 3:1. Confundirlos deja un
      párrafo ilegible o un titular apagado de más.
    */
    '--heading-muted': s.inkDisplay,

    /* accent = hover sutil de UI (rol shadcn), NO el color de marca. */
    '--accent': s.sunken,
    '--accent-foreground': s.ink,

    '--success': s.positive,
    '--success-foreground': inkOnFill(s.positive, inks),
    '--success-strong': s.positiveText,
    '--warning': s.caution,
    '--warning-foreground': inkOnFill(s.caution, inks),
    '--warning-strong': s.cautionText,
    '--destructive': s.danger,
    '--destructive-foreground': inkOnFill(s.danger, inks),
    /*
      Token NUEVO, que `index.css` todavía no tiene. Cierra el hueco que `--success-strong`
      y `--warning-strong` ya cerraron para el teal y el ámbar: el rojo de relleno y el
      rojo que se lee como texto no pueden ser el mismo valor en oscuro (la cuenta está en
      `palettes.ts`). Los 51 `text-destructive` de la consola apuntan hoy a `--destructive`;
      migrarlos es trabajo de cuando la paleta esté elegida, y hasta entonces esto vive en
      el laboratorio.
    */
    '--destructive-strong': s.dangerText,

    /*
      La llamada a la acción de la portada. No es `--primary`: en la paleta de marca el
      botón que queremos que pulsen va en el azul profundo casi negro, y `--primary` es el
      azul de acción de la consola, que ahí no puede moverse. Y cambia con el modo, porque
      un navy sobre página oscura es un botón invisible.
    */
    '--cta': s.ctaFill,
    '--cta-foreground': inkOnFill(s.ctaFill, inks),

    '--border': s.line,
    /*
      La consola da al campo un borde un punto más claro que el resto en oscuro
      (`#273244` frente a `#1f2937`). El laboratorio los unifica: es la única
      simplificación de la capa, y no mueve la decisión que esta pantalla existe para
      tomar. `tokens.test.ts` la deja anotada como divergencia conocida para que se
      vuelva a poner cuando la paleta elegida aterrice en `index.css`.
    */
    '--input': s.line,
    '--ring': s.accentLink,

    '--sidebar': s.shell,
    '--sidebar-foreground': d.ink,
    '--sidebar-muted-foreground': d.inkMuted,
    '--sidebar-primary': d.accentLink,
    '--sidebar-primary-foreground': inkOnFill(d.accentLink, inkPoles(d)),
    '--sidebar-accent': s.shellRaised,
    '--sidebar-accent-foreground': d.ink,
    '--sidebar-border': s.shellRaised,
    '--sidebar-ring': d.accentLink,
    '--sidebar-platform-primary': PLATFORM_PRIMARY,
  }
}

/** El resultado de `derive`, listo para el atributo `style` de un envoltorio de React. */
export function paletteStyle(palette: Palette, mode: PaletteMode): React.CSSProperties {
  return derive(palette, mode) as React.CSSProperties
}
