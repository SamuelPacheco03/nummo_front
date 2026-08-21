/**
 * **Lo que se espera de un caso**, escrito a mano y leído de vuelta.
 *
 * Las expectativas son listas —herramientas que debió llamar, frases que debe mencionar—
 * y la forma más rápida de escribirlas es una por línea. Esto traduce entre ese texto y
 * el arreglo que viaja al contrato, y existe aparte de la pantalla porque es justo lo que
 * se puede probar sin montar nada (§66).
 */

/**
 * Del texto a la lista.
 *
 * Se corta por líneas y por comas: nadie escribe una lista de dos elementos en dos
 * renglones, y aceptar las dos formas evita que un caso quede guardado con una
 * expectativa llamada `list_receivables, list_payments`, que no coincide con nada y
 * pasa siempre.
 */
export function parseList(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

/** De la lista al texto del formulario: una por línea. */
export function joinList(items: string[] | undefined): string {
  return (items ?? []).join('\n')
}
