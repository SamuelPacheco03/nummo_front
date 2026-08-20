import { useState } from 'react'
import { Ban } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NativeSelect } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'
import {
  catalogColorClass,
  catalogIcon,
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
 * Dentro, dos decisiones:
 *
 * - **Un tema a la vez, elegido.** Con los once puestos uno detrás de otro había
 *   que recorrer ciento sesenta y un dibujos para ver el último, y el diálogo se
 *   volvía un rollo de papel. Se elige el tema y se ven los suyos; al abrir,
 *   el que ya está puesto (§11.1.12).
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
  const [theme, setTheme] = useState(() => themeOf(value.icon))
  const icons = CATALOG_ICON_GROUPS.find((group) => group.label === theme)?.icons ?? []

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
      </div>

      {/*
        Lo único que se desplaza, y solo hacia abajo. El acolchado no es estético:
        el aro de lo seleccionado se pinta **fuera** de la celda, y pegado al
        borde de un contenedor que recorta lo que sobresale salía cortado por la
        mitad en la primera columna y en la última.
      */}
      <div className="scrollbar-slim min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-lg border p-2">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1">
          {/*
            «Sin icono» va **dentro de la rejilla y siempre**, no en una sección
            propia: quitar el icono es una opción más, y con sección propia era
            un título con un solo botón debajo.
          */}
          <IconCell
            Icon={Ban}
            label="Sin icono"
            selected={value.icon == null}
            onSelect={() => onChange({ ...value, icon: null })}
          />
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
