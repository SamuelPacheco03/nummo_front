/**
 * La serif de los destacados del titular.
 *
 * Es la única familia que la portada añade. Los titulares van en `font-display` —Sora, la
 * misma de la consola— y el cuerpo en Inter: la portada no estrena tipografía, estrena un
 * acento.
 *
 * Se declara como constante y no como clase porque `@theme inline` mete el valor DENTRO de
 * la utilidad en vez de emitir un `var(--font-…)`, así que una utilidad nueva obligaría a
 * tocar la configuración de Tailwind para un solo uso.
 */
export const SERIF_STACK = "'Instrument Serif', ui-serif, Georgia, serif"
