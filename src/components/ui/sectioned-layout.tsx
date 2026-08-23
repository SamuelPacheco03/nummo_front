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
  console = false,
  children,
}: {
  /** Nombre de la sección: rotula la navegación y titula el cajón. */
  label: string
  groups: SectionGroup[]
  /**
   * **Consola**: la sección se queda con todo el ancho y todo el alto, y el
   * scroll lo administra ella.
   *
   * La regla de arriba —el ancho lo pone el layout— sigue valiendo para las
   * pantallas que se leen: Configuración y Ayuda son texto y formularios, y una
   * columna de 48rem es lo que los hace legibles. Pero el playground de Numi no
   * se lee: se opera. Tiene un chat que quiere alto propio con su caja anclada
   * abajo, y una traza que acompaña a la conversación en un carril; las dos cosas
   * mueren dentro de una columna de 48rem que además scrollea con la página.
   */
  console?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={cn(
        'lg:flex lg:gap-8',
        /*
          En consola el alto es de la ventana, y eso obliga a repartirlo en vez de
          dejar que cada bloque crezca: por debajo de `lg` el botón «Secciones» va
          antes que el contenido, así que si el contenido pide el 100 % del alto la
          suma se pasa y lo de abajo —la caja de escribir— se sale por el recorte.
          Columna con `min-h-0` y el botón como pieza fija: lo que sobra es del
          contenido, en móvil y en escritorio.
        */
        console && 'flex h-full min-h-0 flex-col lg:flex-row',
      )}
    >
      {/*
        `top-24` y no `top-8`: la cabecera de escritorio es `sticky` y mide 64 px,
        así que una columna pegada a 32 px se metía por debajo al desplazar y
        parecía que se movía sola. 64 de cabecera + 32 de respiro.

        **Y desplaza lo suyo.** `sticky` solo pega mientras el elemento cabe en la
        ventana: con veintiún destinos la columna medía más que ella, el rango de
        pegado era cero y llegar al último grupo obligaba a mover la página entera
        —perdiendo de vista el formulario que se estaba mirando— para volver a
        subir después. Con alto máximo y `overflow-y-auto` se comporta como lo que
        es, un segundo carril de navegación: se queda quieta y el que desplaza es
        ella.

        El borde va en el elemento de fuera, el que no desplaza, para que sea un
        separador y no una línea que se mueve; y el `pr-4` de dentro es lo que
        impide que `overflow-y-auto` recorte el anillo de foco de los enlaces.

        **El `8rem` del alto no es un respiro elegido a ojo: es lo que impide que
        el carril se mueva al final del scroll.** `sticky` solo pega dentro de su
        contenedor, y cuando la página llega abajo el contenedor se acaba antes que
        la pantalla: el carril se despega y sube justo lo que le sobre. Lo que le
        sobra es la diferencia entre lo que él deja libre abajo y el `py-8` de
        `main`, así que valen los dos treinta y dos: 96 de cabecera más respiro
        arriba, 32 abajo. Con `7rem` sobraban 16 px y el carril daba ese saltito.

        La barra fina y el desvanecido de los bordes son los mismos del sidebar
        principal (`scrollbar-slim` + `scroll-fade-y`, `index.css`): una
        navegación que desplaza ya tiene su lenguaje en esta app, y el
        desvanecido es lo que hace que un enlace cortado se lea como «hay más
        abajo» y no como un fallo de render.

        **Y por eso el `py-5`, que vale exactamente el `--fade`.** La máscara
        difumina 1.25 rem por arriba y por abajo pase lo que pase, así que sin esa
        banda el primer título del carril nace medio borrado —parece un defecto,
        no una señal— y el último enlace se apaga al llegar al fondo. Con el
        relleno dentro del contenedor que desplaza, en reposo la máscara cae sobre
        hueco vacío y solo tiñe lo que de verdad se está cortando. El sidebar
        principal resuelve lo mismo con el `py-4` de su lista.
      */}
      <nav
        aria-label={label}
        className="border-border/70 sticky top-24 hidden w-60 shrink-0 self-start border-r lg:block"
      >
        <div className="scrollbar-slim scroll-fade-y flex max-h-[calc(100dvh-8rem)] flex-col gap-5 overflow-y-auto py-5 pr-4">
          <Groups groups={groups} />
        </div>
      </nav>

      <div className={cn('lg:hidden', console ? 'mb-2 flex-none' : 'mb-6')}>
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

      <div className={cn('min-w-0 flex-1', console ? 'min-h-0' : 'max-w-3xl')}>{children}</div>
    </div>
  )
}
