/**
 * Comparar texto como lo escribe la gente.
 *
 * Nadie pone la tilde de «matrícula» en un buscador, ni escribe «Cine» con
 * mayúscula al filtrar. Estaba resuelto tres veces —la paleta de comandos, la
 * guía y ahora el selector de iconos—, que es una de más: cuando una de las
 * copias aprendiera algo (la ñ, la diéresis) las otras seguirían sin saberlo.
 *
 * El de `assistant/utils.ts` **no** es este: además quita la puntuación y colapsa
 * los espacios, porque compara frases enteras y no subcadenas.
 */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}
