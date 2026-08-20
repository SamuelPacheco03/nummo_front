import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  catalogColorClass,
  catalogIcon,
  COLOR_LABELS,
  ICON_LABELS,
  type CatalogIdentity,
} from './catalogs'
import { IconColorPicker } from './icon-color-picker'

/**
 * **El icono y el color de un concepto de cobro o de una categoría de gasto.**
 *
 * Una sola pieza para los dos catálogos: lo que cambia entre ellos son las
 * palabras de alrededor, no esto (§94.0).
 *
 * En el formulario ocupa **una fila**: lo elegido, cómo se llama y un chevron.
 * La rejilla entera —veintidós colores y ciento sesenta y un iconos— vivía aquí
 * abierta, ocupaba más que los campos que de verdad hay que rellenar y en un
 * teléfono empujaba «Guardar» fuera de la pantalla. Ahora se abre en su propio
 * diálogo, que además puede buscar (§11.1.12).
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
  const [open, setOpen] = useState(false)
  const Preview = catalogIcon(value.icon) ?? fallback
  const iconName = value.icon ? ICON_LABELS[value.icon] : 'Sin icono propio'
  const colorName = value.color ? COLOR_LABELS[value.color] : 'Sin color'

  return (
    <div className="space-y-2">
      {/*
        Rótulo suelto y no `<Label>`: un `<label>` sin control asociado no nombra
        nada, y a un botón no se le nombra desde fuera. Lo que lee un lector de
        pantalla es el `aria-label`, que además dice **qué hay elegido** — leer
        solo «Icono y color» obligaría a entrar para saberlo.
      */}
      <p className="text-sm font-medium">Icono y color</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-label={`Icono y color: ${iconName}, ${colorName}`}
        className="bg-card hover:bg-secondary focus-visible:ring-ring/50 flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:opacity-50"
      >
        <span className="bg-secondary grid size-9 shrink-0 place-items-center rounded-lg">
          <Preview aria-hidden className={cn('size-4.5', catalogColorClass(value.color))} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{iconName}</span>
          <span className="text-muted-foreground block truncate text-xs">
            {colorName} · Toca para elegir
          </span>
        </span>
        <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0" />
      </button>

      <IconColorPicker
        open={open}
        onOpenChange={setOpen}
        value={value}
        onChange={onChange}
        fallback={fallback}
      />
    </div>
  )
}
