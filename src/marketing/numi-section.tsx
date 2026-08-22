import { useEffect, useState } from 'react'
import { ArrowRight, BellRing, ListChecks, Sparkles, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { rutasApp } from './links'
import { SectionHeading } from './section-heading'
import type { Cola } from './signals'
import { useReveal } from './use-reveal'
import { useSectionViewed } from './use-section-viewed'

/**
 * «Conoce a Numi»: qué hace y por qué es tu asistente.
 *
 * **Aquí NO se habla con Numi.** Hubo una versión con un widget en vivo contra
 * `/public/numi`, y se quitó por una razón de producto: probar a Numi de verdad es crearse
 * una cuenta, que son treinta segundos. Un chat de preventa con seis preguntas de cuota
 * añade un estado que diseñar —agotado, apagado, sin conexión—, una espera antes de cada
 * respuesta y una versión descafeinada del producto, para ahorrar un paso que no cuesta.
 *
 * Lo que va es una conversación **guionizada**, que es lo que enseñaba el diseño aprobado:
 * se escribe sola al entrar, con su indicador de escritura. Enseña de qué habla Numi sin
 * prometer que responderá lo que sea.
 *
 * > El endpoint `/public/numi` existe y funciona; simplemente el front ya no lo llama.
 */

/** Los tres trabajos de Numi, que es lo que la sección tiene que dejar claro. */
const LO_QUE_HACE = [
  {
    Icon: TrendingUp,
    titulo: 'Mira por ti',
    texto: 'Revisa los movimientos y te dice qué cambió, sin que tengas que ir a buscarlo.',
  },
  {
    Icon: ListChecks,
    titulo: 'Prioriza',
    texto: 'De todo lo que hay pendiente, cuál conviene atender hoy y por qué.',
  },
  {
    Icon: BellRing,
    titulo: 'Actúa contigo',
    texto: 'Prepara el cobro, redacta el recordatorio y lo manda por WhatsApp cuando le dices que sí.',
  },
] as const

/** El hilo, escrito. El orden es el de la conversación y cada uno sabe de quién es. */
const HILO = [
  { de: 'numi', texto: 'Hola, Andrea. Revisé tus movimientos de esta semana.' },
  { de: 'numi', texto: 'Hay tres cosas que merecen tu atención.', fuerte: true },
  { de: 'yo', texto: '¿Qué debería priorizar?' },
  {
    de: 'numi',
    tarjeta: {
      titulo: '1. Cobro vencido de Grupo Norte',
      detalle: 'Venció hace 4 días · $2.400.000',
      accion: 'Ver y recordar',
    },
  },
] as const

/** Cuánto tarda en aparecer cada mensaje. Es una conversación, no una lista. */
const RITMO_MS = 900

export function NumiSection({ cola }: { cola: Cola | null }) {
  const refSeccion = useSectionViewed(cola, 'numi')
  const refHilo = useReveal<HTMLDivElement>()
  const visibles = useHiloEscrito(refHilo)

  return (
    <section ref={refSeccion} id="numi" className="bg-background px-6 py-24">
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

          <ul className="mt-8 space-y-5">
            {LO_QUE_HACE.map(({ Icon, titulo, texto }) => (
              <li key={titulo} className="flex gap-3.5">
                <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{titulo}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                    {texto}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <a
            href={rutasApp.registro}
            onClick={() => cola?.encolar({ name: 'cta_clicked', section: 'numi', action: 'signup' })}
            className="mt-9 inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-cta px-6 text-sm font-semibold text-cta-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Probar Numi con tu cuenta
            <ArrowRight aria-hidden className="size-4" />
          </a>
        </div>

        {/* El hilo. Se escribe solo al entrar: es el único gesto de esta sección. */}
        <div ref={refHilo} className="flex min-h-[26rem] flex-col rounded-2xl bg-sidebar p-5">
          <div className="flex items-center gap-2.5 border-b border-sidebar-border pb-4">
            <span className="grid size-8 place-items-center rounded-lg bg-sidebar-accent" aria-hidden>
              <Sparkles className="size-4 text-sidebar-primary" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-sidebar-foreground">Numi</span>
              <span className="block text-xs text-sidebar-muted-foreground">Dentro de tu cuenta</span>
            </span>
          </div>

          <div className="mt-4 flex-1 space-y-3">
            {HILO.slice(0, visibles).map((m, i) =>
              'tarjeta' in m ? (
                <div key={i} className="max-w-[92%] rounded-xl bg-sidebar-accent p-3.5">
                  <p className="flex items-center gap-1.5 text-[0.6875rem] text-sidebar-muted-foreground">
                    <Sparkles aria-hidden className="size-3" />
                    Mi recomendación
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-sidebar-foreground">
                    {m.tarjeta.titulo}
                  </p>
                  <p className="mt-0.5 text-xs text-sidebar-muted-foreground">{m.tarjeta.detalle}</p>
                  <p className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-sidebar-primary">
                    {m.tarjeta.accion}
                    <ArrowRight aria-hidden className="size-3" />
                  </p>
                </div>
              ) : (
                <p
                  key={i}
                  className={cn(
                    'w-fit max-w-[88%] rounded-xl px-3.5 py-2 text-sm leading-relaxed',
                    m.de === 'yo'
                      ? 'ml-auto bg-chat-bubble text-chat-bubble-foreground'
                      : 'bg-sidebar-accent text-sidebar-foreground',
                    'fuerte' in m && m.fuerte && 'font-semibold',
                  )}
                >
                  {m.texto}
                </p>
              ),
            )}

            {visibles < HILO.length && (
              <p className="text-sm text-sidebar-muted-foreground" aria-hidden>
                Numi está escribiendo…
              </p>
            )}
          </div>

          <p className="mt-4 rounded-full border border-sidebar-border px-4 py-2.5 text-sm text-sidebar-muted-foreground">
            Pregúntale lo que quieras — dentro de tu cuenta
          </p>
        </div>
      </div>
    </section>
  )
}

/**
 * Va soltando los mensajes del hilo, uno a uno, cuando la sección entra en pantalla.
 *
 * Con `prefers-reduced-motion` aparecen todos de golpe: la conversación es **contenido**, no
 * adorno, y quien pide menos movimiento no puede quedarse sin leerla.
 */
function useHiloEscrito(ref: React.RefObject<HTMLDivElement | null>) {
  const [visibles, setVisibles] = useState(0)

  useEffect(() => {
    const nodo = ref.current
    if (!nodo) return

    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (quieto) {
      setVisibles(HILO.length)
      return
    }

    let temporizador: number | undefined
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return
        observador.disconnect()
        const siguiente = () => {
          setVisibles((n) => {
            if (n >= HILO.length) return n
            temporizador = window.setTimeout(siguiente, RITMO_MS)
            return n + 1
          })
        }
        temporizador = window.setTimeout(siguiente, 400)
      },
      { threshold: 0.3 },
    )
    observador.observe(nodo)

    return () => {
      observador.disconnect()
      window.clearTimeout(temporizador)
    }
  }, [ref])

  return visibles
}
