import { useEffect, useState } from 'react'
import { paletteById } from '@/lib/palette/palettes'
import { paletteStyle } from '@/lib/palette/tokens'
import { useResolvedDark } from '@/stores/use-resolved-dark'
import { Footer } from './footer'
import { Hero } from './hero'
import { Nav } from './nav'
import { NumiSection } from './numi-section'
import { PricingSection } from './pricing-section'
import { iniciarSenales, utmDesde, type Cola } from './signals'
import { useSectionViewed } from './use-section-viewed'

/*
  Las fuentes de la portada. Se importan AQUÍ y no en `index.css` porque esta ruta se carga
  con `lazy()`: así viajan en su propio trozo y no las descarga quien entra a la consola.
*/
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/archivo'

/**
 * La portada pública.
 *
 * **Lleva su propia paleta** (§97.1): §3.1 rige la consola, y la portada se pinta con la
 * candidata elegida en el laboratorio aplicada como custom properties sobre su raíz. Eso
 * es lo que permite que la portada sea crema y verde sin tocar una línea de la consola,
 * que sigue en azul hasta que alguien decida lo contrario.
 *
 * Vive en `/portada` y no en `/` porque `/` es hoy el panel de la consola. La Fase 3
 * separa las dos entradas —`index.html` para la portada, `app.html` para la app— y
 * entonces esto pasa a ser la raíz.
 */

/** La candidata con la que se pinta la portada. Cambiarla es cambiar esta línea. */
const PALETA = 'bosque'

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
    /*
      Los tokens de la candidata van EN LÍNEA sobre esta raíz, igual que en el laboratorio,
      y `.dark` acompaña para que las pocas utilidades `dark:` de las primitivas se activen
      donde toca. Que el derivador emita el juego completo lo vigila `tokens.test.ts`: uno
      que falte cae al valor de la consola y la portada quedaría a dos paletas.
    */
    <div
      className={dark ? 'dark' : undefined}
      style={paletteStyle(paletteById(PALETA), dark ? 'dark' : 'light')}
    >
      <div className="min-h-dvh bg-background font-sans text-foreground">
        <Nav cola={cola} />
        <main>
          <section ref={heroRef}>
            <Hero />
          </section>
          <NumiSection cola={cola} />
          <PricingSection cola={cola} />
        </main>
        <Footer />
      </div>
    </div>
  )
}
