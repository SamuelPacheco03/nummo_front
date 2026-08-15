import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Estado de UI del tema (Zustand = SOLO estado de interfaz, nunca datos de servidor).
 * En Fase 1 se sincroniza con `organizationSettings.themeMode` del backend.
 */
export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'nummo-theme' },
  ),
)
