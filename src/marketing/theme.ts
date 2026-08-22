/**
 * El color de la barra del navegador en la portada.
 *
 * Son los dos fondos de página (`--background` en cada modo). Van como constante y no
 * leyendo el CSS porque `theme-provider` los necesita antes de que haya nada pintado.
 *
 * El mismo par vive en los `<meta name="theme-color">` de `index.html`, que son los que
 * pintan la barra antes de que corra nada. Que los tres digan lo mismo lo comprueba
 * `theme.test.ts` — hasta agosto de 2026 este comentario decía que lo vigilaba
 * `tokens.test.ts`, y no era cierto: allí solo se mide contraste. `index.html` llevaba
 * meses con la paleta «bosque», ya borrada.
 */
export const TEMA_PORTADA = {
  light: '#f8fafc',
  dark: '#0b1220',
} as const
