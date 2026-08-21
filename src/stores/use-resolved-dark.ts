import { useEffect, useState } from 'react'
import { useThemeStore, type ThemeMode } from './theme'

export function isDark(mode: ThemeMode, systemDark: boolean): boolean {
  return mode === 'system' ? systemDark : mode === 'dark'
}

/**
 * Si el tema activo es oscuro **ahora mismo**, resuelto ya el `'system'`.
 *
 * Existe porque hay dos sitios que necesitan la misma respuesta y no pueden compartir el
 * DOM para saberla: `ThemeProvider`, que pone la clase en `<html>`, y la portada, que se
 * pinta con su propia paleta y necesita elegir el modo antes de renderizar. Sin esto, la
 * portada leería la clase que el provider acaba de escribir — un acoplamiento por efecto
 * secundario que se rompe en cuanto una de las dos se monta primero.
 */
export function useResolvedDark(): boolean {
  const mode = useThemeStore((s) => s.mode)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const alCambiar = () => setSystemDark(mql.matches)
    alCambiar()
    mql.addEventListener('change', alCambiar)
    return () => mql.removeEventListener('change', alCambiar)
  }, [])

  return isDark(mode, systemDark)
}
