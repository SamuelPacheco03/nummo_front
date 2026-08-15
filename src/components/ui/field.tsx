import { type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { InfoHint } from '@/components/ui/info-hint'

/** Envoltorio Label + control + hint/error para formularios (RHF). */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  info,
  required,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  /** Si se pasa, muestra un ícono ⓘ junto al label con esta explicación. */
  info?: ReactNode
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        {info && <InfoHint label={`Qué es: ${label}`}>{info}</InfoHint>}
      </div>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
