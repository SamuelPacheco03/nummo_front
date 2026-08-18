import { useState } from 'react'
import { Building2, Check, ChevronsUpDown, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SearchInput } from '@/components/search-input'
import { useContact, useContacts } from '@/features/contacts/hooks'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'

/** Combobox para seleccionar un contacto de la organización (resuelve su propio label). */
export function ContactPicker({
  orgId,
  value,
  onChange,
  label,
  placeholder = 'Seleccionar contacto…',
  allowClear,
  invalid,
}: {
  orgId: string
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Cómo se llama este selector. **Obligatorio de hecho**: sin él el
   * `combobox` se anuncia por su contenido —«Seleccionar contacto…»— y dos
   * pickers juntos, como el pagador y el beneficiario de un acuerdo, suenan
   * exactamente igual. El `Field` de al lado no puede prestárselo: es un
   * `<label>` y esto es un botón, no un campo nativo.
   */
  label: string
  placeholder?: string
  allowClear?: boolean
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)

  const { contact: selected } = useContact(orgId, value ?? undefined)
  const { contacts } = useContacts(orgId, {
    page: 1,
    pageSize: 8,
    q: q || undefined,
    isActive: 'true',
    sort: 'name',
    order: 'asc',
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label={label}
          aria-invalid={invalid}
          className="w-full justify-between gap-2 font-normal"
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value ? (selected?.displayName ?? '…') : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar contacto…" className="mb-2" />
        <div className="max-h-56 space-y-0.5 overflow-y-auto">
          {allowClear && value && (
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
            >
              <X className="size-4" />
              Quitar selección
            </button>
          )}
          {contacts.length === 0 ? (
            <p className="p-3 text-center text-sm text-muted-foreground">Sin resultados.</p>
          ) : (
            contacts.map((c) => {
              const Icon = c.contactType === 'COMPANY' ? Building2 : User
              const isSelected = value === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id)
                    setSearch('')
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                    isSelected && 'bg-secondary',
                  )}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.displayName}</span>
                  {isSelected && <Check className="ml-auto size-4 text-brand" />}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
