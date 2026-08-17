import { Outlet } from 'react-router'
import { SectionedLayout } from '@/components/ui/sectioned-layout'
import { HELP_GROUPS } from './help-nav'

/**
 * Shell de la guía: la misma forma que Configuración —columna fija en escritorio,
 * cajón detrás de «Secciones» por debajo de `lg`— porque es el mismo problema, un
 * enlace del sidebar que abre diez destinos agrupados.
 */
export function HelpLayout() {
  return (
    <SectionedLayout label="Ayuda" groups={HELP_GROUPS}>
      <Outlet />
    </SectionedLayout>
  )
}
