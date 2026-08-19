import { useEffect, useRef, useState } from 'react'
import { Eraser, Hand } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Evento {
  /** Milisegundos desde que el dedo tocó. */
  ms: number
  tipo: string
  /** Movimientos seguidos del mismo tipo: se cuentan, no se listan. */
  veces: number
}

/** Los eventos con los que se sigue un dedo, y los que se lo pueden llevar. */
const DEL_BOTON = ['pointerdown', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'touchcancel', 'contextmenu', 'selectstart'] as const
const DEL_DEDO = ['pointermove', 'touchmove'] as const

/**
 * **Qué le pasa de verdad al dedo en este teléfono.**
 *
 * Mantener pulsado el micrófono se rompió cuatro veces seguidas en un móvil
 * concreto —se cancelaba solo al sostenerlo quieto— y ninguna de las tres
 * hipótesis se pudo confirmar desde aquí: la emulación táctil de un navegador
 * de escritorio no ejecuta lo que hace Android con una pulsación larga, así que
 * el arnés de pruebas nunca reprodujo el fallo ni pudo validar los arreglos.
 *
 * Esto lo mide en el aparato donde pasa. No graba nada ni pide permisos: solo
 * apunta, con su marca de tiempo, qué eventos llegan mientras se sostiene el
 * botón. Si el sistema se lleva el gesto, aquí se ve **cuándo** y **cuál** —y
 * con eso se puede arreglar en vez de adivinar—.
 *
 * Es herramienta de soporte y se quita cuando el gesto esté cerrado.
 */
export function GestureProbe() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [sosteniendo, setSosteniendo] = useState(false)
  const inicio = useRef(0)
  const botonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = botonRef.current
    if (!el) return

    const apunta = (tipo: string) => {
      const ms = inicio.current ? Math.round(performance.now() - inicio.current) : 0
      setEventos((previos) => {
        const ultimo = previos.at(-1)
        // Los movimientos llegan a decenas por segundo: se agrupan.
        if (ultimo?.tipo === tipo && (tipo === 'pointermove' || tipo === 'touchmove')) {
          return [...previos.slice(0, -1), { ...ultimo, ms, veces: ultimo.veces + 1 }]
        }
        return [...previos, { ms, tipo, veces: 1 }]
      })
    }

    const empieza = (e: Event) => {
      if (e.type === 'pointerdown') {
        inicio.current = performance.now()
        setEventos([])
        setSosteniendo(true)
      }
      // Lo mismo que hace el micrófono: que la pulsación larga no se lleve el gesto.
      if (e.type === 'touchstart') e.preventDefault()
      apunta(e.type)
      if (e.type === 'pointerup' || e.type === 'touchend' || e.type === 'touchcancel') {
        setSosteniendo(false)
      }
    }

    const quitar = DEL_BOTON.map((tipo) => {
      // `touchstart` no pasivo: es el único donde `preventDefault` sirve.
      el.addEventListener(tipo, empieza, tipo === 'touchstart' ? { passive: false } : false)
      return () => el.removeEventListener(tipo, empieza)
    })

    // El dedo se mueve por toda la pantalla: sus movimientos van en `window`.
    const mueve = (e: Event) => apunta(e.type)
    for (const tipo of DEL_DEDO) window.addEventListener(tipo, mueve, { passive: true })

    // Y el teclado al abrirse o cerrarse mueve el suelo bajo el dedo.
    const viewport = window.visualViewport
    const redimensiona = () => apunta('viewport resize')
    viewport?.addEventListener('resize', redimensiona)

    return () => {
      quitar.forEach((q) => q())
      for (const tipo of DEL_DEDO) window.removeEventListener(tipo, mueve)
      viewport?.removeEventListener('resize', redimensiona)
    }
  }, [])

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        Mantén pulsado el botón unos tres segundos <strong className="text-foreground font-medium">sin
        mover el dedo</strong>, suéltalo y manda una foto de la lista. Dice qué le hace este teléfono
        al gesto de grabar. No graba audio ni pide permisos.
      </p>

      <button
        ref={botonRef}
        type="button"
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          'flex h-24 w-full touch-none flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm font-medium transition-colors select-none',
          sosteniendo ? 'border-brand bg-brand/10 text-brand' : 'text-muted-foreground',
        )}
      >
        <Hand aria-hidden className="size-6" />
        {sosteniendo ? 'Sigue así…' : 'Mantén pulsado aquí'}
      </button>

      {eventos.length > 0 && (
        <>
          <ul className="divide-y rounded-lg border font-mono text-xs">
            {eventos.map((e, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                <span className={cn(e.tipo.endsWith('cancel') && 'text-destructive font-semibold')}>
                  {e.tipo}
                  {e.veces > 1 && <span className="text-muted-foreground"> ×{e.veces}</span>}
                </span>
                <span className="text-muted-foreground tabular-nums">{e.ms} ms</span>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="outline" onClick={() => setEventos([])}>
            <Eraser aria-hidden className="size-4" />
            Limpiar
          </Button>
        </>
      )}
    </div>
  )
}
