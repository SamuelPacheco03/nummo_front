import { Monitor, Moon, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useThemeStore, type ThemeMode } from '@/stores/theme'
import { cn } from '@/lib/utils'

const OPTIONS: { mode: ThemeMode; label: string; Icon: LucideIcon }[] = [
  { mode: 'light', label: 'Claro', Icon: Sun },
  { mode: 'system', label: 'Sistema', Icon: Monitor },
  { mode: 'dark', label: 'Oscuro', Icon: Moon },
]

/** Selector segmentado Claro / Sistema / Oscuro. */
export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="inline-flex items-center gap-0.5 rounded-lg border bg-card p-0.5"
    >
      {OPTIONS.map(({ mode: m, label, Icon }) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          aria-label={label}
          title={label}
          onClick={() => setMode(m)}
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground',
            mode === m && 'bg-secondary text-foreground shadow-xs',
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  )
}
