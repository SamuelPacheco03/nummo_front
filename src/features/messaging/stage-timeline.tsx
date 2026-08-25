import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

export interface Stage {
  on: boolean
  days: number
}

/**
 * **Las tres etapas por las que pasa una cuenta por cobrar**, alrededor del día
 * en que vence.
 *
 * Va como línea de tiempo y no como tres filas de casilla y número porque lo que
 * se viene a comprobar aquí es **la forma** de la cobranza —cuándo se avisa y con
 * cuánto margen—, y eso una lista no lo enseña: hay que reconstruirlo leyendo
 * tres renglones y sumando de cabeza.
 *
 * Cada etapa dispara **una sola vez en toda la vida de la cuenta**. No es un tope
 * que el backend comprueba: es que no existen más etapas.
 *
 * En un teléfono la línea se pone **vertical**. Horizontal, tres nodos con su
 * stepper no caben en 360 px sin encoger los controles por debajo del tamaño al
 * que se les puede dar (§46).
 */
export function StageTimeline({
  before,
  onDue,
  after,
  disabled,
  onBefore,
  onOnDue,
  onAfter,
}: {
  before: Stage
  onDue: boolean
  after: Stage
  disabled: boolean
  onBefore: (stage: Stage) => void
  onOnDue: (on: boolean) => void
  onAfter: (stage: Stage) => void
}) {
  return (
    <div>
      {/* El raíl solo existe en escritorio: apilado, la línea la hace el borde. */}
      <div aria-hidden className="relative mt-2 hidden h-8 sm:block">
        <div className="absolute top-[13px] right-[8%] left-[8%] flex">
          <span className={cn('h-[3px] flex-1 rounded-full', before.on ? 'bg-brand' : 'bg-border')} />
          <span className="bg-border h-[3px] w-8 shrink-0" />
          <span className={cn('h-[3px] flex-1 rounded-full', after.on ? 'bg-brand' : 'bg-border')} />
        </div>
        <div className="absolute inset-0 grid grid-cols-3 items-center">
          <Nodo activo={before.on} />
          <span className="flex justify-center">
            <span className="bg-foreground size-4 rotate-45 rounded-xs" />
          </span>
          <Nodo activo={after.on} />
        </div>
      </div>

      <div className="text-muted-foreground mt-1 hidden grid-cols-3 gap-4 text-center text-[0.7rem] tracking-wide sm:grid">
        <span>ANTES</span>
        <span className="text-foreground font-semibold">DÍA DEL VENCIMIENTO</span>
        <span>DESPUÉS</span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <StageCard
          label="Avisar antes"
          unit={before.days === 1 ? 'día antes' : 'días antes'}
          min={1}
          stage={before}
          disabled={disabled}
          onChange={onBefore}
        />

        <div
          className={cn(
            'flex flex-col justify-between rounded-lg border p-3.5',
            onDue ? 'border-brand/35 bg-brand/4' : 'bg-muted/40',
          )}
        >
          <label className={cn('flex items-center gap-2.5', disabled ? 'opacity-60' : 'cursor-pointer')}>
            <Switch size="sm" checked={onDue} disabled={disabled} onCheckedChange={onOnDue} />
            <span className="text-sm font-medium">El día que vence</span>
          </label>
          {/*
            La única de las tres que no se recupera: su texto dice «vence hoy» y
            mandarlo tarde sería falso, así que si no sale ese día se pierde y lo
            recoge el de mora.
          */}
          <p className="text-muted-foreground mt-3 text-xs">
            Sale esa mañana. Si no alcanza a salir ese día, no se recupera.
          </p>
        </div>

        <StageCard
          label="Avisar la mora"
          unit={after.days === 0 ? 'el mismo día' : after.days === 1 ? 'día después' : 'días después'}
          /* Cero es válido: avisa el mismo día del vencimiento. */
          min={0}
          stage={after}
          disabled={disabled}
          onChange={onAfter}
        />
      </div>
    </div>
  )
}

function Nodo({ activo }: { activo: boolean }) {
  return (
    <span className="flex justify-center">
      <span
        className={cn(
          'bg-card size-3.5 rounded-full border-[3px]',
          activo ? 'border-brand' : 'border-border',
        )}
      />
    </span>
  )
}

/**
 * Una etapa con número: **el interruptor y la cifra van separados a propósito**.
 *
 * Apagar no es poner cero. `daysAfter: 0` avisa el mismo día del vencimiento —un
 * aviso más, no uno menos— y apagada no manda nada. Con un solo campo numérico
 * las dos cosas se escribirían igual y no habría forma de apagar sin adelantar.
 *
 * Y el número **solo existe si la etapa está encendida**: apagada no hay nada que
 * contar, y un campo activo al lado de un interruptor en gris invita a escribir
 * algo que no se va a guardar.
 */
function StageCard({
  label,
  unit,
  min,
  stage,
  disabled,
  onChange,
}: {
  label: string
  unit: string
  min: number
  stage: Stage
  disabled: boolean
  onChange: (stage: Stage) => void
}) {
  const set = (days: number) => onChange({ on: true, days: Math.min(90, Math.max(min, days)) })

  return (
    <div
      className={cn(
        'rounded-lg border p-3.5',
        stage.on ? 'border-brand/35 bg-brand/4' : 'bg-muted/40',
      )}
    >
      <label className={cn('flex items-center gap-2.5', disabled ? 'opacity-60' : 'cursor-pointer')}>
        <Switch
          size="sm"
          checked={stage.on}
          disabled={disabled}
          onCheckedChange={(on) => onChange({ ...stage, on })}
        />
        <span className="text-sm font-medium">{label}</span>
      </label>

      {stage.on ? (
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            disabled={disabled || stage.days <= min}
            aria-label={`${label}: un día menos`}
            onClick={() => set(stage.days - 1)}
          >
            <Minus />
          </Button>
          <p className="min-w-0 flex-1 text-center">
            <output className="nums text-lg font-semibold" aria-label={`${label}, ${unit}`}>
              {stage.days}
            </output>
            <span className="text-muted-foreground ml-1.5 text-xs">{unit}</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            disabled={disabled || stage.days >= 90}
            aria-label={`${label}: un día más`}
            onClick={() => set(stage.days + 1)}
          >
            <Plus />
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground mt-3 text-xs">Apagada: no sale este aviso.</p>
      )}
    </div>
  )
}
