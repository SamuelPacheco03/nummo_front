import { useState } from 'react'
import { Building2, Check, ChevronsUpDown, Plus, User, X } from 'lucide-react'
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
  newName,
  onNewName,
  label,
  placeholder = 'Seleccionar contacto…',
  allowClear,
  invalid,
}: {
  orgId: string
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Un nombre escrito para alguien que **todavía no está en la agenda**.
   *
   * Van los dos por separado y no un valor mezclado porque es exactamente lo
   * que dice el contrato: `payerContactId` **o** `payerName`, uno de los dos.
   * Quien llama tiene los dos campos y se encarga de limpiar el otro.
   */
  newName?: string | null
  /**
   * Si se pasa, el selector ofrece «crear "Netflix"» al final de la búsqueda.
   *
   * Solo donde el endpoint lo acepta —el alta de un acuerdo o de un recurrente—
   * y **solo para empresas**: una persona necesita su documento y su teléfono,
   * y eso es el formulario de contacto entero.
   */
  onNewName?: (name: string) => void
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
  const typed = search.trim()
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
          <span className={cn('truncate', !value && !newName && 'text-muted-foreground')}>
            {value ? (selected?.displayName ?? '…') : (newName ?? placeholder)}
          </span>
          {/* Que va a crearse se dice aquí y no solo dentro del desplegable: al
              cerrarlo, un nombre suelto se lee igual que uno ya existente. */}
          {!value && newName && (
            <span className="text-muted-foreground shrink-0 text-xs">nuevo</span>
          )}
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
          {/*
            La opción de crear va **al final**, después de lo que ya existe: la
            primera respuesta a «Netflix» tiene que ser el Netflix que ya está en
            la agenda, no uno nuevo al lado.
          */}
          {contacts.length === 0 && !(onNewName && typed) ? (
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

          {onNewName && typed && !contacts.some((c) => c.displayName.toLowerCase() === typed.toLowerCase()) && (
            <button
              type="button"
              onClick={() => {
                /*
                  Aquí **no** se llama a `onChange(null)`: quien recibe el nombre
                  es el que limpia el id, igual que quien recibe un id limpia el
                  nombre. Llamar a los dos desde aquí borraba lo que se acababa
                  de poner, porque el formulario limpia el nombre en `onChange`.
                */
                onNewName(typed)
                setSearch('')
                setOpen(false)
              }}
              className="hover:bg-accent mt-0.5 flex w-full items-start gap-2 rounded-sm border-t px-2 pt-2 pb-1.5 text-left text-sm"
            >
              <Plus className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate">Crear «{typed}»</span>
                <span className="text-muted-foreground block text-xs">
                  Se añade a la agenda como empresa
                </span>
              </span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
