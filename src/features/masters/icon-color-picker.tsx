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
} from './catalogs'

/** Un objetivo de 44 px con el glifo a tamaño de texto dentro (§43). */
const CELL =
  'grid size-9 place-items-center rounded-md transition-colors pointer-coarse:size-11 focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none'

/**
 * **Elegir el icono y el color de un catálogo, en su propio diálogo.**
 *
 * Vivía dentro del formulario, abierto: veintidós colores y ciento sesenta y un
 * iconos ocupaban más que los campos que de verdad hay que rellenar, y en un
 * teléfono empujaban «Guardar» fuera de la pantalla. Ahora el formulario enseña
 * una fila —lo elegido y un botón— y todo esto se abre solo cuando hace falta.
 *
 * Dentro, tres decisiones:
 *
 * - **Se busca por palabra, no por dibujo.** Las claves del contrato son
 *   inglesas (`piggy-bank`), así que la búsqueda va contra el nombre en español,
 *   los sinónimos del negocio —«arriendo», «nómina», «pensión»— y el grupo.
 * - **Los iconos van por temas** (§11.1.12): recorrer ciento sesenta y uno seguidos
 *   no es elegir, es rendirse en el veinte.
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
  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0

  const groups = useMemo(
    () =>
      CATALOG_ICON_GROUPS.map((group) => ({
        ...group,
        icons: group.icons.filter((icon) => iconMatches(icon, query)),
      })).filter((group) => group.icons.length > 0),
    [query],
  )

  const Preview = catalogIcon(value.icon) ?? fallback

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Alto fijo: la rejilla es lo que crece, no el diálogo. */}
      <DialogContent className="flex flex-col gap-4 overflow-y-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Icono y color</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <span className="bg-secondary grid size-10 shrink-0 place-items-center rounded-lg">
            <Preview aria-hidden className={cn('size-5', catalogColorClass(value.color))} />
          </span>
          <p className="text-muted-foreground text-sm">
            {value.icon ? 'Así se verá en las listas.' : 'Sin icono propio: se usa el de la sección.'}
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

        <div className="relative">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar icono: arriendo, nómina, gasolina…"
            aria-label="Buscar icono"
            className="pl-9"
          />
        </div>

        {/* Lo único que se desplaza. */}
        <div className="scrollbar-slim min-h-0 flex-1 space-y-4 overflow-y-auto">
          {!searching && (
            <Group label="Sin icono propio">
              <IconCell
                Icon={Ban}
                label="Sin icono"
                selected={value.icon == null}
                onSelect={() => onChange({ ...value, icon: null })}
              />
            </Group>
          )}

          {groups.map((group) => (
            <Group key={group.label} label={group.label}>
              {group.icons.map((icon) => {
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
            </Group>
          ))}

          {groups.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Ningún icono se llama así. Prueba con lo que es —«casa», «carro»— o con el gasto
              —«arriendo», «matrícula»—.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5" role="group" aria-label={label}>
      <h3 className="text-muted-foreground text-xs tracking-wider uppercase">{label}</h3>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1">{children}</div>
    </div>
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
      className={cn(CELL, 'size-8 pointer-coarse:size-11', selected && 'ring-ring ring-2')}
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
        'hover:bg-secondary',
        selected ? 'bg-secondary ring-ring ring-2' : 'text-muted-foreground',
      )}
    >
      <Icon aria-hidden className="size-4" />
    </button>
  )
}
