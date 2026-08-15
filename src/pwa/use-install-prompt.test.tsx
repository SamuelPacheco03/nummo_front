import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallAppButton } from './install-app-button'

/** Simula el `beforeinstallprompt` de Chromium con el resultado indicado. */
function fireInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }
  const prompt = vi.fn(async () => {})
  event.prompt = prompt
  event.userChoice = Promise.resolve({ outcome })
  window.dispatchEvent(event)
  return { event, prompt }
}

describe('InstallAppButton', () => {
  it('permanece oculto mientras el navegador no ofrezca instalar', () => {
    render(<InstallAppButton />)
    expect(screen.queryByRole('button', { name: /instalar app/i })).not.toBeInTheDocument()
  })

  it('aparece con beforeinstallprompt y lanza el diálogo nativo al pulsarlo', async () => {
    render(<InstallAppButton />)
    const { event, prompt } = fireInstallPrompt()

    // Sin preventDefault, Chrome se queda con su propio infobar y prompt() falla.
    expect(event.defaultPrevented).toBe(true)

    const button = await screen.findByRole('button', { name: /instalar app/i })
    await userEvent.click(button)
    expect(prompt).toHaveBeenCalledOnce()

    // El evento es de un solo uso: tras consumirlo, el botón se retira.
    expect(screen.queryByRole('button', { name: /instalar app/i })).not.toBeInTheDocument()
  })

  it('se retira cuando el sistema avisa de que la app ya está instalada', async () => {
    render(<InstallAppButton />)
    fireInstallPrompt()
    await screen.findByRole('button', { name: /instalar app/i })

    window.dispatchEvent(new Event('appinstalled'))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /instalar app/i })).not.toBeInTheDocument(),
    )
  })
})
