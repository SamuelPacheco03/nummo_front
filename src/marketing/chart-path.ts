/**
 * El trazo del área del gráfico de la portada, en SVG a mano.
 *
 * **Sin Recharts, y no por capricho**: son ~115 kB gzip (§63) y aquí no hace falta ni una
 * de las cosas que justifican ese peso — no hay datos de verdad, no hay ejes que calcular,
 * no hay interacción. Es una ilustración de lo que la consola enseña, y en la página donde
 * cada kilobyte se paga en tasa de rebote.
 */

export interface Trazo {
  /** El camino de la línea. */
  linea: string
  /** El mismo, cerrado contra la base, para rellenar. */
  area: string
  /** Longitud aproximada del camino, para animar el dibujado con `stroke-dasharray`. */
  largo: number
}

/**
 * Convierte una serie de valores en un camino suave.
 *
 * La suavidad sale de curvas cúbicas con los tiradores a un tercio de la distancia
 * horizontal: es lo que evita los picos duros de una polilínea sin necesitar una
 * interpolación de verdad, que aquí sería precisión falsa sobre datos inventados.
 */
export function trazar(valores: readonly number[], ancho: number, alto: number): Trazo {
  const max = Math.max(...valores, 1)
  const paso = ancho / (valores.length - 1)
  const puntos = valores.map((v, i) => ({ x: i * paso, y: alto - (v / max) * alto * 0.86 - alto * 0.07 }))

  let linea = `M ${puntos[0].x.toFixed(1)} ${puntos[0].y.toFixed(1)}`
  for (let i = 1; i < puntos.length; i++) {
    const previo = puntos[i - 1]
    const actual = puntos[i]
    const tirador = (actual.x - previo.x) / 3
    linea += ` C ${(previo.x + tirador).toFixed(1)} ${previo.y.toFixed(1)}, ${(actual.x - tirador).toFixed(1)} ${actual.y.toFixed(1)}, ${actual.x.toFixed(1)} ${actual.y.toFixed(1)}`
  }

  const area = `${linea} L ${ancho} ${alto} L 0 ${alto} Z`

  /*
    El largo se estima sumando las distancias entre puntos y añadiendo un margen: la curva
    es más larga que la polilínea que la aproxima, y quedarse corto deja un trozo de línea
    ya pintado antes de que empiece la animación.
  */
  let largo = 0
  for (let i = 1; i < puntos.length; i++) {
    largo += Math.hypot(puntos[i].x - puntos[i - 1].x, puntos[i].y - puntos[i - 1].y)
  }

  return { linea, area, largo: Math.ceil(largo * 1.15) }
}
