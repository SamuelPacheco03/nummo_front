import { useCallback, useSyncExternalStore } from 'react'

/**
 * Evento no estándar de Chromium que precede al diálogo de instalación.
 * Lo capturamos a nivel de módulo (no en un efecto) porque el navegador lo
 * dispara nada más cargar: si esperamos a montar React, ya lo hemos perdido.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Sin preventDefault, Chrome muestra su propio mini-infobar y `prompt()` falla.
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    emit()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** true si la app se está ejecutando ya instalada (no en pestaña del navegador). */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
    // iOS: propiedad legacy, no estándar.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** true en Safari/iOS y iPadOS, donde no existe `beforeinstallprompt`. */
function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iOs = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ se anuncia como Mac; lo distinguimos por el soporte táctil.
  const iPadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  return iOs || iPadOs
}

interface InstallPrompt {
  /** Hay un prompt nativo disponible ahora mismo. */
  canPrompt: boolean
  /** La app ya está instalada (o corriendo instalada) → no ofrecer instalar. */
  isInstalled: boolean
  /** No hay prompt nativo pero sí se puede añadir a inicio a mano (iOS). */
  needsManualInstructions: boolean
  /** Lanza el diálogo nativo. Devuelve true si el usuario aceptó. */
  promptInstall: () => Promise<boolean>
}

export function useInstallPrompt(): InstallPrompt {
  const canPrompt = useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    () => false,
  )
  const appInstalled = useSyncExternalStore(
    subscribe,
    () => installed,
    () => false,
  )

  const promptInstall = useCallback(async () => {
    if (!deferred) return false
    const event = deferred
    // El evento es de un solo uso: se descarta lo llame o no el usuario.
    deferred = null
    emit()
    await event.prompt()
    const { outcome } = await event.userChoice
    return outcome === 'accepted'
  }, [])

  const isInstalled = appInstalled || isStandalone()

  return {
    canPrompt,
    isInstalled,
    needsManualInstructions: !isInstalled && !canPrompt && isIos(),
    promptInstall,
  }
}
