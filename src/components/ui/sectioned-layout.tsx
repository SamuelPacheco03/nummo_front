import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router'
import { List } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

export type SectionItem = { to: string; label: string; Icon: LucideIcon; end?: boolean }
export type SectionGroup = { title: string; items: SectionItem[] }

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm whitespace-nowrap transition-colors',
    'text-muted-foreground hover:bg-secondary hover:text-foreground',
    'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
    isActive && 'bg-secondary text-foreground font-medium',
  )

function SectionLink({ item, onNavigate }: { item: SectionItem; onNavigate?: () => void }) {
  return (
    <NavLink to={item.to} end={item.end} className={linkClass} onClick={onNavigate}>
      {({ isActive }) => (
        <>
          <item.Icon aria-hidden className={cn('size-4 shrink-0', isActive && 'text-brand')} />
          {item.label}
        </>
      )}
    </NavLink>
  )
}

/** Los grupos con sus títulos: lo mismo en la columna y en el cajón. */
function Groups({ groups, onNavigate }: { groups: SectionGroup[]; onNavigate?: () => void }) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          <div className="text-muted-foreground px-2.5 pb-1 text-[0.68rem] font-medium tracking-wider uppercase">
            {group.title}
          </div>
          {group.items.map((item) => (
            <SectionLink key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </>
  )
}

/**
 * **Sección con su propia navegación**: una columna fija a la izquierda en
 * escritorio y, por debajo de `lg`, la misma lista dentro del `Drawer` detrás de
 * un botón «Secciones».
 *
 * Lo usan Configuración y Ayuda, que son la misma forma —una entrada del sidebar
 * que abre diez u once destinos agrupados— y llegaron a tenerlo copiado. Se
 * extrajo antes de que la segunda copia empezara a divergir (CLAUDE.md: «nada
 * por duplicado»).
 *
 * **Nunca una tira horizontal en móvil.** Se probó y era el error que §21.1
 * reprocha en los filtros: de once destinos se veían tres, el resto quedaba
 * detrás de un gesto que nadie ve y los títulos de grupo se perdían al aplanar la
 * lista. Un `select` con `<optgroup>` los recupera, pero tiene que mostrar el
 * destino actual —repitiendo el `<h1>` que va justo debajo— y en tablet se estira
 * hasta parecer un campo de formulario vacío.
 *
 * El ancho del contenido lo pone este layout y no cada página: si cada una
 * declara el suyo, saltar entre hermanas reencuadra la pantalla.
 */
export function SectionedLayout({
  label,
  groups,
  children,
}: {
  /** Nombre de la sección: rotula la navegación y titula el cajón. */
  label: string
  groups: SectionGroup[]
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:flex lg:gap-8">
      {/*
        `top-24` y no `top-8`: la cabecera de escritorio es `sticky` y mide 64 px,
        así que una columna pegada a 32 px se metía por debajo al desplazar y
        parecía que se movía sola. 64 de cabecera + 32 de respiro.
      */}
      <nav
        aria-label={label}
        className="sticky top-24 hidden w-52 shrink-0 flex-col gap-5 self-start lg:flex"
      >
        <Groups groups={groups} />
      </nav>

      <div className="mb-6 lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <List aria-hidden className="size-4" />
          Secciones
        </Button>
        <Drawer open={open} onOpenChange={setOpen} title={label} fit>
          <nav aria-label={label} className="flex flex-col gap-5">
            <Groups groups={groups} onNavigate={() => setOpen(false)} />
          </nav>
        </Drawer>
      </div>

      <div className="min-w-0 max-w-3xl flex-1">{children}</div>
    </div>
  )
}
