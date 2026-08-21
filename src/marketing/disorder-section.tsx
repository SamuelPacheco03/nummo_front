import { ArrowRight, Check, FileText, HelpCircle, MessageCircle, Wallet } from 'lucide-react'
import { formatCompactAmount } from '@/lib/format'
import { SectionHeading } from './section-heading'
import { useReveal } from './use-reveal'

/**
 * «El desorden cuesta»: el antes y el después, uno al lado del otro.
 *
 * **Va sin señal, a propósito.** El catálogo cerrado de `section` no tiene un nombre para
 * esta sección —se fijó antes de que la página existiera— y está pedido al backend (issue
 * #2 de `nummo_api`). Meterla bajo `automation` o `integrations` mediría una cosa
 * llamándola otra, y una tabla de analítica que miente es peor que un hueco.
 *
 * Único gesto: las tarjetas del «antes» flotan apenas al entrar y las barras del «después»
 * se llenan.
 */

/** Los papeles sueltos del «antes». La posición es parte del mensaje: no están alineados. */
const DISPERSOS = [
  { Icon: FileText, texto: 'Factura #048', cola: 'vencida', pos: 'left-[6%] top-[18%]' },
  { Icon: Wallet, texto: 'Pago sin conciliar', cola: null, pos: 'right-[8%] top-[38%]' },
  { Icon: MessageCircle, texto: '«¿Ya pagaste?»', cola: null, pos: 'left-[16%] bottom-[16%]' },
] as const

export function DisorderSection() {
  const ref = useReveal<HTMLDivElement>()

  return (
    <section id="producto" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          rotulo="El desorden cuesta"
          principal="La operación financiera"
          secundaria="no debería depender de tu memoria."
        />
        <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
          Cuando todo vive en diferentes lugares, cada decisión toma más tiempo. Nummo reúne las
          señales para que puedas actuar.
        </p>

        <div ref={ref} className="mt-14 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
          {/* ANTES: superficie apagada y nada en su sitio. */}
          <div
            data-revelar
            className="relative min-h-[19rem] overflow-hidden rounded-2xl bg-muted p-6"
          >
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Antes · disperso
            </p>
            {DISPERSOS.map(({ Icon, texto, cola, pos }) => (
              <span
                key={texto}
                className={`absolute ${pos} flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-xs shadow-sm`}
              >
                <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="whitespace-nowrap text-foreground">{texto}</span>
                {cola && <span className="whitespace-nowrap text-destructive-strong">{cola}</span>}
              </span>
            ))}
            <span
              className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-dashed border-border"
              aria-hidden
            >
              <HelpCircle className="size-4 text-muted-foreground" />
            </span>
          </div>

          <span className="grid place-items-center" aria-hidden>
            <ArrowRight className="size-5 rotate-90 text-muted-foreground lg:rotate-0" />
          </span>

          {/* DESPUÉS: una sola superficie, y las cifras en su sitio. */}
          <div
            data-revelar
            style={{ ['--paso' as string]: '140ms' }}
            className="min-h-[19rem] rounded-2xl bg-sidebar p-6"
          >
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-sidebar-muted-foreground">
              Después · Nummo
            </p>

            <div className="mt-6 flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success" aria-hidden>
                <Check className="size-4 text-success-foreground" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-sidebar-foreground">
                  Todo bajo control
                </span>
                <span className="block text-xs text-sidebar-muted-foreground">
                  4 acciones sugeridas por Numi
                </span>
              </span>
            </div>

            <dl className="mt-8 space-y-5">
              <Barra etiqueta="Ingresos" valor={formatCompactAmount('18400000.00')} porcentaje={82} tono="bg-success" />
              <Barra etiqueta="Próximos pagos" valor="3" porcentaje={38} tono="bg-primary" />
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Una barra del panel «después». Se llena al entrar, con el mismo escalonado del resto. */
function Barra({
  etiqueta,
  valor,
  porcentaje,
  tono,
}: {
  etiqueta: string
  valor: string
  porcentaje: number
  tono: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-sm text-sidebar-muted-foreground">{etiqueta}</dt>
        <dd className="text-sm font-medium text-sidebar-foreground tabular-nums">{valor}</dd>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sidebar-accent">
        {/*
          El ancho va en línea porque es un dato, no una escala: una utilidad `w-[82%]`
          escondería en una clase lo que aquí se lee de un vistazo.
        */}
        <span
          className={`block h-full rounded-full transition-[width] duration-1000 ease-out ${tono}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  )
}
