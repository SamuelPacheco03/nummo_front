/**
 * El consentimiento de la portada, y qué depende de él.
 *
 * **Lo que depende:** Clarity, que es de un tercero y graba la sesión.
 *
 * **Lo que NO depende, y es la mitad importante:** la medición propia. Las señales de
 * `/public/signals` son de primera parte, no identifican a nadie y no salen de este
 * dominio; y la atribución que de verdad decide —qué campaña trajo un registro— la escribe
 * el servidor en una cookie `HttpOnly` que el front ni lee. O sea que decir «no» no nos
 * deja ciegos en lo que importa, y por eso el banner puede permitirse ser honesto en vez
 * de insistente.
 */

const CLAVE = 'nummo-consentimiento'

export type Consentimiento = 'si' | 'no'

/** Lo que eligió esta persona, o `null` si todavía no eligió. */
export function consentimientoGuardado(): Consentimiento | null {
  try {
    const v = localStorage.getItem(CLAVE)
    return v === 'si' || v === 'no' ? v : null
  } catch {
    /* Modo privado o storage bloqueado: se trata como «no ha elegido» y no se carga nada. */
    return null
  }
}

export function guardarConsentimiento(valor: Consentimiento): void {
  try {
    localStorage.setItem(CLAVE, valor)
  } catch {
    /* Si no se puede recordar, se vuelve a preguntar en la próxima visita. Es lo correcto. */
  }
}

/** El identificador de Clarity. Sin él no hay nada de terceros, y no se pregunta nada. */
export function clarityId(): string | null {
  const id = import.meta.env.VITE_CLARITY_ID
  return id && id.length > 0 ? id : null
}

/**
 * Si hay que preguntar.
 *
 * **No se pregunta cuando no hay nada que preguntar**: sin `VITE_CLARITY_ID` configurado
 * no se carga nada de terceros, y un banner de cookies en una página que no pone cookies
 * de terceros es teatro — molesta, entrena a la gente a aceptar sin leer, y no protege
 * nada.
 */
export function hayQuePreguntar(): boolean {
  return clarityId() !== null && consentimientoGuardado() === null
}

let cargado = false

/**
 * Mete Clarity en la página. Solo se llama con un «sí» explícito.
 *
 * Es idempotente: aceptar dos veces —o volver a montar la portada— no puede acabar con dos
 * copias del script peleándose por la misma sesión.
 */
export function cargarClarity(id: string): void {
  if (cargado || typeof document === 'undefined') return
  cargado = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(id)}`
  document.head.appendChild(script)
}

/** Solo para los tests: olvida que ya se cargó. */
export function _reiniciarClarity(): void {
  cargado = false
}
