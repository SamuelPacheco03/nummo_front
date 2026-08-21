import { Link } from 'react-router'
import { useCapabilities } from '@/features/platform/hooks'
import { cn } from '@/lib/utils'

/**
 * **Cuánto cupo de cobranza queda este mes.**
 *
 * Lee `me/capabilities` directamente y no `useLimitUsage`: aquel cuenta también
 * contactos, miembros y sedes —tres consultas más— para pintar la pantalla de
 * plan entera, y aquí solo hace falta una cifra que ya viene en las capacidades
 * que la app pide al entrar.
 *
 * Tres cosas que se hacen mal solas:
 *
 * 1. **Un tope en `null` es «sin límite», nunca cero** (§45.6).
 * 2. **Con número propio conectado el consumo deja de subir**, porque esos
 *    mensajes se los paga el negocio a Meta y no pasan por la cuota. Enseñar una
 *    barra que nunca se mueve sin decir por qué parece un contador roto.
 * 3. **`period` es el mes de la organización**, resuelto en su zona horaria, y no
 *    el del navegador. No se recalcula aquí.
 *
 * Y al llenarse **no se pinta de rojo**: el rojo de §7 es lo vencido y lo
 * fallido, y un cupo agotado es un tope que se renueva solo el mes que viene.
 */
export function QuotaStrip({ ownNumber }: { ownNumber: boolean }) {
  const { capabilities } = useCapabilities()
  const max = capabilities?.limits.whatsapp_messages_monthly
  const used = capabilities?.usage.whatsapp_messages_monthly

  if (!capabilities || used == null) return null

  if (ownNumber) {
    return (
      <p className="text-muted-foreground text-sm">
        Los mensajes salen por tu número, así que no gastan cupo del plan.
      </p>
    )
  }

  if (max == null) {
    return (
      <p className="text-muted-foreground text-sm">
        Sin tope de mensajes este mes. Llevas {used}.
      </p>
    )
  }

  const ratio = max === 0 ? 1 : Math.min(used / max, 1)
  const exhausted = used >= max
  const warning = !exhausted && ratio >= 0.8

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Mensajes de cobranza este mes</span>
        <span className="nums font-medium">
          {used} de {max}
        </span>
      </div>

      <div className="bg-secondary h-1.5 overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full', exhausted || warning ? 'bg-warning' : 'bg-brand')}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>

      {exhausted ? (
        <p className="text-warning-strong text-xs">
          Sin cupo: los recordatorios no vuelven a salir hasta el próximo periodo.{' '}
          <Link to="/config/plan" className="underline">
            Ver planes
          </Link>{' '}
          o{' '}
          <Link to="/config/whatsapp" className="underline">
            conectar tu número
          </Link>
          .
        </p>
      ) : warning ? (
        <p className="text-warning-strong text-xs">
          Se está acabando. Cuando se agote, los recordatorios dejan de salir hasta el próximo
          periodo.
        </p>
      ) : null}
    </div>
  )
}
