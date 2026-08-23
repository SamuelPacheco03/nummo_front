import { describe, expect, test } from 'vitest'
import { AA_LARGE, AA_TEXT, contrast } from './contrast'
import { tokensDe } from './css-tokens'

/**
 * La compuerta de contraste del sistema visual, **medida sobre `index.css`**.
 *
 * Existe porque el propio documento registra que el teal daba 2.4:1 como texto y que por
 * eso nacieron `--success-strong` y `--warning-strong` (§3.2): hallazgos así no pueden
 * seguir dependiendo de que alguien se acuerde de comprobarlos a mano.
 *
 * Lee el CSS de verdad y no un modelo suyo. Hubo una capa de paletas en TypeScript que
 * describía estos tokens para poder comparar tres candidatas; elegida una, describir el CSS
 * en otro sitio solo añadía una copia que podía desviarse. Esto mide lo que se pinta.
 */

/** En oscuro solo se redeclara lo que cambia; el resto se hereda de `:root`. */
const MODOS = {
  claro: tokensDe(':root'),
  oscuro: { ...tokensDe(':root'), ...tokensDe('\\.dark') },
} as const

interface Par {
  /** Qué se está mirando, en el idioma de la pantalla y no en el de los tokens. */
  que: string
  frente: string
  sobre: string
  minimo: number
}

const PARES: readonly Par[] = [
  { que: 'texto sobre el fondo', frente: '--foreground', sobre: '--background', minimo: AA_TEXT },
  { que: 'texto en tarjeta', frente: '--foreground', sobre: '--card', minimo: AA_TEXT },
  { que: 'texto en superficie sutil', frente: '--foreground', sobre: '--secondary', minimo: AA_TEXT },
  { que: 'texto secundario sobre el fondo', frente: '--muted-foreground', sobre: '--background', minimo: AA_TEXT },
  { que: 'texto secundario en tarjeta', frente: '--muted-foreground', sobre: '--card', minimo: AA_TEXT },

  /*
    La segunda línea de un titular a dos tonos (§97.6). Va a 3:1 y no a 4.5 porque es
    SIEMPRE texto grande —48 px para arriba—, que es el criterio de la norma. Usar este
    token para un párrafo es el error que su comentario en `index.css` existe para evitar.
  */
  { que: 'segunda línea del titular', frente: '--heading-muted', sobre: '--background', minimo: AA_LARGE },

  { que: 'texto del botón primario', frente: '--primary-foreground', sobre: '--primary', minimo: AA_TEXT },
  { que: 'texto del botón primario en hover', frente: '--primary-foreground', sobre: '--primary-hover', minimo: AA_TEXT },
  { que: 'texto de la llamada a la acción', frente: '--cta-foreground', sobre: '--cta', minimo: AA_TEXT },
  /*
    Que el botón de la portada se distinga de la página, **con un mínimo que no sale de la
    norma**. La 1.4.11 pide 3:1 al contorno que hace falta para *identificar* un control, no
    al relleno de un botón que ya se identifica por su forma y su texto. Lo que hay que
    atrapar es el caso real: un navy sobre página oscura da 1.15:1 y ahí el botón desaparece.
  */
  { que: 'la llamada a la acción se distingue del fondo', frente: '--cta', sobre: '--background', minimo: 1.5 },

  { que: 'enlace sobre el fondo', frente: '--brand', sobre: '--background', minimo: AA_TEXT },
  { que: 'enlace en tarjeta', frente: '--brand', sobre: '--card', minimo: AA_TEXT },

  // Estados como TEXTO — el caso que originó los `*-strong`.
  { que: 'cifra en positivo en tarjeta', frente: '--success-strong', sobre: '--card', minimo: AA_TEXT },
  { que: 'aviso en ámbar en tarjeta', frente: '--warning-strong', sobre: '--card', minimo: AA_TEXT },
  { que: 'texto de error en tarjeta', frente: '--destructive-strong', sobre: '--card', minimo: AA_TEXT },

  // Estados como RELLENO: la tinta de encima tiene que sostenerse.
  { que: 'texto sobre el relleno de éxito', frente: '--success-foreground', sobre: '--success', minimo: AA_TEXT },
  { que: 'texto sobre el relleno de aviso', frente: '--warning-foreground', sobre: '--warning', minimo: AA_TEXT },
  { que: 'texto sobre el relleno de peligro', frente: '--destructive-foreground', sobre: '--destructive', minimo: AA_TEXT },
  { que: 'texto en la burbuja de Numi', frente: '--chat-bubble-foreground', sobre: '--chat-bubble', minimo: AA_TEXT },

  // El sidebar, que va oscuro en los dos modos.
  { que: 'navegación en el sidebar', frente: '--sidebar-foreground', sobre: '--sidebar', minimo: AA_TEXT },
  { que: 'grupo del sidebar', frente: '--sidebar-muted-foreground', sobre: '--sidebar', minimo: AA_TEXT },
  { que: 'fila activa del sidebar', frente: '--sidebar-accent-foreground', sobre: '--sidebar-accent', minimo: AA_TEXT },

  /*
    No textuales, a 3:1. **`--border` no está en la tabla, y es deliberado.** La 1.4.11 pide
    ese 3:1 a lo que identifica un control, no al separador entre una tarjeta y su fondo: el
    borde de hoy da 1.18:1 y es un borde perfectamente normal.
  */
  /*
    El icono de pérdida de «El desorden cuesta», que vive sobre el shell. Va a 3:1 y NO a
    4.5 porque es un icono: como texto da 3.70:1 en claro y por eso la cifra que acompaña
    se destaca con peso en vez de con color. Si algún día alguien quiere ese rojo como
    texto ahí, este par es donde se ve que no puede.
  */
  { que: 'icono de pérdida sobre el shell', frente: '--destructive-strong', sobre: '--sidebar', minimo: AA_LARGE },

  { que: 'anillo de foco sobre el fondo', frente: '--ring', sobre: '--background', minimo: AA_LARGE },
  { que: 'acento del sidebar', frente: '--sidebar-primary', sobre: '--sidebar', minimo: AA_LARGE },
]

/*
  Deuda conocida, anotada en vez de silenciada.

  El rojo de peligro en oscuro (`#ef4444`, el rojo 500 de Tailwind) con letra blanca encima
  da 3.76:1: por debajo de AA para texto normal, y es lo que hoy lleva un botón «Eliminar».
  En claro el mismo rol usa `#dc2626` y da 4.83:1, así que la salida, cuando se decida, es
  bajar el de oscuro a ese entorno.

  La lista no puede pudrirse: el último test exige que lo anotado siga fallando de verdad.
*/
const DEUDA_CONOCIDA: Record<string, readonly string[]> = {
  oscuro: ['texto sobre el relleno de peligro'],
}

function fallos(modo: keyof typeof MODOS, incluirDeuda = false): string[] {
  const tokens = MODOS[modo]
  const perdonados = new Set(incluirDeuda ? [] : (DEUDA_CONOCIDA[modo] ?? []))

  return PARES.filter((par) => !perdonados.has(par.que))
    .map((par) => {
      const frente = tokens[par.frente]
      const sobre = tokens[par.sobre]
      if (!frente || !sobre) throw new Error(`Falta un token del par «${par.que}» en ${modo}`)
      return { ...par, razon: contrast(frente, sobre) }
    })
    .filter((r) => r.razon < r.minimo)
    .map((r) => `${r.que}: ${r.razon.toFixed(2)}:1 (mínimo ${r.minimo}:1)`)
}

describe('los tokens de index.css', () => {
  /*
    Se recogen TODOS los fallos antes de romper. Un `expect` por par diría solo el primero,
    y ajustar colores a ciegas de uno en uno es como se pierde una tarde.
  */
  test.each(['claro', 'oscuro'] as const)('pasan AA en %s', (modo) => {
    expect(fallos(modo)).toEqual([])
  })
})

test('la deuda anotada sigue siendo deuda', () => {
  for (const [modo, pares] of Object.entries(DEUDA_CONOCIDA)) {
    const sinPerdonar = fallos(modo as keyof typeof MODOS, true)
    for (const par of pares) {
      expect(
        sinPerdonar.some((f) => f.startsWith(`${par}:`)),
        `«${par}» ya no falla en ${modo}: quita la excepción de DEUDA_CONOCIDA`,
      ).toBe(true)
    }
  }
})
