import type { ReactNode } from 'react'

/**
 * **El cuerpo de una pantalla de plataforma.**
 *
 * Todas las de la consola —organizaciones, planes, y las tres del playground que se
 * leen— se reparten igual: el alto es de la ventana, el scroll es de la pantalla y no de
 * la página, y el contenido se centra en 72rem.
 *
 * El ancho importa más de lo que parece: estas pantallas son **tablas densas de
 * plataforma**, no formularios de configuración. La columna de 48rem que usan Ajustes y
 * Ayuda —la que hace legible un texto— dejaba las de aquí con seis columnas apretadas y
 * medio monitor en blanco al lado.
 *
 * Las dos que no lo usan son las que no se leen sino que se operan: la consola y la
 * comparación traen su propio marco con la barra de contexto pegada arriba.
 */
export function PlatformPage({ children }: { children: ReactNode }) {
  return (
    <div className="scrollbar-slim h-full min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl space-y-4 px-1 py-1">{children}</div>
    </div>
  )
}
