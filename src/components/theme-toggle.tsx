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
export function ThemeToggle({ className }: { className?: string }) {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      // Hereda su superficie: se monta en el sidebar (oscuro) y en Apariencia
      // (clara), y fijar color dejaría uno de los dos ilegible (§11.2).
      className={cn('inline-flex items-center gap-0.5 rounded-lg border border-current/15 p-0.5', className)}
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
            'inline-flex size-8 items-center justify-center rounded-md opacity-60 transition-opacity hover:opacity-100',
            mode === m && 'bg-current/10 opacity-100',
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  )
}
