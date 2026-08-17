import { Outlet } from 'react-router'
import { SectionedLayout } from '@/components/ui/sectioned-layout'
import { GROUPS } from './settings-nav'

/**
 * Shell de Configuración: una sola entrada en el pie del sidebar que abre sus
 * doce destinos en cuatro grupos.
 *
 * La forma —columna fija en escritorio, cajón detrás de «Secciones» por debajo
 * de `lg`— vive en `SectionedLayout`, que comparte con Ayuda.
 *
 * Cada página conserva su propio `PageHeader`: este layout aporta la navegación,
 * no el encabezado.
 */
export function SettingsLayout() {
  return (
    <SectionedLayout label="Configuración" groups={GROUPS}>
      <Outlet />
    </SectionedLayout>
  )
}
