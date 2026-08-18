import { useCallback, useState } from 'react'

/**
 * **Una clave por intento, no por reintento.**
 *
 * El backend acepta `Idempotency-Key` en todas las mutaciones que mueven dinero
 * (§88.6). Con la misma clave y el mismo cuerpo devuelve la respuesta original
 * en vez de volver a mover el dinero — y ahí está toda la gracia: si la petición
 * salió pero la respuesta se perdió, reintentar **no duplica** la transferencia.
 *
 * Por eso la clave tiene que sobrevivir a los reintentos del mismo intento y
 * morir cuando el intento termina: `renew()` se llama al acertar, para que la
 * siguiente operación —una segunda transferencia igual, hecha a propósito— no se
 * confunda con la anterior y se la traguen como repetida.
 *
 * Generarla en cada clic no serviría de nada: serían dos claves distintas y dos
 * movimientos. Contra el doble clic manda el botón deshabilitado mientras la
 * mutación está en vuelo; esto es contra la red, que es lo que no se ve.
 */
export function useIdempotencyKey(): { key: string; renew: () => void } {
  const [key, setKey] = useState(() => crypto.randomUUID())
  return { key, renew: useCallback(() => setKey(crypto.randomUUID()), []) }
}
