/**
 * El color de la barra del navegador en la portada.
 *
 * Son los dos fondos de página (`--background` en cada modo). Van como constante y no
 * leyendo el CSS porque `theme-provider` los necesita antes de que haya nada pintado — y
 * si se desincronizan, la compuerta de `index.css` lo dice (`tokens.test.ts`).
 */
export const TEMA_PORTADA = {
  light: '#f8fafc',
  dark: '#0b1220',
} as const
