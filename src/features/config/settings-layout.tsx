import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import { GROUPS, type SettingsItem } from './settings-nav'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm whitespace-nowrap transition-colors',
    'text-muted-foreground hover:bg-secondary hover:text-foreground',
    'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
    isActive && 'bg-secondary text-foreground font-medium',
  )

function SettingsLink({ item, onNavigate }: { item: SettingsItem; onNavigate?: () => void }) {
  return (
    <NavLink to={item.to} className={linkClass} onClick={onNavigate}>
      {({ isActive }) => (
        <>
          <item.Icon aria-hidden className={cn('size-4 shrink-0', isActive && 'text-brand')} />
          {item.label}
        </>
      )}
    </NavLink>
  )
}

/** Los cuatro grupos con sus títulos: lo mismo en la columna y en el cajón. */
function SettingsGroups({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          <div className="text-muted-foreground px-2.5 pb-1 text-[0.68rem] font-medium tracking-wider uppercase">
            {group.title}
          </div>
          {group.items.map((item) => (
            <SettingsLink key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </>
  )
}

/**
 * Shell de Configuración: una sola entrada en el pie del sidebar que abre su
 * propia navegación de once destinos en cuatro grupos.
 *
 * En escritorio es una columna fija a la izquierda —el patrón que el usuario ya
 * conoce de cualquier panel de ajustes—. Por debajo de `lg` no cabe una segunda
 * columna, así que la misma lista se mete en el `Drawer` detrás de «Secciones».
 *
 * Cada página conserva su propio `PageHeader`: este layout aporta la navegación,
 * no el encabezado.
 */
export function SettingsLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:flex lg:gap-8">
      {/*
        `top-24` y no `top-8`: la cabecera de escritorio es `sticky` y mide 64 px,
        así que una columna pegada a 32 px se metía por debajo al desplazar y
        parecía que se movía sola. 64 de cabecera + 32 de respiro.
      */}
      <nav
        aria-label="Configuración"
        className="sticky top-24 hidden w-52 shrink-0 flex-col gap-5 self-start lg:flex"
      >
        <SettingsGroups />
      </nav>

      {/*
        Móvil y tablet: un botón, no una tira.

        Aquí hubo una tira horizontal desplazable, y era el mismo error que §21.1
        reprocha en los filtros: de once destinos se veían tres y los otros ocho
        quedaban detrás de un gesto que nadie ve, además de perder los títulos de
        grupo. Un `select` con `optgroup` los recuperaba, pero tenía que mostrar
        el destino actual —repitiendo el `<h1>` que va justo debajo— y en tablet
        se estiraba a lo ancho hasta parecer un campo de formulario vacío.

        El botón no finge ser otra cosa, y el cajón enseña la lista **entera** con
        sus grupos, igual que el escritorio.
      */}
      <div className="mb-6 lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <List aria-hidden className="size-4" />
          Secciones
        </Button>
        <Drawer open={open} onOpenChange={setOpen} title="Configuración" fit>
          <nav aria-label="Configuración" className="flex flex-col gap-5">
            <SettingsGroups onNavigate={() => setOpen(false)} />
          </nav>
        </Drawer>
      </div>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
