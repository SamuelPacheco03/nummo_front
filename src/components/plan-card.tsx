import { useId, type ReactNode } from 'react'
import {
  BadgeCheck,
  Check,
  KeyRound,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Mic,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BasicoArt, FreeArt, ProArt } from './plan-art'
import { cn } from '@/lib/utils'

/**
 * La tarjeta de un plan.
 *
 * **Una sola, y la usan las dos caras**: la portada, que vende a quien todavía no tiene
 * cuenta, y «Plan y consumo» dentro de la consola, que explica a quien ya la tiene. Se
 * parecen tanto que copiar una y cambiarle las palabras era lo más rápido — y en dos
 * semanas contarían historias distintas sobre los mismos planes (§«Nada por duplicado»).
 *
 * Lo que cambia entre las dos viaja como props: los datos llegan ya normalizados, porque
 * cada lado los recibe con una forma distinta del contrato —la portada como listas, la
 * consola como mapas— y esa diferencia no tiene por qué llegar hasta aquí.
 *
 * **La insignia la decide quien monta la tarjeta, y no todas valen en los dos sitios.** La
 * consola marca «Tu plan» —un dato del contrato— y NO marca ningún «Recomendado», porque
 * esa señal el API no la publica y ponerla ahí sería escribir una decisión de precio en el
 * front (§70). En la portada sí se destaca uno, pero eso es una decisión de la página, no
 * un dato: se toma en `pricing-section.tsx` y se lee ahí.
 */

/** La ilustración de cada plan, por su código del contrato. */
const ARTE_DE_PLAN: Record<string, (p: { className?: string }) => React.ReactElement> = {
  FREE: FreeArt,
  BASIC: BasicoArt,
  PRO: ProArt,
}

/** El icono de cada tope, por la clave del catálogo del backend. */
const ICONO_DE_TOPE: Record<string, LucideIcon> = {
  max_contacts: Users,
  max_users: UserCog,
  max_branches: MapPin,
  ai_messages_monthly: MessageCircle,
  voice_minutes_monthly: Mic,
  whatsapp_messages_monthly: MessageSquareText,
}

export interface TopeDePlan {
  key: string
  /** Cómo se llama, ya en la forma en que se lee. */
  label: string
  /** Ya formateado: «1.500», «Sin límite», «0». */
  valor: string
}

/** El icono de cada función, por la clave del catálogo del backend. */
const ICONO_DE_FUNCION: Record<string, LucideIcon> = {
  ai_byok: KeyRound,
  custom_roles: ShieldCheck,
  approvals: BadgeCheck,
}

export interface FuncionDePlan {
  key: string
  label: string
  included: boolean
}

export interface PlanCardProps {
  nombre: string
  /** El código del contrato (`FREE`, `BASIC`, `PRO`): elige la ilustración. */
  codigo?: string
  /**
   * El precio ya resuelto.
   *
   * `null` significa **«a consultar», no gratis**: el plan gratuito trae un importe de
   * cero, que es un precio de verdad. Pintar el vacío como cero convertiría un plan sin
   * tarifa publicada en una promesa que nadie hizo.
   */
  precio: { monto: string; porMes: boolean } | null
  descripcion: string | null
  topes: readonly TopeDePlan[]
  funciones: readonly FuncionDePlan[]
  /** El plan que la página empuja. Solo uno, o no destaca ninguno. */
  destacado?: boolean
  insignia?: { texto: string; tono: 'actual' | 'recomendado' } | null
  /** El pie. Cada lado pone el suyo: un enlace en la portada, un botón en la consola. */
  accion: ReactNode
  className?: string
}

export function PlanCard({
  nombre,
  codigo,
  precio,
  descripcion,
  topes,
  funciones,
  destacado = false,
  insignia = null,
  accion,
  className,
}: PlanCardProps) {
  const titleId = useId()
  const Arte = codigo ? ARTE_DE_PLAN[codigo] : undefined

  return (
    /*
      Agrupada y con nombre: un lector de pantalla anuncia «Básico» al entrar en la
      tarjeta, en vez de leer once cifras sueltas sin saber de quién son.
    */
    <div
      role="group"
      aria-labelledby={titleId}
      className={cn(
        'relative flex min-w-0 flex-col rounded-2xl border p-6 transition-[transform,box-shadow] duration-300',
        'hover:-translate-y-1',
        destacado
          ? 'border-brand/40 bg-card shadow-[0_20px_50px_-24px_var(--brand)] hover:shadow-[0_28px_60px_-24px_var(--brand)]'
          : 'border-border bg-card hover:border-brand/30 hover:shadow-sm',
        className,
      )}
    >
      {/* Montada sobre el borde: señala la tarjeta sin robarle una línea al contenido. */}
      {/* Un velo de marca, no un fondo: tiñe sin cambiar la superficie de la tarjeta. */}
      {destacado && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-brand/[0.05] to-transparent"
        />
      )}

      {insignia && (
        <span
          className={cn(
            'absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
            insignia.tono === 'recomendado'
              ? 'bg-brand text-brand-foreground'
              : 'border border-border bg-card text-muted-foreground',
          )}
        >
          {insignia.tono === 'recomendado' ? (
            <Check aria-hidden className="size-3.5" />
          ) : (
            <span aria-hidden className="size-1.5 rounded-full bg-success" />
          )}
          {insignia.texto}
        </span>
      )}

      <div className="relative flex items-start justify-between gap-4">
        <p id={titleId} className="font-display text-lg font-semibold text-foreground">
          {nombre}
        </p>
        {Arte && <Arte className="-mt-2 h-20 w-24 shrink-0" />}
      </div>

      <div className="relative mt-5">
        {precio ? (
          <p className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-semibold tracking-tight text-foreground tabular-nums">
              {precio.monto}
            </span>
            {precio.porMes && <span className="text-sm text-muted-foreground">/ mes</span>}
          </p>
        ) : (
          <>
            <p className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Precio personalizado
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Se ajusta a tu operación</p>
          </>
        )}
      </div>

      {descripcion && (
        <p className="relative mt-4 text-sm leading-relaxed text-muted-foreground">{descripcion}</p>
      )}

      {topes.length > 0 && (
        <ul className="relative mt-6 space-y-3 border-t border-border pt-6 text-sm">
          {topes.map((tope) => {
            const Icon = ICONO_DE_TOPE[tope.key]
            return (
              <li key={tope.key} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
                  {Icon && (
                    <span
                      aria-hidden
                      className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-brand"
                    >
                      <Icon className="size-4" />
                    </span>
                  )}
                  <span className="min-w-0 truncate">{tope.label}</span>
                </span>
                <span className="shrink-0 font-medium text-foreground tabular-nums">
                  {tope.valor}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {funciones.length > 0 && (
        <ul className="relative mt-6 space-y-3 border-t border-border pt-6 text-sm">
          {funciones.map((f) => (
            <li
              key={f.key}
              className={cn(
                'flex items-center gap-2.5',
                f.included ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {/*
                Relleno cuando está incluido y contorno cuando no. La diferencia no puede
                ser solo el color: quien no distingue el azul del gris tiene que poder
                leerla igual, y por eso también cambia el símbolo (§45).
              */}
              {f.included ? (
                <span
                  aria-hidden
                  className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground"
                >
                  <Check className="size-3" />
                </span>
              ) : (
                <span
                  aria-hidden
                  className="grid size-5 shrink-0 place-items-center rounded-full border border-border bg-secondary"
                >
                  <span className="h-1 w-1.5 rounded-full bg-current opacity-60" />
                </span>
              )}
              <span className="flex min-w-0 items-center gap-1.5">
                {ICONO_DE_FUNCION[f.key] && (
                  <IconoFuncion Icon={ICONO_DE_FUNCION[f.key]} incluida={f.included} />
                )}
                {f.label}
              </span>
              <span className="sr-only">{f.included ? 'incluido' : 'no incluido'}</span>
            </li>
          ))}
        </ul>
      )}

      {/* `mt-auto`: los pies quedan alineados aunque las descripciones midan distinto. */}
      <div className="relative mt-auto pt-6">{accion}</div>
    </div>
  )
}

/** El icono de una función, apagado cuando el plan no la incluye. */
function IconoFuncion({ Icon, incluida }: { Icon: LucideIcon; incluida: boolean }) {
  return <Icon aria-hidden className={cn('size-3.5 shrink-0', incluida ? 'text-brand' : 'opacity-50')} />
}
