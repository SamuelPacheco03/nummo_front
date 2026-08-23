import { apiUrl } from '@/lib/api-config'
import { ensureCsrfToken } from '@/lib/csrf'
import { toApiError } from '@/lib/sse'

/**
 * **Subir un archivo sabiendo cuándo terminó de subir**: POST multipart por XHR.
 *
 * No pasa por el cliente generado por la razón contraria a `sse.ts`: allí hace falta
 * leer la respuesta mientras se escribe, y aquí hace falta saber cuándo se acabó de
 * escribir la **petición**. `fetch` no lo dice —no expone el progreso de subida—, y
 * `XMLHttpRequest` sí, con `upload`.
 *
 * Existe por las palomitas del chat (§32.8). Una imagen **se entrega cuando sus bytes
 * están arriba**, no cuando Numi termina de mirarla: sin esta señal el mensaje se queda
 * con una sola palomita los treinta segundos que tarda la lectura, y una sola palomita
 * al lado de una foto se lee como que no salió. Con ella, las dos palomitas caen al
 * subir y la espera la cuenta «Numi está escribiendo…», que es lo que ya hace un
 * mensaje de texto.
 *
 * El `Content-Type` no se pone a mano: el navegador tiene que añadir el `boundary` del
 * multipart, y etiquetarlo aquí lo dejaría sin él.
 */
export async function postMultipart<T>({
  path,
  body,
  onUploaded,
  signal,
}: {
  path: string
  body: FormData
  /** El último byte de la petición ya salió. Lo que queda es esperar respuesta. */
  onUploaded?: () => void
  /**
   * Cortar la petición. Es el botón de detener del chat.
   *
   * Rechaza con un `AbortError`, como haría `fetch`, para que quien llama distinga
   * «lo paré yo» de «se cayó»: son la misma excepción para el código y dos cosas muy
   * distintas para quien mira la pantalla.
   */
  signal?: AbortSignal
}): Promise<T> {
  const token = await ensureCsrfToken()

  return new Promise<T>((resolve, reject) => {
    const abortado = () => reject(new DOMException('Subida cancelada', 'AbortError'))
    // Pudo abortarse mientras se pedía el CSRF, que es una espera de verdad.
    if (signal?.aborted) {
      abortado()
      return
    }

    const xhr = new XMLHttpRequest()
    xhr.open('POST', apiUrl(path))
    // Las cookies HttpOnly de sesión y CSRF, como en `customFetch`.
    xhr.withCredentials = true
    if (token) xhr.setRequestHeader('x-csrf-token', token)

    xhr.upload.addEventListener('load', () => onUploaded?.())

    xhr.addEventListener('load', () => {
      let parsed: unknown
      try {
        parsed = xhr.responseText === '' ? undefined : JSON.parse(xhr.responseText)
      } catch {
        // Un cuerpo que no es JSON solo pasa si algo se interpuso —un proxy, una
        // página de error—: se cuenta como fallo del servidor y no se adivina.
        parsed = undefined
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed as T)
        return
      }
      reject(toApiError(xhr.status, parsed))
    })

    xhr.addEventListener('error', () => reject(new Error('No se pudo conectar con el servidor.')))
    xhr.addEventListener('timeout', () => reject(new Error('La subida tardó demasiado.')))
    xhr.addEventListener('abort', abortado)

    signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(body)
  })
}
