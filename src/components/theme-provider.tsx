import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useThemeStore } from '@/stores/theme'
import { isDark } from '@/stores/use-resolved-dark'

/**
 * Color de la barra de estado / título (= el fondo de la superficie, `--background`).
 *
 * Llega como prop porque **hay dos superficies**: la consola, que es azul, y la portada,
 * que se pinta con su propia paleta (§97.1). Estuvo escrito a mano aquí dentro hasta que
 * la portada existió, y entonces la barra del navegador se quedaba azul sobre una página
 * crema — el único sitio de la app donde un color se declaraba dos veces y una de las dos
 * mentía.
 */
export interface ColoresDeTema {
  light: string
  dark: string
}

const COLORES_CONSOLA: ColoresDeTema = { light: '#f8fafc', dark: '#0b1220' }

/**
 * `index.html` trae dos <meta name="theme-color"> con media queries, pero eso
 * solo cubre el modo "system": si el usuario fuerza claro u oscuro dentro de la
 * app, hay que decírselo al navegador con un meta sin media que gane a los dos.
 */
function applyThemeColor(dark: boolean, colores: ColoresDeTema) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = dark ? colores.dark : colores.light
}

/**
 * Aplica el tema al <html> (clase `.dark` + color-scheme).
 * useEffect aquí es legítimo: sincroniza con un sistema externo (DOM + matchMedia).
 */
export function ThemeProvider({
  children,
  colores = COLORES_CONSOLA,
}: {
  children: ReactNode
  colores?: ColoresDeTema
}) {
  const mode = useThemeStore((s) => s.mode)

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = isDark(mode, mql.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
      applyThemeColor(dark, colores)
    }
    apply()
    if (mode === 'system') {
      mql.addEventListener('change', apply)
      return () => mql.removeEventListener('change', apply)
    }
  }, [mode, colores])

  return children
}
