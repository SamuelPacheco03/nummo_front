import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { CornerDownLeft, Search, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Loader } from '@/components/ui/loader'
import { allowedQuickActions } from '@/features/actions/quick-actions'
import { useNumiStore } from '@/features/assistant/numi-store'
import { GROUPS as SETTINGS_GROUPS } from '@/features/config/settings-nav'
import { useContacts } from '@/features/contacts/hooks'
import { SECTIONS } from '@/features/navigation/sections'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'

type Command = {
  id: string
  label: string
  hint?: string
  Icon: LucideIcon
  run: () => void
}

type CommandGroup = { title: string; items: Command[] }

/** Coincidencia laxa: sin acentos, sin mayúsculas, por subcadena. */
function matches(haystack: string, needle: string): boolean {
  if (!needle) return true
  const norm = (t: string) =>
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  return norm(haystack).includes(norm(needle))
}

/**
 * Punto de entrada universal (§36): buscar, ir a una sección, registrar una
 * operación o preguntarle a Numi — todo desde el mismo sitio.
 *
 * Se construye sobre el `Dialog` que ya existe en vez de traer una librería de
 * paleta de comandos: §63 pide comprobar primero si el proyecto ya resuelve el
 * problema, y aquí lo único que faltaba era el teclado.
 *
 * La opción de Numi va **siempre la última y siempre presente**: es el destino
 * de lo que la aplicación no sabe resolver, y §35 obliga a que sea el usuario
 * quien decida preguntar, no un fallback silencioso.
 */
export function CommandBar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { orgId, role } = useCurrentOrg()
  const openNumi = useNumiStore((s) => s.open)

  // Solo se busca en el servidor cuando hay algo que buscar.
  const q = useDebouncedValue(query.trim(), 250)
  const { contacts, isFetching } = useContacts(q ? orgId : undefined, {
    page: 1,
    pageSize: 5,
    q,
    sort: 'name',
    order: 'asc',
  })

  const go = (to: string) => {
    onOpenChange(false)
    navigate(to)
  }

  const groups = useMemo<CommandGroup[]>(() => {
    const result: CommandGroup[] = []

    const actions = allowedQuickActions(role)
      .filter((a) => matches(`${a.label} ${a.description}`, q))
      .map<Command>((a) => ({
        id: `action:${a.to}`,
        label: a.label,
        hint: a.description,
        Icon: a.Icon,
        run: () => go(a.to),
      }))
    if (actions.length > 0) result.push({ title: 'Registrar', items: actions })

    if (contacts.length > 0) {
      result.push({
        title: 'Contactos',
        items: contacts.map<Command>((c) => ({
          id: `contact:${c.id}`,
          label: c.displayName,
          Icon: Search,
          run: () => go(`/contactos/${c.id}`),
        })),
      })
    }

    const destinations = [
      ...SECTIONS.flatMap((section) =>
        section.items.map((item) => ({ ...item, group: section.title })),
      ),
      ...SETTINGS_GROUPS.flatMap((group) =>
        group.items.map((item) => ({ ...item, group: `Configuración · ${group.title}` })),
      ),
    ]
      .filter((item) => matches(`${item.label} ${item.group ?? ''}`, q))
      .map<Command>((item) => ({
        id: `nav:${item.to}`,
        label: item.label,
        hint: item.group,
        Icon: item.Icon,
        run: () => go(item.to),
      }))
    if (destinations.length > 0) result.push({ title: 'Ir a', items: destinations })

    result.push({
      title: 'Asistente',
      items: [
        {
          id: 'numi',
          label: q ? `Preguntarle a Numi: “${q}”` : 'Preguntarle algo a Numi',
          Icon: Sparkles,
          run: () => {
            onOpenChange(false)
            openNumi()
          },
        },
      ],
    })

    return result
    // `go` y `openNumi` son estables para lo que aquí importa; recalcular por
    // ellos solo reordenaría la lista bajo el dedo del usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role, contacts])

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])

  // Cambiar el texto reinicia la selección: si no, el resaltado se queda en un
  // índice que ya apunta a otra cosa.
  useEffect(() => {
    setActive(0)
  }, [q, contacts.length])

  // Al cerrar se olvida la consulta: la paleta siempre abre limpia.
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % flat.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + flat.length) % flat.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      flat[active]?.run()
    }
  }

  let index = -1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[10%] max-w-lg translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Buscar o preguntarle algo a Numi</DialogTitle>

        <div className="flex items-center gap-2 border-b px-3">
          <Search aria-hidden className="text-muted-foreground size-4 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar o preguntarle algo a Numi…"
            aria-label="Buscar o preguntarle algo a Numi"
            aria-controls="command-results"
            className="h-12 flex-1 bg-transparent text-sm outline-none"
          />
          {isFetching && <Loader size="sm" label="Buscando" />}
        </div>

        <div id="command-results" ref={listRef} role="listbox" className="scrollbar-slim max-h-80 overflow-y-auto p-2">
          {groups.map((group) => (
            <div key={group.title} className="mb-1">
              <div className="text-muted-foreground px-2 py-1 text-[0.68rem] font-medium tracking-wider uppercase">
                {group.title}
              </div>
              {group.items.map((item) => {
                index += 1
                const isActive = index === active
                const at = index
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    onMouseEnter={() => setActive(at)}
                    onClick={item.run}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors',
                      isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <item.Icon aria-hidden className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.hint && (
                      <span className="text-muted-foreground hidden truncate text-xs sm:block">
                        {item.hint}
                      </span>
                    )}
                    {isActive && <CornerDownLeft aria-hidden className="size-3.5 shrink-0" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
