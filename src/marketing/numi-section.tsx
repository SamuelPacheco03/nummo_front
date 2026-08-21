import { useState } from 'react'
import { ArrowRight, Send, Sparkles } from 'lucide-react'
import { postApiV1PublicNumi } from '@/api/generated/endpoints/public/public'
import { cn } from '@/lib/utils'
import { SectionHeading } from './section-heading'
import { sessionId, type Cola } from './signals'
import { useSectionViewed } from './use-section-viewed'

/**
 * Numi de preventa.
 *
 * Es Numi, pero **no es el del producto**: contesta solo con la documentación pública y la
 * lista real de precios, sin herramientas y sin datos de nadie.
 *
 * Tres cosas del contrato que cambian el diseño, no solo el código:
 *
 * 1. **Quedarse sin cuota no es un error.** Responde `200` con `exhausted: true` y un
 *    mensaje cordial. Un `429` en una portada es un widget roto para quien lo está
 *    leyendo, así que aquí no hay ningún camino que pinte un error de cuota.
 * 2. **Cuando llega `exhausted`, el sitio de la caja lo ocupa el registro** — no un aviso.
 *    Son seis preguntas por visitante y no se renuevan: el límite ES el empujón.
 * 3. **Puede estar apagado**, y en desarrollo lo está por defecto. Responde igual —200,
 *    `exhausted: true`— diciendo que por ahí todavía no atiende. Ese es el primer estado
 *    que se ve al montar esto, así que está diseñado y no tratado como fallo.
 */

interface Turno {
  yo: string
  numi: string
}

/** Desde cuántas preguntas restantes se avisa. Antes del último turno, no después. */
const AVISO_DESDE = 2

export function NumiSection({ cola }: { cola: Cola | null }) {
  const ref = useSectionViewed(cola, 'numi')
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [pregunta, setPregunta] = useState('')
  const [enVuelo, setEnVuelo] = useState(false)
  const [restantes, setRestantes] = useState<number | null>(null)
  const [agotado, setAgotado] = useState(false)

  const puedeEnviar = pregunta.trim().length >= 3 && !enVuelo && !agotado

  async function preguntar(e: React.FormEvent) {
    e.preventDefault()
    if (!puedeEnviar) return

    const texto = pregunta.trim().slice(0, 500)
    setPregunta('')
    setEnVuelo(true)
    try {
      const res = await postApiV1PublicNumi({ sessionId: sessionId(), question: texto })
      if (res.status === 200) {
        setTurnos((t) => [...t, { yo: texto, numi: res.data.answer }])
        setRestantes(res.data.remaining)
        setAgotado(res.data.exhausted)
      }
    } catch {
      /*
        Un fallo de red sí es un fallo, y se dice en el hilo en vez de en un toast: el
        widget es la conversación, y sacar el problema de ella lo deja mudo.
      */
      setTurnos((t) => [
        ...t,
        { yo: texto, numi: 'No pude responder ahora mismo. Probá de nuevo en un momento.' },
      ])
    } finally {
      setEnVuelo(false)
    }
  }

  return (
    <section ref={ref} id="numi" className="bg-background px-6 py-24">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading
            rotulo="Tu asistente financiero"
            principal="Conoce a Numi."
            secundaria="La claridad que te estaba faltando."
          />
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            No tienes que saber dónde mirar. Numi encuentra lo importante, lo explica en simple y
            te sugiere el siguiente paso.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Preguntale lo que quieras sobre Nummo. Contesta con la documentación pública y los
            precios de verdad — no sabe nada de tu negocio hasta que tengas cuenta.
          </p>
        </div>

        {/* El panel oscuro del mockup, pero de verdad: lo que se escribe aquí se contesta. */}
        <div className="flex min-h-[26rem] flex-col rounded-2xl bg-sidebar p-5">
          <div className="flex items-center gap-2.5 border-b border-sidebar-border pb-4">
            <span className="grid size-8 place-items-center rounded-lg bg-sidebar-accent" aria-hidden>
              <Sparkles className="size-4 text-sidebar-primary" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-sidebar-foreground">Numi</span>
              <span className="block text-xs text-sidebar-muted-foreground">
                {agotado ? 'Por aquí ya no atiende' : 'Disponible ahora'}
              </span>
            </span>
          </div>

          <div className="scrollbar-slim mt-4 flex-1 space-y-4 overflow-y-auto">
            {turnos.length === 0 && !enVuelo && (
              <p className="text-sm leading-relaxed text-sidebar-muted-foreground">
                Hola. Preguntame si Nummo sirve para lo tuyo — «¿me vale para un colegio?», «¿cómo
                cobra por WhatsApp?», «¿cuánto cuesta?».
              </p>
            )}

            {turnos.map((t, i) => (
              <div key={i} className="space-y-3">
                <p className="ml-auto w-fit max-w-[85%] rounded-xl bg-chat-bubble px-3.5 py-2 text-sm text-chat-bubble-foreground">
                  {t.yo}
                </p>
                <p className="w-fit max-w-[90%] rounded-xl bg-sidebar-accent px-3.5 py-2 text-sm leading-relaxed text-sidebar-foreground">
                  {t.numi}
                </p>
              </div>
            ))}

            {enVuelo && (
              <p className="text-sm text-sidebar-muted-foreground" aria-live="polite">
                Numi está escribiendo…
              </p>
            )}
          </div>

          {/*
            Agotado: el sitio de la caja lo ocupa el registro. No es un aviso de error — es
            el paso siguiente, que es para lo que existe el tope.
          */}
          {agotado ? (
            <a
              href="/register"
              onClick={() => cola?.encolar({ name: 'cta_clicked', section: 'numi', action: 'signup' })}
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Crear cuenta y seguir preguntando
              <ArrowRight className="size-4" aria-hidden />
            </a>
          ) : (
            <form onSubmit={preguntar} className="mt-4">
              <div className="flex items-center gap-2 rounded-full border border-sidebar-border px-4 py-1.5">
                <input
                  value={pregunta}
                  onChange={(e) => setPregunta(e.target.value)}
                  maxLength={500}
                  disabled={enVuelo}
                  placeholder="Preguntale algo a Numi"
                  aria-label="Preguntale algo a Numi"
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-sidebar-foreground placeholder:text-sidebar-muted-foreground focus:outline-none disabled:opacity-60"
                />
                {/* Con una pregunta en vuelo no se puede mandar otra: el backend limita por minuto. */}
                <button
                  type="submit"
                  disabled={!puedeEnviar}
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full transition-opacity',
                    puedeEnviar
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90'
                      : 'bg-sidebar-accent text-sidebar-muted-foreground',
                  )}
                >
                  <Send className="size-3.5" aria-hidden />
                  <span className="sr-only">Enviar</span>
                </button>
              </div>

              {/* `remaining` avisa ANTES del último turno, que es cuando sirve de algo. */}
              {restantes !== null && restantes <= AVISO_DESDE && restantes > 0 && (
                <p className="mt-2 px-4 text-xs text-sidebar-muted-foreground">
                  {restantes === 1 ? 'Te queda una pregunta.' : `Te quedan ${restantes} preguntas.`}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
