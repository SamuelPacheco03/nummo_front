import { Lock } from 'lucide-react'
import type { CollectionPolicySchedule } from '@/api/generated/model'
import { cn } from '@/lib/utils'
import { groupWeek } from './schedule'

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
 * Dos formas según el sitio que haya, y no es un capricho:
 *
 * - **Con sitio, siete pastillas.** Lo que se busca es comprobar un día concreto
 *   —«¿el sábado sí?»— y una pastilla por día se mira sin leer.
 * - **En un teléfono, tres renglones agrupados.** Siete columnas en 390 px salen a
 *   40 px cada una y la hora acaba en 9 px, que no se lee: ahí es mejor la frase.
 *
 * En las dos, **el domingo dice «nunca» con la palabra**: pintarlo como una
 * franja vacía —«00:00–00:00»— diría que se escribe a medianoche.
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

      {/* Agrupada: los días seguidos que comparten franja van en un renglón. */}
      <dl className="@md:hidden mt-2.5 space-y-1 text-sm">
        {groupWeek(schedule.week).map(({ label, window }) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={cn('shrink-0', window ? 'nums' : 'text-muted-foreground')}>
              {window ? `${window.start} – ${window.end}` : 'No se contacta'}
            </dd>
          </div>
        ))}
      </dl>

      <ul className="@md:flex mt-3 hidden gap-1.5">
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
