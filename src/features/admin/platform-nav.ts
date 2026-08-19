import { Building2, Layers } from 'lucide-react'
import type { SectionGroup } from '@/components/ui/sectioned-layout'

/**
 * La consola de plataforma: **no es una sección de la organización**, es la
 * superficie desde la que se administran todas.
 *
 * Vive en esta misma app y como ruta protegida —no en un panel aparte— porque el
 * superadmin es la misma persona con la misma sesión, y montar una segunda
 * aplicación para siete endpoints sería duplicar el shell, el cliente HTTP y el
 * sistema visual entero.
 */
export const GROUPS: SectionGroup[] = [
  {
    title: 'Plataforma',
    items: [
      { to: '/plataforma/organizaciones', label: 'Organizaciones', Icon: Building2 },
      { to: '/plataforma/planes', label: 'Planes', Icon: Layers },
    ],
  },
]

/** Rutas que cuelgan de la consola, para que el sidebar marque su enlace activo. */
export function isPlatformPath(pathname: string): boolean {
  return pathname === '/plataforma' || pathname.startsWith('/plataforma/')
}
