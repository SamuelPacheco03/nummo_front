import { describe, expect, it } from 'vitest'
import { Coins } from 'lucide-react'
import {
  catalogColorClass,
  catalogIcon,
  catalogRowIcon,
  CATALOG_COLORS,
  CATALOG_ICONS,
  CATALOG_SORT_CHOICES,
} from './catalogs'

/*
  Las dos tablas traducen enums cerrados del contrato. Lo que hay que sujetar no
  es cada entrada —el `Record` tipado ya obliga a que estén todas— sino que
  ninguna se quede sin traducir y que lo desconocido no rompa una fila.
*/

describe('el catálogo de iconos', () => {
  it('tiene los 84 del contrato y todos resuelven a un glifo', () => {
    expect(CATALOG_ICONS).toHaveLength(84)
    expect(CATALOG_ICONS.filter((key) => !catalogIcon(key))).toEqual([])
  })

  it('sin icono no devuelve uno inventado: lo elige quien pinta', () => {
    // Un reemplazo genérico aquí escondería que ese registro todavía no tiene
    // identidad propia; la lista pone el de su sección.
    expect(catalogIcon(null)).toBeUndefined()
    expect(catalogIcon(undefined)).toBeUndefined()
    expect(catalogIcon('el-que-venga')).toBeUndefined()
  })
})

describe('el catálogo de colores', () => {
  it('tiene los 18 del contrato', () => {
    expect(CATALOG_COLORS).toHaveLength(18)
  })

  it('cada color trae su variante oscura', () => {
    // Un `-600` sobre la superficie oscura se lee mal, y el color es justo lo
    // que aquí hay que distinguir de un vistazo.
    for (const color of CATALOG_COLORS) {
      expect(catalogColorClass(color)).toMatch(/dark:text-/)
    }
  })

  it('sin color, el del texto apagado; una clave rara, lo mismo', () => {
    expect(catalogColorClass(null)).toBe('text-muted-foreground')
    expect(catalogColorClass('turquesa')).toBe('text-muted-foreground')
  })
})

describe('el orden que ofrecen estos dos catálogos', () => {
  it('empieza por el propio, que es el del contrato', () => {
    // §18.1: una lista ordena por todo lo que su endpoint acepta, ni una menos.
    expect(CATALOG_SORT_CHOICES.map((choice) => choice.field)).toEqual([
      'position',
      'name',
      'createdAt',
    ])
  })

  it('ninguna dirección se llama «ascendente»', () => {
    // §21.1: «ascendente» no dice nada de un orden propio ni de una fecha.
    for (const choice of CATALOG_SORT_CHOICES) {
      expect(choice.asc).not.toMatch(/ascendente|descendente/i)
      expect(choice.desc).not.toMatch(/ascendente|descendente/i)
    }
  })
})

describe('el icono de una fila que pertenece a un catálogo', () => {
  it('pinta el del concepto, con su color', () => {
    const concepto = { id: 'k1', name: 'Internet', icon: 'wifi', color: 'blue' }
    expect(catalogRowIcon(concepto, Coins)).toEqual({
      Icon: catalogIcon('wifi'),
      className: catalogColorClass('blue'),
    })
  })

  it('sin color no manda ninguna clase: la pastilla conserva su tono', () => {
    // `RowIconBadge` suma la clase al tono, así que mandar el gris de «sin
    // color» sería repetir lo que el tono neutro ya dice.
    const sinColor = { id: 'k1', name: 'Internet', icon: 'wifi' }
    expect(catalogRowIcon(sinColor, Coins).className).toBeUndefined()
  })

  it('sin catálogo —o mientras no llega— el icono de la sección', () => {
    expect(catalogRowIcon(undefined, Coins)).toEqual({ Icon: Coins, className: undefined })
    expect(catalogRowIcon({ id: 'k1', name: 'Otros' }, Coins).Icon).toBe(Coins)
  })
})
