import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useThemeStore, type ThemeMode } from '@/stores/theme'

function isDark(mode: ThemeMode, systemDark: boolean): boolean {
  return mode === 'system' ? systemDark : mode === 'dark'
}

/**
 * Aplica el tema al <html> (clase `.dark` + color-scheme).
 * useEffect aquí es legítimo: sincroniza con un sistema externo (DOM + matchMedia).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((s) => s.mode)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = isDark(mode, mql.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    }
    apply()
    if (mode === 'system') {
      mql.addEventListener('change', apply)
      return () => mql.removeEventListener('change', apply)
    }
  }, [mode])

  return children
}
