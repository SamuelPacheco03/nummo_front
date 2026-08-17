import { useEffect, useState, type CSSProperties } from 'react'
import { Toaster as SonnerToaster } from 'sonner'
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { useThemeStore } from '@/stores/theme'

function useResolvedTheme(): 'light' | 'dark' {
  const mode = useThemeStore((s) => s.mode)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return mode === 'system' ? (systemDark ? 'dark' : 'light') : mode
}

/** `true` por debajo de `lg`, que es donde no hay cabecera de escritorio. */
function useIsCompact(): boolean {
  const [compact, setCompact] = useState(
    () => !(window.matchMedia?.('(min-width: 1024px)').matches ?? true),
  )

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setCompact(!mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return compact
}

/**
 * **Los avisos de la app.**
 *
 * Sonner venía con `richColors`, que trae su propia paleta de verdes y rojos en
 * hexadecimal. Se veía bien y se veía **de otra aplicación**: un rojo que no era
 * el de «Vencida», un verde que no era el de «Pagado». Ahora el aviso se
 * construye con los mismos tokens que todo lo demás, y hereda claro y oscuro sin
 * configurar nada.
 *
 * La forma es la del `Note` (§94): superficie de tarjeta, **filo de color a la
 * izquierda** e icono del tono. Un aviso es un aparte —lo mismo que un callout,
 * pero que llega solo— así que se lee como familia y no como un invento aparte.
 *
 * **Dónde sale**, que es la mitad del problema: en escritorio arriba a la
 * derecha, porque el centro lo ocupa la barra de comandos y un aviso encima la
 * tapaba justo al usarla. Por debajo de `lg` no hay barra de comandos y el ancho
 * manda, así que va arriba y centrado, bajo la cabecera.
 *
 * Cuatro segundos y botón de cerrar: lo que dura un «Pago registrado» sin
 * estorbar, y con salida a mano para el error que haya que leer dos veces.
 */
export function Toaster() {
  const theme = useResolvedTheme()
  const compact = useIsCompact()

  return (
    <SonnerToaster
      theme={theme}
      position={compact ? 'top-center' : 'top-right'}
      // Debajo de la cabecera (64 px en escritorio, 56 en móvil) y no encima.
      offset={compact ? 64 : 76}
      closeButton
      /*
        Los iconos son los de lucide, como en el resto de la app: los de Sonner
        traen su propio trazo y su propio verde, y dos familias de iconos en la
        misma pantalla se notan.
      */
      icons={{
        success: <CircleCheck aria-hidden className="text-success size-4" />,
        error: <CircleX aria-hidden className="text-destructive size-4" />,
        warning: <TriangleAlert aria-hidden className="text-warning size-4" />,
        info: <Info aria-hidden className="text-brand size-4" />,
        loading: <Loader size="sm" />,
      }}
      /*
        Las variables de Sonner van por `style` y no por clase: su CSS pinta la
        superficie con ellas, y una clase de Tailwind pelearía con esa regla en
        vez de sustituirla.
      */
      style={
        {
          '--normal-bg': 'var(--card)',
          '--normal-text': 'var(--card-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius-lg)',
          // La X, dentro y a la derecha. Sonner la deja flotando fuera de la
          // esquina superior izquierda, que es donde empieza a leerse el aviso.
          '--toast-close-button-start': 'auto',
          '--toast-close-button-end': '0.5rem',
          '--toast-close-button-transform': 'translateY(0.75rem)',
        } as CSSProperties
      }
      toastOptions={{
        duration: 4000,
        classNames: {
          /*
            El filo de color va en un `::before` y no en `border-l`: el CSS de
            Sonner se inyecta después de la hoja de la app y pinta `border` con
            la misma especificidad, así que una utilidad de borde perdía siempre.
            El pseudo-elemento no se lo disputa nadie.
          */
          toast:
            'font-sans relative items-start gap-3 overflow-hidden p-4 shadow-lg before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[""] [&>[data-icon]]:mt-0.5 [&>[data-icon]]:shrink-0',
          title: 'text-foreground text-sm font-medium',
          description: 'text-muted-foreground text-sm leading-relaxed',
          closeButton:
            'bg-card text-muted-foreground hover:text-foreground border-border transition-colors',
          actionButton:
            'bg-primary text-primary-foreground hover:bg-primary-hover h-7 rounded-md px-2.5 text-xs font-medium transition-colors',
          cancelButton:
            'bg-secondary text-secondary-foreground h-7 rounded-md px-2.5 text-xs font-medium',
          // El filo de la izquierda es lo único que cambia por tono: el fondo se
          // queda en superficie de tarjeta para que el texto se lea igual de bien
          // en los cuatro (§7 — no fiarlo todo al color).
          success: 'before:bg-success',
          error: 'before:bg-destructive',
          warning: 'before:bg-warning',
          info: 'before:bg-brand',
          loading: 'before:bg-border',
        },
      }}
    />
  )
}
