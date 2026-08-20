import { Ban } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  catalogColorClass,
  catalogIcon,
  CATALOG_COLORS,
  CATALOG_ICONS,
  type ColorKey,
  type IconKey,
} from './catalogs'

/**
 * Lo que elige esta pieza. `null` en cualquiera de los dos es «sin poner».
 *
 * Va tipado contra los enums del contrato y no como `string`: es lo que hace que
 * el objeto entre tal cual en el cuerpo del `POST` y que una clave inventada no
 * llegue nunca al API.
 */
export interface CatalogIdentity {
  icon: IconKey | null
  color: ColorKey | null
}

/** Un objetivo de 44 px con el glifo a tamaño de texto dentro (§43). */
const CELL =
  'grid size-9 place-items-center rounded-md transition-colors pointer-coarse:size-11 focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none'

/**
 * **El icono y el color de un concepto de cobro o de una categoría de gasto.**
 *
 * Una sola pieza para los dos catálogos: lo que cambia entre ellos son las
 * palabras de alrededor, no esto (§94.0).
 *
 * Los dos catálogos —84 iconos, 18 colores— **salen del contrato**
 * (`catalog-icon.tsx`), no de una lista escrita aquí: el backend los publica
 * como enums cerrados precisamente para que el cliente los pueda dibujar todos.
 *
 * **«Sin poner» es una opción visible en los dos**, y no el hueco que queda al
 * no elegir: un catálogo que nace sin identidad es lo normal —las
 * organizaciones que ya existían tienen los dos en `null`— y hace falta poder
 * volver ahí.
 */
export function IdentityField({
  value,
  onChange,
  fallback,
  disabled,
}: {
  value: CatalogIdentity
  onChange: (next: CatalogIdentity) => void
  /** El icono de la sección, que es lo que se ve mientras no haya uno propio. */
  fallback: LucideIcon
  disabled?: boolean
}) {
  const Preview = catalogIcon(value.icon) ?? fallback

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Icono y color</span>
        {/* Lo elegido, al tamaño al que se va a ver en la lista. */}
        <Preview aria-hidden className={cn('size-5', catalogColorClass(value.color))} />
        <span className="text-muted-foreground text-xs">
          {value.icon ? 'Así se verá en las listas' : 'Sin icono propio'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Color">
        <ColorSwatch
          color={null}
          selected={value.color == null}
          disabled={disabled}
          onSelect={() => onChange({ ...value, color: null })}
        />
        {CATALOG_COLORS.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            selected={value.color === color}
            disabled={disabled}
            onSelect={() => onChange({ ...value, color })}
          />
        ))}
      </div>

      {/*
        Los 84 caben en una rejilla con scroll de unos cinco renglones. Un
        desplegable los escondería detrás de un clic más y una búsqueda por
        nombre pediría saber cómo se llama cada dibujo en inglés.
      */}
      <div
        role="group"
        aria-label="Icono"
        className="scrollbar-slim grid max-h-44 grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1 overflow-y-auto rounded-md border p-2"
      >
        <IconCell
          Icon={Ban}
          label="Sin icono"
          selected={value.icon == null}
          disabled={disabled}
          onSelect={() => onChange({ ...value, icon: null })}
        />
        {CATALOG_ICONS.map((icon) => {
          const Icon = catalogIcon(icon)
          if (!Icon) return null
          return (
            <IconCell
              key={icon}
              Icon={Icon}
              label={icon}
              selected={value.icon === icon}
              disabled={disabled}
              onSelect={() => onChange({ ...value, icon })}
            />
          )
        })}
      </div>
    </div>
  )
}

function ColorSwatch({
  color,
  selected,
  disabled,
  onSelect,
}: {
  color: ColorKey | null
  selected: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={color ?? 'Sin color'}
      className={cn(CELL, 'size-7 pointer-coarse:size-11', selected && 'ring-ring ring-2')}
    >
      {/*
        `bg-current` hereda el color del texto, así que la muestra sale de la
        misma tabla que el icono en vez de pedir una segunda con los fondos.
      */}
      <span className={cn('size-5 rounded-full bg-current', catalogColorClass(color))} />
    </button>
  )
}

function IconCell({
  Icon,
  label,
  selected,
  disabled,
  onSelect,
}: {
  Icon: LucideIcon
  label: string
  selected: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label}
      className={cn(
        CELL,
        'hover:bg-secondary',
        selected ? 'bg-secondary ring-ring ring-2' : 'text-muted-foreground',
      )}
    >
      <Icon aria-hidden className="size-4" />
    </button>
  )
}
