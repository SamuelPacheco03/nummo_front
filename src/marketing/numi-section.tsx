import { useEffect, useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { rutasApp } from './links'
import { SectionHeading } from './section-heading'
import type { Cola } from './signals'
import { useReveal } from './use-reveal'
import { useSectionViewed } from './use-section-viewed'

/**
 * «Numi»: qué hace y, sobre todo, **qué es** — un asesor, no un chat.
 *
 * El encuadre es la mitad del trabajo de esta sección. La versión anterior lo presentaba
 * como «tu asistente financiero» y repartía sus virtudes en tres viñetas pequeñas; se leía
 * como «una IA con chat metida en una aplicación», que es de lo que el visitante ya está
 * cansado. Ahora la sección se ordena alrededor de **tres palabras grandes** —entiende,
 * recomienda, actúa— porque esas tres explican a Numi entero sin obligar a leer un párrafo,
 * y porque la tercera es la que ningún chat puede decir.
 *
 * El titular hace lo mismo con una oposición: **qué pasó / qué sigue**. La portada ya parte
 * sus titulares en dos tonos, y aquí el corte deja de ser adorno — cada mitad lleva uno de
 * los dos lados de la frase.
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

/**
 * Las tres palabras, que son el esqueleto de la sección.
 *
 * Cada línea es comprobable contra el contrato (§97.18): Numi lee cartera, pagos y
 * reportes, y sus permisos de escritura incluyen `receivables.create` y `messaging.send`.
 * «Actúa» es la que separa a Numi de un chat, así que es la que no puede quedarse en
 * promesa.
 */
const LO_QUE_HACE = [
  {
    palabra: 'Entiende',
    texto:
      'Lee tus cobros, tus pagos y tus movimientos, y sabe qué cambió esta semana sin que se lo preguntes.',
  },
  {
    palabra: 'Recomienda',
    texto:
      'De todo lo pendiente, qué conviene atender hoy y por qué. Con el nombre y la cifra, no un consejo genérico.',
  },
  {
    palabra: 'Actúa',
    texto: 'Crea el cobro, redacta el recordatorio y lo manda por WhatsApp. Tú solo dices que sí.',
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
      /* Nombra la acción, no la pantalla: es «Actúa» ocurriendo, y hay que verlo. */
      accion: 'Enviar recordatorio',
    },
  },
] as const

/** Cuánto tarda en aparecer cada mensaje. Es una conversación, no una lista. */
const RITMO_MS = 900

export function NumiSection({ cola }: { cola: Cola | null }) {
  const refSeccion = useSectionViewed(cola, 'numi')
  const refHilo = useReveal<HTMLDivElement>()
  const refPalabras = useReveal<HTMLOListElement>()
  const visibles = useHiloEscrito(refHilo)

  return (
    <section ref={refSeccion} id="numi" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading
              rotulo="Tu asesor financiero, dentro de Nummo"
              principal="Tus números te dicen qué pasó."
              secundaria="Numi te ayuda a decidir qué sigue."
            />
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              Analiza tu cuenta, detecta lo que merece tu atención, te recomienda el siguiente
              paso y puede llevarlo a la acción dentro de Nummo.
            </p>

            <a
              href={rutasApp.registro}
              onClick={() => cola?.encolar({ name: 'cta_clicked', section: 'numi', action: 'signup' })}
              className="mt-9 inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-cta px-6 text-sm font-semibold text-cta-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Probar Numi con tu cuenta
              <ArrowRight aria-hidden className="size-4" />
            </a>
          </div>

          {/* El hilo. Se escribe solo al entrar: uno de los dos gestos de la sección. */}
          <div ref={refHilo} className="flex min-h-[26rem] flex-col rounded-2xl bg-sidebar p-5">
            <div className="flex items-center gap-2.5 border-b border-sidebar-border pb-4">
              <span
                className="grid size-8 place-items-center rounded-lg bg-sidebar-accent"
                aria-hidden
              >
                <Sparkles className="size-4 text-sidebar-primary" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-sidebar-foreground">Numi</span>
                <span className="block text-xs text-sidebar-muted-foreground">
                  Dentro de tu cuenta
                </span>
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
                    <p className="mt-0.5 text-xs text-sidebar-muted-foreground">
                      {m.tarjeta.detalle}
                    </p>
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

        {/*
          Las tres palabras, a lo ancho y a tamaño de titular.

          Van fuera de la rejilla de arriba y no dentro de su columna izquierda porque a esta
          escala no caben en media página: apretadas junto al panel dejarían de ser palabras
          grandes, que es todo lo que tienen que ser.

          Se separan con una línea fina encima. «Del movimiento a la acción» ya usa una línea
          que UNE sus pasos; esta divide, y por eso no se confunden: aquello es una secuencia
          en el tiempo y esto son tres capacidades.
        */}
        <ol ref={refPalabras} className="mt-20 grid gap-10 md:grid-cols-3 md:gap-8">
          {LO_QUE_HACE.map(({ palabra, texto }, i) => (
            <li
              key={palabra}
              data-revelar
              style={{ ['--paso' as string]: `${i * 140}ms` }}
              className="border-t border-border pt-6"
            >
              <h3 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {palabra}
              </h3>
              <p className="mt-3 max-w-xs text-base leading-relaxed text-muted-foreground">
                {texto}
              </p>
            </li>
          ))}
        </ol>
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
