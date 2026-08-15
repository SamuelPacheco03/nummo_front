import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Selector segmentado (tabs ligeros): una opción activa, estilo consola. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (value: T) => void
  className?: string
  'aria-label'?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex flex-wrap rounded-md border p-0.5', className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded px-3 py-1.5 text-sm transition-colors',
            value === o.value
              ? 'bg-secondary font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
