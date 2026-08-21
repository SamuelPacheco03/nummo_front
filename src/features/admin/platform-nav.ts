import {
  Activity,
  BookOpen,
  Building2,
  Columns3,
  Layers,
  ListChecks,
  MessageSquareCode,
  PenLine,
  Wrench,
} from 'lucide-react'
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
  {
    /*
      El playground de Numi: probar el asistente contra una organización real y ver qué
      costó cada turno. Es superficie de plataforma y **no de cliente** — ningún usuario
      de una organización la ve nunca.
    */
    title: 'Playground de Numi',
    items: [
      // `end`: es el padre de las otras cuatro rutas y sin esto quedaría activo en todas.
      { to: '/plataforma/playground', label: 'Consola', Icon: MessageSquareCode, end: true },
      { to: '/plataforma/playground/herramientas', label: 'Herramientas', Icon: Wrench },
      { to: '/plataforma/playground/comparar', label: 'Comparar', Icon: Columns3 },
      { to: '/plataforma/playground/regresion', label: 'Regresión', Icon: ListChecks },
    ],
  },
  {
    // Lo que ya pasó, con clientes de verdad: la otra mitad del panel.
    title: 'Numi en producción',
    items: [
      /*
        Actividad, Historial y Puntuaciones eran tres destinos y son la misma pregunta a
        tres escalas: hoy son las tres pestañas de Vigilar (§47.5).
      */
      { to: '/plataforma/playground/vigilar', label: 'Vigilar', Icon: Activity },
      { to: '/plataforma/playground/escrituras', label: 'Escrituras', Icon: PenLine },
      { to: '/plataforma/playground/conocimiento', label: 'Conocimiento', Icon: BookOpen },
    ],
  },
]

/**
 * ¿Estamos en el playground?
 *
 * Lo pregunta el shell para darle el ancho y el alto de la ventana: es la única
 * sección de plataforma que se opera en vez de leerse (§47.5).
 */
export function isPlaygroundPath(pathname: string): boolean {
  return pathname === '/plataforma/playground' || pathname.startsWith('/plataforma/playground/')
}

/** Rutas que cuelgan de la consola, para que el sidebar marque su enlace activo. */
export function isPlatformPath(pathname: string): boolean {
  return pathname === '/plataforma' || pathname.startsWith('/plataforma/')
}
