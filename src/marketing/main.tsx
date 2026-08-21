import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@/components/theme-provider'
import { LandingPage } from './landing-page'
import { TEMA_PORTADA } from './theme'
import '../index.css'

/**
 * La entrada de la **portada**, aparte de la de la consola.
 *
 * Lo que NO monta es lo importante: ni router —la portada es una página, y dos routers no
 * pueden compartir un `basename`—, ni `QueryClientProvider`, ni el manejador de 401, ni el
 * service worker. Todo eso es de la app, y arrastrarlo aquí es justo el peso que la Fase 3
 * existe para quitar.
 *
 * `ThemeProvider` sí, porque el modo oscuro de la portada es el mismo que el de la app —
 * quien tiene la consola en oscuro no espera que la portada le dé un fogonazo blanco.
 */
createRoot(document.getElementById('portada')!).render(
  <StrictMode>
    <ThemeProvider colores={TEMA_PORTADA}>
      <LandingPage />
    </ThemeProvider>
  </StrictMode>,
)
