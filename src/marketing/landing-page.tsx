import { useEffect, useState } from 'react'
import { useResolvedDark } from '@/stores/use-resolved-dark'
import { AutomationSection } from './automation-section'
import { ConsentBanner } from './consent-banner'
import { DisorderSection } from './disorder-section'
import { FinalCta } from './final-cta'
import { Footer } from './footer'
import { Hero } from './hero'
import { Nav } from './nav'
import { NumiSection } from './numi-section'
import { PricingSection } from './pricing-section'
import { RhythmSection } from './rhythm-section'
import { iniciarSenales, utmDesde, type Cola } from './signals'
import { Ticker } from './ticker'
import { UseCasesSection } from './use-cases-section'
import { useSectionViewed } from './use-section-viewed'

/*
  La serif de los destacados del titular. Se importa AQUÍ y no en `index.css` porque esta
  ruta se carga con `lazy()`: así viaja en su propio trozo y no la descarga quien entra a
  la consola. Los titulares van en Sora y el cuerpo en Inter, que ya vienen de `index.css`.
*/
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'

/**
 * La portada pública.
 *
 * **Usa los tokens de `index.css`, sin pintar los suyos.** Hubo una temporada en que se
 * aplicaba una paleta propia como custom properties sobre su raíz, porque se estaban
 * comparando tres candidatas y la portada podía ir en crema mientras la consola seguía en
 * azul. Elegido el azul —el de la marca, §3.1— esa capa dejó de tener trabajo: la paleta de
 * la portada **es** la de la consola, y aplicarla otra vez era pintar encima lo mismo.
 *
 * Vive en la raíz de su propia entrada (`index.html`); la consola vive en `app.html` bajo
 * `/app` (§97.11).
 */
export function LandingPage() {
  const dark = useResolvedDark()
  const [cola, setCola] = useState<Cola | null>(null)

  /*
    Las señales arrancan al montar y se despiden al desmontar. El `page_view` va aquí y no
    dentro de la cola: la cola no sabe en qué página está, y meterle esa suposición la
    ataría a la portada.
  */
  useEffect(() => {
    const { cola, parar } = iniciarSenales({
      landingPath: window.location.pathname,
      referrer: document.referrer || null,
      utm: utmDesde(window.location.search),
    })
    cola.encolar({ name: 'page_view', path: window.location.pathname })
    setCola(cola)
    return parar
  }, [])

  const heroRef = useSectionViewed(cola, 'hero')

  return (
    <div className="min-h-dvh bg-background font-sans text-foreground">
      <Nav cola={cola} dark={dark} />
      <main>
        <section ref={heroRef}>
          <Hero />
        </section>
        <Ticker />
        <DisorderSection />
        <RhythmSection cola={cola} />
        <NumiSection cola={cola} />
        <AutomationSection cola={cola} />
        <UseCasesSection cola={cola} />
        <PricingSection cola={cola} />
        <FinalCta cola={cola} />
      </main>
      <Footer />
      <ConsentBanner />
    </div>
  )
}
