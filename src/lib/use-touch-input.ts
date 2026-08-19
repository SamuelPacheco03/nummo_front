import { useEffect, useState } from 'react'

/**
 * `true` donde se toca con el dedo.
 *
 * Separa las dos interfaces que el chat necesita: con ratón hay «encima», así que las
 * acciones de un mensaje pueden aparecer al pasar por él; con el dedo no lo hay, y el
 * gesto natural es mantener pulsado para seleccionar.
 *
 * Se mira el puntero y no el ancho: un portátil táctil es ancho y se toca, y una ventana
 * estrecha en escritorio sigue teniendo ratón.
 */
export function useTouchInput(): boolean {
  const [touch, setTouch] = useState(() => window.matchMedia?.('(pointer: coarse)').matches ?? false)
  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)')
    const onChange = () => setTouch(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return touch
}
