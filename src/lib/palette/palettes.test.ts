import { describe, expect, test } from 'vitest'
import { AA_LARGE, AA_TEXT, contrast } from './contrast'
import { PALETTES, type PaletteMode } from './palettes'
import { derive } from './tokens'

/**
 * La compuerta: **ninguna candidata se presenta a decisión sin pasar AA en los dos
 * modos.** Es la respuesta a que el teal diera 2.4:1 como texto y nadie lo notara hasta
 * que alguien fue a mirarlo a mano (§3.2).
 *
 * Se comprueba sobre los tokens DERIVADOS, no sobre las ranuras: lo que hay que
 * defender es lo que acaba pintado, y entre una cosa y la otra está `tokens.ts`.
 */

interface Par {
  /** Qué se está mirando, en el idioma de la pantalla y no en el de los tokens. */
  que: string
  /** Token del texto o del trazo. */
  frente: string
  /** Token de la superficie de debajo. */
  sobre: string
  minimo: number
}

/*
  Los pares que importan. Cada uno es una combinación que la consola pinta de verdad;
  no están todos los posibles, están los que se leen.
*/
const PARES: readonly Par[] = [
  // Texto sobre las tres superficies.
  { que: 'texto sobre el fondo', frente: '--foreground', sobre: '--background', minimo: AA_TEXT },
  { que: 'texto en tarjeta', frente: '--foreground', sobre: '--card', minimo: AA_TEXT },
  { que: 'texto en superficie sutil', frente: '--foreground', sobre: '--secondary', minimo: AA_TEXT },
  {
    que: 'texto secundario sobre el fondo',
    frente: '--muted-foreground',
    sobre: '--background',
    minimo: AA_TEXT,
  },
  {
    que: 'texto secundario en tarjeta',
    frente: '--muted-foreground',
    sobre: '--card',
    minimo: AA_TEXT,
  },

  // Rellenos de marca y de acción.
  {
    que: 'texto del botón primario',
    frente: '--primary-foreground',
    sobre: '--primary',
    minimo: AA_TEXT,
  },
  {
    que: 'texto del botón primario en hover',
    frente: '--primary-foreground',
    sobre: '--primary-hover',
    minimo: AA_TEXT,
  },
  { que: 'enlace sobre el fondo', frente: '--brand', sobre: '--background', minimo: AA_TEXT },
  { que: 'enlace en tarjeta', frente: '--brand', sobre: '--card', minimo: AA_TEXT },

  // Estados como TEXTO — el caso que originó `success-strong` y `warning-strong`.
  {
    que: 'cifra en positivo sobre el fondo',
    frente: '--success-strong',
    sobre: '--background',
    minimo: AA_TEXT,
  },
  {
    que: 'cifra en positivo en tarjeta',
    frente: '--success-strong',
    sobre: '--card',
    minimo: AA_TEXT,
  },
  {
    que: 'aviso en ámbar sobre el fondo',
    frente: '--warning-strong',
    sobre: '--background',
    minimo: AA_TEXT,
  },
  { que: 'aviso en ámbar en tarjeta', frente: '--warning-strong', sobre: '--card', minimo: AA_TEXT },
  {
    que: 'texto de error sobre el fondo',
    frente: '--destructive-strong',
    sobre: '--background',
    minimo: AA_TEXT,
  },
  {
    que: 'texto de error en tarjeta',
    frente: '--destructive-strong',
    sobre: '--card',
    minimo: AA_TEXT,
  },

  // Estados como RELLENO: la tinta que elige `inkOnFill` tiene que sostenerse.
  {
    que: 'texto sobre el relleno de éxito',
    frente: '--success-foreground',
    sobre: '--success',
    minimo: AA_TEXT,
  },
  {
    que: 'texto sobre el relleno de aviso',
    frente: '--warning-foreground',
    sobre: '--warning',
    minimo: AA_TEXT,
  },
  {
    que: 'texto sobre el relleno de peligro',
    frente: '--destructive-foreground',
    sobre: '--destructive',
    minimo: AA_TEXT,
  },
  {
    que: 'texto en la burbuja de Numi',
    frente: '--chat-bubble-foreground',
    sobre: '--chat-bubble',
    minimo: AA_TEXT,
  },

  // El sidebar, que va oscuro en los dos modos.
  {
    que: 'navegación en el sidebar',
    frente: '--sidebar-foreground',
    sobre: '--sidebar',
    minimo: AA_TEXT,
  },
  {
    que: 'grupo del sidebar',
    frente: '--sidebar-muted-foreground',
    sobre: '--sidebar',
    minimo: AA_TEXT,
  },
  {
    que: 'fila activa del sidebar',
    frente: '--sidebar-accent-foreground',
    sobre: '--sidebar-accent',
    minimo: AA_TEXT,
  },

  /*
    No textuales, a 3:1. **`--border` no está en la tabla, y es deliberado.** La 1.4.11
    pide ese 3:1 a lo que hace falta para *identificar un control* —el contorno de un
    campo, el de una casilla—, no a un separador entre una tarjeta y su fondo. El borde
    de hoy da 1.18:1 y es un borde perfectamente normal; exigirle 3:1 obligaría a una
    línea dura que ningún sistema usa para esto, y las tres candidatas «fallarían» por
    una regla inventada. Si un borde se vuelve invisible, eso se ve en el laboratorio,
    que para eso está.
  */
  { que: 'anillo de foco sobre el fondo', frente: '--ring', sobre: '--background', minimo: AA_LARGE },
  { que: 'acento del sidebar', frente: '--sidebar-primary', sobre: '--sidebar', minimo: AA_LARGE },
]

/*
  Deuda de la paleta que ya está en producción, no de la capa ni de las candidatas.

  El rojo de peligro en oscuro (`#ef4444`, el rojo 500 de Tailwind) con letra blanca
  encima da 3.76:1: por debajo de AA para texto normal, y es lo que hoy lleva un botón
  «Eliminar» en modo oscuro. Se anota en vez de silenciarse, y en vez de arreglarlo aquí
  de tapadillo: `azul` está para reproducir la consola tal y como es, y maquillarla
  rompería justo eso. En claro el mismo rol usa `#dc2626` y da 4.83:1, así que la
  salida, cuando se decida, es bajar el de oscuro a ese entorno.

  La lista no puede quedarse obsoleta: si esto se arregla, el último test de este
  archivo falla y obliga a borrar la entrada.
*/
const DEUDA_CONOCIDA: Partial<Record<string, Partial<Record<PaletteMode, readonly string[]>>>> = {
  azul: { dark: ['texto sobre el relleno de peligro'] },
}

const MODOS: readonly PaletteMode[] = ['light', 'dark']

/** Los pares que no llegan a su mínimo, ya descontada la deuda anotada. */
function fallos(paletteId: string, mode: PaletteMode, incluirDeuda = false): string[] {
  const palette = PALETTES.find((p) => p.id === paletteId)
  if (!palette) throw new Error(`Paleta desconocida: ${paletteId}`)
  const tokens = derive(palette, mode)
  const deuda = new Set(incluirDeuda ? [] : (DEUDA_CONOCIDA[paletteId]?.[mode] ?? []))

  return PARES.filter((par) => !deuda.has(par.que))
    .map((par) => ({ ...par, razon: contrast(tokens[par.frente], tokens[par.sobre]) }))
    .filter((r) => r.razon < r.minimo)
    .map((r) => `${r.que}: ${r.razon.toFixed(2)}:1 (mínimo ${r.minimo}:1)`)
}

describe.each(PALETTES)('la candidata «$name»', (palette) => {
  /*
    Se recogen TODOS los fallos antes de romper. Un `expect` por par diría solo el
    primero, y ajustar una paleta a ciegas de uno en uno es como se pierde una tarde.
  */
  test.each(MODOS)('pasa AA en %s', (mode) => {
    expect(fallos(palette.id, mode)).toEqual([])
  })
})

test('los pares se miden sobre tokens que existen', () => {
  const tokens = derive(PALETTES[0], 'light')
  const inexistentes = PARES.flatMap((p) => [p.frente, p.sobre]).filter((t) => !(t in tokens))
  expect([...new Set(inexistentes)]).toEqual([])
})

test('la deuda anotada sigue siendo deuda', () => {
  /*
    Cada entrada de `DEUDA_CONOCIDA` tiene que seguir fallando de verdad. El día que
    alguien arregle el rojo de oscuro, este test cae y le pide que borre la excepción
    — que es la única forma de que una lista de excepciones no se pudra.
  */
  for (const [paletteId, porModo] of Object.entries(DEUDA_CONOCIDA)) {
    for (const [mode, pares] of Object.entries(porModo ?? {})) {
      const sinPerdonar = fallos(paletteId, mode as PaletteMode, true)
      for (const par of pares) {
        expect(
          sinPerdonar.some((f) => f.startsWith(`${par}:`)),
          `«${par}» ya no falla en ${paletteId}/${mode}: quita la excepción de DEUDA_CONOCIDA`,
        ).toBe(true)
      }
    }
  }
})
