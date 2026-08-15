import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useThemeStore, type ThemeMode } from '@/stores/theme'

function isDark(mode: ThemeMode, systemDark: boolean): boolean {
  return mode === 'system' ? systemDark : mode === 'dark'
}

/** Color de la barra de estado / título en la app instalada (= --background). */
const THEME_COLOR = { light: '#f8fafc', dark: '#020617' } as const

/**
 * `index.html` trae dos <meta name="theme-color"> con media queries, pero eso
 * solo cubre el modo "system": si el usuario fuerza claro u oscuro dentro de la
 * app, hay que decírselo al navegador con un meta sin media que gane a los dos.
 */
function applyThemeColor(dark: boolean) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = dark ? THEME_COLOR.dark : THEME_COLOR.light
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
      applyThemeColor(dark)
    }
    apply()
    if (mode === 'system') {
      mql.addEventListener('change', apply)
      return () => mql.removeEventListener('change', apply)
    }
  }, [mode])

  return children
}
