import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ArrowLeft, CornerDownLeft, Search, Sparkles, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Loader } from '@/components/ui/loader'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { allowedQuickActions } from '@/features/actions/quick-actions'
import { useNumiStore } from '@/features/assistant/numi-store'
import { GROUPS as SETTINGS_GROUPS } from '@/features/config/settings-nav'
import { SECTIONS } from '@/features/navigation/sections'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { useCan } from '@/features/platform/permissions'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'
import { useRecents, type RecentItem } from './recents'
import { useGlobalSearch } from './use-global-search'

type Command = {
  id: string
  label: string
  /** Segunda línea o pista a la derecha, según el sitio. */
  hint?: string
  Icon: LucideIcon
  amount?: string
  status?: { label: string; tone: StatusTone }
  /** Pares etiqueta-valor de la vista previa. Sin ellos no hay panel derecho. */
  details?: { label: string; value: string }[]
  /** Acción secundaria que se dispara con `⇥`. */
  action?: { label: string; to: string }
  /** Qué guardar en recientes al abrirlo. */
  recent?: RecentItem
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
      .replace(/[̀-ͯ]/g, '')
  return norm(haystack).includes(norm(needle))
}

/**
 * Las acciones **de la pantalla en la que estás**, para encabezar la paleta
 * vacía.
 *
 * Sin texto, la paleta enseñaba veinte destinos: toda la navegación y todas las
 * acciones, sin un orden que significara nada. Quien la abre desde cuentas por
 * cobrar casi siempre viene a registrar un cobro, no a irse a Configuración.
 */
const SECTION_ACTIONS: { prefix: string; title: string; actions: string[] }[] = [
  {
    prefix: '/cartera/cxc',
    title: 'En cuentas por cobrar',
    actions: ['/cartera/pagos/nuevo', '/cartera/cxc?nueva=1'],
  },
  { prefix: '/cartera/pagos', title: 'En pagos', actions: ['/cartera/pagos/nuevo'] },
  { prefix: '/cartera/acuerdos', title: 'En acuerdos', actions: ['/cartera/acuerdos/nuevo'] },
  { prefix: '/gastos/cxp', title: 'En cuentas por pagar', actions: ['/gastos/egresos/nuevo'] },
  { prefix: '/gastos/egresos', title: 'En egresos', actions: ['/gastos/egresos/nuevo'] },
  { prefix: '/contactos', title: 'En contactos', actions: ['/contactos/nuevo'] },
  { prefix: '/caja', title: 'En caja', actions: ['/caja/cuentas?transferir=1'] },
]

/**
 * Punto de entrada universal (§36): buscar, ir a una sección, registrar una
 * operación o preguntarle a Numi — todo desde el mismo sitio.
 *
 * **Busca de verdad** (`useGlobalSearch`): contactos, cuentas por cobrar y por
 * pagar, pagos y egresos. Antes solo consultaba contactos, así que lo que uno
 * teclea —el nombre de quien debe algo, para encontrar *ese* cobro— no aparecía.
 *
 * Dos formas, un solo componente:
 *
 * - **Escritorio**: paleta a dos columnas. Resultados a la izquierda y la ficha
 *   del seleccionado a la derecha, con su acción principal. Se encuentra y se
 *   resuelve sin salir.
 * - **Móvil**: pantalla completa. Con el teclado abierto, un diálogo centrado
 *   dejaba visibles tres o cuatro filas; a pantalla completa caben las que hay.
 *
 * La opción de Numi va **siempre la última y siempre presente**: es el destino
 * de lo que la aplicación no sabe resolver, y §35 obliga a que sea el usuario
 * quien decida preguntar, no un fallback silencioso.
 */
export function CommandBar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const openNumi = useNumiStore((s) => s.open)
  const recents = useRecents((s) => s.items)
  const remember = useRecents((s) => s.remember)

  const q = useDebouncedValue(query.trim(), 250)
  const { groups: results, isFetching } = useGlobalSearch(orgId, q)

  const go = (to: string) => {
    onOpenChange(false)
    navigate(to)
  }

  const groups = useMemo<CommandGroup[]>(() => {
    const result: CommandGroup[] = []
    const quick = allowedQuickActions(can)

    if (!q) {
      /* Sin texto: lo de aquí y lo de ayer, en vez del catálogo entero. */
      const section = SECTION_ACTIONS.find((s) => pathname.startsWith(s.prefix))
      const here = section
        ? section.actions
            .map((to) => quick.find((a) => a.to === to))
            .filter((a) => a !== undefined)
        : []
      if (here.length > 0) {
        result.push({
          title: section?.title ?? 'Registrar',
          items: here.map((a) => ({
            id: `action:${a.to}`,
            label: a.label,
            hint: a.description,
            Icon: a.Icon,
            run: () => go(a.to),
          })),
        })
      }

      if (recents.length > 0) {
        result.push({
          title: 'Recientes',
          items: recents.map((r) => ({
            id: r.id,
            label: r.label,
            hint: r.kind,
            Icon: Search,
            run: () => go(r.to),
          })),
        })
      }

      result.push({
        title: 'Registrar',
        items: quick
          .filter((a) => !here.includes(a))
          .map((a) => ({
            id: `action:${a.to}`,
            label: a.label,
            hint: a.description,
            Icon: a.Icon,
            run: () => go(a.to),
          })),
      })
    } else {
      const actions = quick
        .filter((a) => matches(`${a.label} ${a.description}`, q))
        .map<Command>((a) => ({
          id: `action:${a.to}`,
          label: a.label,
          hint: a.description,
          Icon: a.Icon,
          run: () => go(a.to),
        }))
      if (actions.length > 0) result.push({ title: 'Registrar', items: actions })

      for (const group of results) {
        result.push({
          title: group.title,
          items: group.items.map<Command>((hit) => ({
            id: hit.id,
            label: hit.label,
            hint: hit.meta,
            Icon: hit.Icon,
            amount: hit.amount,
            status: hit.status,
            details: hit.details,
            action: hit.action,
            recent: { id: hit.id, label: hit.label, kind: group.title, to: hit.to },
            run: () => go(hit.to),
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
          recent: { id: `nav:${item.to}`, label: item.label, kind: 'Sección', to: item.to },
          run: () => go(item.to),
        }))
      if (destinations.length > 0) result.push({ title: 'Ir a', items: destinations })
    }

    result.push({
      title: 'Asistente',
      items: [
        {
          id: 'numi',
          label: q ? `Preguntarle a Numi: «${q}»` : 'Preguntarle algo a Numi',
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
  }, [q, can, results, recents, pathname])

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const current = flat[active]

  // Cambiar el texto reinicia la selección: si no, el resaltado se queda en un
  // índice que ya apunta a otra cosa.
  useEffect(() => {
    setActive(0)
  }, [q, results])

  // Al cerrar se olvida la consulta: la paleta siempre abre limpia.
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const run = (item: Command) => {
    if (item.recent) remember(item.recent)
    item.run()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % flat.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + flat.length) % flat.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (current) run(current)
    } else if (e.key === 'Tab' && current?.action) {
      // `⇥` va a la acción del seleccionado en vez de saltar de foco: dentro de
      // una paleta no hay otro sitio al que tabular.
      e.preventDefault()
      go(current.action.to)
    }
  }

  let index = -1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={cn(
          // Móvil: pantalla completa. Con el teclado abierto, un diálogo centrado
          // deja tres filas visibles y media pantalla en blanco.
          // `grid-rows` explícito: `DialogContent` es una rejilla, y a pantalla
          // completa repartía el alto sobrante entre sus filas —los resultados
          // arrancaban a media pantalla—. Cabecera y pie miden lo suyo; el
          // cuerpo se queda con el resto.
          'inset-0 top-0 left-0 max-h-none w-full max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-none p-0',
          // Escritorio: paleta anclada arriba, con sitio para la vista previa.
          'sm:inset-auto sm:top-[8%] sm:left-[50%] sm:h-auto sm:max-h-[32rem] sm:max-w-3xl sm:translate-x-[-50%] sm:rounded-xl',
          'overflow-hidden',
        )}
      >
        <DialogTitle className="sr-only">Buscar o preguntarle algo a Numi</DialogTitle>

        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
          {/*
            En móvil la salida es una flecha atrás y no un «Cancelar»: la palabra
            se comía setenta píxeles de una barra de 390 y el placeholder se
            cortaba a media frase. Además es el gesto que ya trae el buscador de
            cualquier app del teléfono. En escritorio no hace falta —está `esc`,
            y la lupa dice de qué va la caja—.
          */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar el buscador"
            className="text-muted-foreground hover:text-foreground -ml-1 shrink-0 sm:hidden"
          >
            <ArrowLeft aria-hidden className="size-5" />
          </button>
          <Search aria-hidden className="text-muted-foreground hidden size-4 shrink-0 sm:block" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Busca un contacto, una cuenta, un pago…"
            aria-label="Buscar o preguntarle algo a Numi"
            aria-controls="command-results"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {isFetching && <Loader size="sm" label="Buscando" />}
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar la búsqueda"
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="size-4" />
            </button>
          )}
          <kbd className="bg-secondary text-muted-foreground hidden rounded border px-1.5 py-0.5 font-sans text-[0.68rem] sm:block">
            esc
          </kbd>
        </div>

        <div className="flex min-h-0 flex-1">
          <div
            id="command-results"
            ref={listRef}
            role="listbox"
            className="scrollbar-slim min-w-0 flex-1 overflow-y-auto p-2"
          >
            {flat.length === 0 && (
              <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                Nada con «{q}». Prueba con otras palabras.
              </p>
            )}
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
                      onClick={() => run(item)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors',
                        isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <item.Icon aria-hidden className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{item.label}</span>
                        {item.hint && (
                          <span className="text-muted-foreground block truncate text-xs">
                            {item.hint}
                          </span>
                        )}
                      </span>
                      {item.status && (
                        <StatusBadge {...item.status} className="hidden shrink-0 sm:inline-flex" />
                      )}
                      {item.amount && (
                        <span className="nums shrink-0 text-xs font-medium">{item.amount}</span>
                      )}
                      {isActive && (
                        <CornerDownLeft aria-hidden className="hidden size-3.5 shrink-0 sm:block" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/*
            Vista previa: solo en escritorio y solo cuando el seleccionado tiene
            algo que enseñar. En móvil no hay ancho, y una columna vacía a la
            derecha es peor que ninguna.
          */}
          {current?.details && (
            <aside className="bg-muted/30 hidden w-64 shrink-0 flex-col border-l p-4 lg:flex">
              <p className="truncate font-medium">{current.label}</p>
              {current.hint && (
                <p className="text-muted-foreground truncate text-xs">{current.hint}</p>
              )}
              <dl className="mt-4 space-y-1.5 text-xs">
                {current.details.map((d) => (
                  <div key={d.label} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground shrink-0">{d.label}</dt>
                    <dd className="min-w-0 truncate text-right">{d.value}</dd>
                  </div>
                ))}
              </dl>
              {current.action && (
                <button
                  type="button"
                  onClick={() => go(current.action!.to)}
                  className="bg-primary text-primary-foreground hover:bg-primary-hover mt-4 h-8 w-full rounded-md text-sm font-medium transition-colors"
                >
                  {current.action.label}
                </button>
              )}
            </aside>
          )}
        </div>

        <div className="text-muted-foreground hidden shrink-0 items-center gap-4 border-t px-4 py-2 text-[0.68rem] sm:flex">
          <Hint keys="↑↓">navegar</Hint>
          <Hint keys="⏎">abrir</Hint>
          {current?.action && <Hint keys="⇥">{current.action.label.toLowerCase()}</Hint>}
          <span className="ml-auto flex items-center gap-1">
            <Key>esc</Key> cerrar
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Key({ children }: { children: string }) {
  return <kbd className="bg-secondary rounded border px-1 py-0.5 font-sans">{children}</kbd>
}

function Hint({ keys, children }: { keys: string; children: string }) {
  return (
    <span className="flex items-center gap-1">
      <Key>{keys}</Key> {children}
    </span>
  )
}
