import { useEffect, useState } from 'react'
import { Toaster as SonnerToaster } from 'sonner'
import { useThemeStore } from '@/stores/theme'

function useResolvedTheme(): 'light' | 'dark' {
  const mode = useThemeStore((s) => s.mode)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return mode === 'system' ? (systemDark ? 'dark' : 'light') : mode
}

/** Toaster de Sonner ligado al tema de Nummo. */
export function Toaster() {
  const theme = useResolvedTheme()
  return (
    <SonnerToaster
      theme={theme}
      position="top-center"
      richColors
      closeButton
      toastOptions={{ classNames: { toast: 'font-sans' } }}
    />
  )
}
