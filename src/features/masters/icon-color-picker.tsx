import { useMemo, useState } from 'react'
import { Ban, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  catalogColorClass,
  catalogIcon,
  iconMatches,
  CATALOG_COLORS,
  CATALOG_ICON_GROUPS,
  COLOR_LABELS,
  ICON_LABELS,
  type CatalogIdentity,
  type ColorKey,
  type IconKey,
} from './catalogs'

/** Objetivo táctil holgado (§43) y el glifo a tamaño de texto dentro. */
const CELL =
  'grid place-items-center rounded-md transition-colors focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none'

/** En qué tema vive un icono, para abrir el selector donde está el elegido. */
function themeOf(icon: IconKey | null): string {
  const group = CATALOG_ICON_GROUPS.find((g) => icon != null && g.icons.includes(icon))
  return (group ?? CATALOG_ICON_GROUPS[0]).label
}

/**
 * **Elegir el icono y el color de un catálogo, en su propio diálogo.**
 *
 * Vivía dentro del formulario, abierto: veintidós colores y ciento sesenta y un
 * iconos ocupaban más que los campos que de verdad hay que rellenar, y en un
 * teléfono empujaban «Guardar» fuera de la pantalla.
 *
 * Dentro, tres decisiones:
 *
 * - **Un tema a la vez, elegido.** Con los once puestos uno detrás de otro había
 *   que recorrer ciento sesenta y un dibujos para ver el último, y el diálogo se
 *   volvía un rollo de papel. Se elige el tema y se ven los suyos; al abrir,
 *   el que ya está puesto (§11.1.12).
 * - **Se busca por palabra, no por dibujo.** Las claves del contrato son
 *   inglesas (`piggy-bank`), así que la búsqueda va contra el nombre en español,
 *   los sinónimos del negocio —«arriendo», «nómina», «pensión»— y el tema. Y
 *   busca **en todos**: quien escribe «vacuna» no sabe en qué tema cayó, así que
 *   mientras hay texto el tema se calla y se dice cuántos hay.
 * - **Se aplica al tocar, no al aceptar.** Es un selector, no un formulario: el
 *   cambio se ve al instante en la muestra de arriba y «Listo» solo cierra. Lo
 *   que se descarta —o no— lo decide el formulario de fuera, que es quien
 *   guarda.
 */
export function IconColorPicker({
  open,
  onOpenChange,
  value,
  onChange,
  fallback,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: CatalogIdentity
  onChange: (next: CatalogIdentity) => void
  /** El icono de la sección, que es lo que se ve mientras no haya uno propio. */
  fallback: LucideIcon
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Alto fijo: la rejilla es lo que crece, no el diálogo (§11.1.3). */}
      <DialogContent className="flex flex-col gap-4 overflow-y-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Icono y color</DialogTitle>
        </DialogHeader>
        {/*
          El cuerpo se monta al abrir y se desmonta al cerrar —lo hace `Dialog`—,
          así que su estado nace limpio cada vez: sin esto, la búsqueda de la vez
          anterior seguía escrita y el tema seguía siendo el de otro registro.
        */}
        <PickerBody
          value={value}
          onChange={onChange}
          fallback={fallback}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function PickerBody({
  value,
  onChange,
  fallback,
  onDone,
}: {
  value: CatalogIdentity
  onChange: (next: CatalogIdentity) => void
  fallback: LucideIcon
  onDone: () => void
}) {
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState(() => themeOf(value.icon))
  const searching = query.trim().length > 0

  const icons = useMemo(() => {
    if (searching) {
      return CATALOG_ICON_GROUPS.flatMap((group) => group.icons).filter((icon) =>
        iconMatches(icon, query),
      )
    }
    return CATALOG_ICON_GROUPS.find((group) => group.label === theme)?.icons ?? []
  }, [query, searching, theme])

  const Preview = catalogIcon(value.icon) ?? fallback

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="bg-secondary grid size-10 shrink-0 place-items-center rounded-lg">
          <Preview aria-hidden className={cn('size-5', catalogColorClass(value.color))} />
        </span>
        <p className="text-muted-foreground text-sm">
          {value.icon
            ? `${ICON_LABELS[value.icon]} · ${value.color ? COLOR_LABELS[value.color] : 'sin color'}`
            : 'Sin icono propio: se usa el de la sección.'}
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-muted-foreground text-xs tracking-wider uppercase">Color</h3>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Color">
          <ColorSwatch
            color={null}
            selected={value.color == null}
            onSelect={() => onChange({ ...value, color: null })}
          />
          {CATALOG_COLORS.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              selected={value.color === color}
              onSelect={() => onChange({ ...value, color })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-muted-foreground text-xs tracking-wider uppercase">Icono</h3>

        <div className="relative">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar: arriendo, nómina, gasolina…"
            aria-label="Buscar icono"
            className="pl-9"
          />
        </div>

        {searching ? (
          <p className="text-muted-foreground text-sm" role="status">
            {icons.length === 0
              ? 'Ningún icono se llama así.'
              : `${plural(icons.length, 'icono', 'iconos')} en todos los temas`}
          </p>
        ) : (
          <NativeSelect
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            aria-label="Tema"
          >
            {CATALOG_ICON_GROUPS.map((group) => (
              <option key={group.label} value={group.label}>
                {group.label}
              </option>
            ))}
          </NativeSelect>
        )}
      </div>

      {/* Lo único que se desplaza, y solo hacia abajo. */}
      <div className="scrollbar-slim min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1">
          {/*
            «Sin icono» va **dentro de la rejilla y siempre**, no en una sección
            propia: quitar el icono es una opción más, y con sección propia era
            un título con un solo botón debajo. Al buscar no aparece, que no es
            un resultado.
          */}
          {!searching && (
            <IconCell
              Icon={Ban}
              label="Sin icono"
              selected={value.icon == null}
              onSelect={() => onChange({ ...value, icon: null })}
            />
          )}
          {icons.map((icon) => {
            const Icon = catalogIcon(icon)
            if (!Icon) return null
            return (
              <IconCell
                key={icon}
                Icon={Icon}
                label={ICON_LABELS[icon]}
                selected={value.icon === icon}
                onSelect={() => onChange({ ...value, icon })}
              />
            )
          })}
        </div>

        {searching && icons.length === 0 && (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Prueba con lo que es —«casa», «carro»— o con el gasto —«arriendo», «matrícula»—.
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" onClick={onDone}>
          Listo
        </Button>
      </DialogFooter>
    </>
  )
}

function ColorSwatch({
  color,
  selected,
  onSelect,
}: {
  color: ColorKey | null
  selected: boolean
  onSelect: () => void
}) {
  const label = color ? COLOR_LABELS[color] : 'Sin color'
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={cn(CELL, 'size-8 pointer-coarse:size-10', selected && 'ring-ring ring-2')}
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
  onSelect,
}: {
  Icon: LucideIcon
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={cn(
        CELL,
        // Cuadrada y **del ancho de su columna**: con un tamaño fijo más grande
        // que la columna —lo que pasaba con el objetivo táctil— la rejilla se
        // salía del diálogo y aparecía un desplazamiento horizontal.
        'aspect-square w-full hover:bg-secondary',
        selected ? 'bg-secondary ring-ring ring-2' : 'text-muted-foreground',
      )}
    >
      <Icon aria-hidden className="size-4.5" />
    </button>
  )
}
