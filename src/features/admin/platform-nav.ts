import {
  Activity,
  Building2,
  Columns3,
  Layers,
  MessageSquareText,
  ListChecks,
  MessageSquareCode,
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
      // El canal de WhatsApp: la cola de entrantes y las plantillas compartidas.
      // Van aquí y no en el playground porque no son de Numi, son del despliegue.
      { to: '/plataforma/whatsapp', label: 'Canal de WhatsApp', Icon: MessageSquareText },
    ],
  },
  {
    /*
      El playground de Numi: probar el asistente contra una organización real y ver qué
      costó cada turno. Es superficie de plataforma y **no de cliente** — ningún usuario
      de una organización la ve nunca.
    */
    title: 'Playground de Numi',
    /*
      **Cinco destinos y por verbo**, no nueve por endpoint. Eran nueve —consola,
      herramientas, comparar, regresión, actividad, historial, puntuaciones, escrituras y
      conocimiento—: una entrada por ruta del contrato, que es el modelo de datos y no el
      del trabajo (§14). Lo que la persona hace son cinco cosas, y lo demás pasó a ser
      pestaña de la que le corresponde.
    */
    items: [
      // `end`: es el padre de las otras cuatro rutas y sin esto quedaría activo en todas.
      { to: '/plataforma/playground', label: 'Probar', Icon: MessageSquareCode, end: true },
      { to: '/plataforma/playground/comparar', label: 'Comparar', Icon: Columns3 },
      { to: '/plataforma/playground/regresion', label: 'Proteger', Icon: ListChecks },
      { to: '/plataforma/playground/vigilar', label: 'Vigilar', Icon: Activity },
      { to: '/plataforma/playground/controlar', label: 'Controlar', Icon: Wrench },
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

/**
 * Cómo se llama la pantalla en la que estamos, para la miga de pan de la cabecera.
 *
 * Gana la coincidencia **más larga**: `/plataforma/playground` es prefijo de las otras
 * cuatro del playground, y sin esto todas dirían «Probar».
 */
export function activeSectionLabel(pathname: string): string | null {
  let best: { to: string; label: string } | null = null
  for (const group of GROUPS) {
    for (const item of group.items) {
      const matches = item.end ? pathname === item.to : pathname.startsWith(item.to)
      if (matches && (!best || item.to.length > best.to.length)) best = item
    }
  }
  return best?.label ?? null
}
