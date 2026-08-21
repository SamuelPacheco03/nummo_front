import { ArrowRight } from 'lucide-react'

/**
 * La cinta oscura que separa el hero del resto.
 *
 * Único gesto: se desplaza en bucle. La cinta va **duplicada** y la animación la corre
 * `-50%`, que es lo que hace que el ciclo cierre sin salto — con una sola copia se ve el
 * hueco al volver al principio. La segunda copia es decorativa y va `aria-hidden`: quien
 * usa lector de pantalla no tiene por qué oír la frase dos veces.
 */

const PASOS = ['Cobros', 'Pagos', 'Claridad'] as const

function Cinta() {
  return (
    <span className="flex shrink-0 items-center">
      {[0, 1].map((copia) => (
        <span key={copia} className="flex items-center gap-10 px-5">
          <span className="whitespace-nowrap text-sm text-sidebar-muted-foreground">
            Todo lo que estaba disperso, ahora{' '}
            <span className="font-medium text-sidebar-foreground">conectado.</span>
          </span>
          <span className="flex items-center gap-2.5" aria-hidden>
            {PASOS.map((paso, i) => (
              <span key={paso} className="flex items-center gap-2.5">
                <span className="whitespace-nowrap text-sm text-sidebar-muted-foreground">
                  {paso}
                </span>
                {i < PASOS.length - 1 && (
                  <ArrowRight className="size-3.5 text-sidebar-muted-foreground/60" />
                )}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  )
}

export function Ticker() {
  return (
    <section className="overflow-hidden bg-sidebar py-5">
      <div className="ticker-cinta flex w-max">
        <Cinta />
        <span aria-hidden>
          <Cinta />
        </span>
      </div>
    </section>
  )
}
