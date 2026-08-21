/**
 * Contraste WCAG 2.1.
 *
 * Existe porque el sistema visual ya tropezó con esto una vez: el teal de marca da
 * 2.4:1 como texto sobre fondo claro, y de ahí salieron `--success-strong` y
 * `--warning-strong` (§3.2). Ese hallazgo no puede seguir dependiendo de que alguien
 * se acuerde de comprobarlo con la paleta siguiente.
 */

/** Texto normal en AA. */
export const AA_TEXT = 4.5
/** Texto grande (≥24 px, o ≥19 px en negrita) y elementos no textuales: bordes, foco. */
export const AA_LARGE = 3

interface Rgb {
  r: number
  g: number
  b: number
}

/** Acepta `#rgb` y `#rrggbb`, con o sin almohadilla. */
function parseHex(hex: string): Rgb {
  const raw = hex.trim().replace(/^#/, '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Color no reconocido: ${hex}`)
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

/** Linealiza un canal sRGB (0–255) según la curva de la norma. */
function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Luminancia relativa: 0 es negro, 1 es blanco. */
export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Razón de contraste entre dos colores, de 1:1 a 21:1. El orden de los argumentos da igual. */
export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** El triplete `R G B` que piden las funciones de color con opacidad de CSS. */
export function rgbTriplet(hex: string): string {
  const { r, g, b } = parseHex(hex)
  return `${r} ${g} ${b}`
}

/**
 * La tinta que va ENCIMA de un relleno, dados sus dos polos `[oscura, clara]`.
 *
 * Se usa para los `*-foreground` de las superficies rellenas. Escribirlos a mano
 * funciona mientras la paleta sea esta y se vuelve ilegible en cuanto una candidata
 * trae un verde bosque profundo, así que se eligen — pero **no maximizando contraste**.
 * Sobre el azul de marca el negro contrasta más que el blanco y aun así la respuesta
 * es blanco: un botón primario con letra negra no se lee como un botón primario.
 *
 * La regla que sí reproduce las decisiones ya tomadas: **se prefiere la tinta clara, y
 * solo se baja a la oscura cuando el relleno es demasiado pálido para sostenerla.** El
 * corte está en 3:1 y es justo el que separa los rellenos saturados —azul, rojo— de los
 * pálidos —el teal de éxito, el ámbar de aviso—, que son exactamente los que en la
 * consola de hoy llevan letra oscura en los dos modos.
 */
export function inkOnFill(fill: string, poles: readonly [string, string]): string {
  const [oscura, clara] = poles
  return contrast(fill, clara) >= AA_LARGE ? clara : oscura
}
