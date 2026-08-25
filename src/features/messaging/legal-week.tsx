import { Lock } from 'lucide-react'
import type { CollectionPolicySchedule } from '@/api/generated/model'
import { cn } from '@/lib/utils'

/** Días ISO en la inicial con la que se leen de un vistazo. */
const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/**
 * **El horario permitido, en siete pastillas.**
 *
 * Donde hay ley que lo fija —en Colombia la 2300— esto no es una preferencia y no
 * se puede tocar ni para ampliarlo ni para recortarlo. Aun así se enseña en vez
 * de esconderse: es lo que explica por qué un recordatorio no salió el domingo, y
 * esa pregunta se hace justo en esta pantalla.
 *
 * Siete pastillas y no una tabla de tres filas, porque lo que se busca aquí es
 * comprobar un día concreto, no leer un horario de arriba abajo. Y **el domingo
 * dice «nunca» con la palabra**: pintarlo como una franja vacía —«00:00–00:00»—
 * diría que se escribe a medianoche.
 */
export function LegalWeek({
  schedule,
  className,
}: {
  schedule: CollectionPolicySchedule
  className?: string
}) {
  return (
    <div className={cn('bg-muted/40 rounded-lg border p-3.5 sm:p-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Horario permitido</p>
        {schedule.legalReference && (
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            <Lock aria-hidden className="size-3" />
            {schedule.legalReference}
          </span>
        )}
      </div>

      <ul className="mt-3 flex gap-1.5">
        {LETRAS.map((letra, i) => {
          const franja = schedule.week[String(i + 1)] ?? null
          return (
            <li
              key={letra}
              className={cn(
                'flex-1 rounded-md border px-0.5 py-1.5 text-center',
                franja ? 'border-success/35 bg-success/8' : 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'block text-xs font-semibold',
                  franja ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {letra}
              </span>
              <span
                className={cn(
                  'nums mt-0.5 block text-[0.6rem] leading-tight',
                  franja ? 'text-success-strong' : 'text-muted-foreground',
                )}
              >
                {franja ? (
                  <>
                    <span className="block">{franja.start}</span>
                    <span className="block">{franja.end}</span>
                  </>
                ) : (
                  'nunca'
                )}
              </span>
            </li>
          )
        })}
      </ul>

      {schedule.excludesHolidays && (
        <p className="text-muted-foreground mt-2.5 text-xs">
          Los festivos tampoco. No se puede cambiar, ni para ampliarlo ni para recortarlo.
        </p>
      )}
    </div>
  )
}
