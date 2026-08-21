import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Wordmark } from './brand'
import type { Cola } from './signals'

/**
 * La navegación flotante de la portada.
 *
 * **«Recursos» no está, y es a propósito.** Los mockups lo dibujan, pero el handoff decide
 * lo contrario y es la decisión posterior: no hay contenido todavía, y un enlace a una
 * página vacía cuesta más confianza de la que da tenerlo en la barra.
 *
 * El único gesto de esta sección: al bajar se vuelve translúcida con desenfoque. Arriba
 * del todo va limpia, sin borde ni fondo, para que el hero empiece en el borde de la
 * ventana y no debajo de una barra.
 */

const ENLACES = [
  { href: '#producto', texto: 'Producto' },
  { href: '#numi', texto: 'Numi' },
  { href: '#para-quien', texto: 'Para quién' },
] as const

export function Nav({ cola }: { cola?: Cola | null }) {
  const [bajado, setBajado] = useState(false)

  useEffect(() => {
    const alRodar = () => setBajado(window.scrollY > 8)
    alRodar()
    window.addEventListener('scroll', alRodar, { passive: true })
    return () => window.removeEventListener('scroll', alRodar)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-colors duration-200',
        bajado && 'border-b border-border bg-background/80 backdrop-blur',
      )}
    >
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <a href="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <Wordmark />
          <span className="sr-only">Nummo, inicio</span>
        </a>

        <ul className="ml-auto hidden items-center gap-8 md:flex">
          {ENLACES.map((e) => (
            <li key={e.href}>
              <a
                href={e.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {e.texto}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-4 md:ml-0">
          <a
            href="/login"
            onClick={() => cola?.encolar({ name: 'cta_clicked', section: 'hero', action: 'login' })}
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Iniciar sesión
          </a>
          {/*
            La acción de la barra va en la tinta oscura, no en el durazno: el durazno es
            del hero, y dos rellenos del mismo color compitiendo en la misma pantalla se
            anulan. Aquí la jerarquía la da el contraste, no el color.
          */}
          <a
            href="/register"
            onClick={() => cola?.encolar({ name: 'cta_clicked', section: 'hero', action: 'signup' })}
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-sidebar px-5 text-sm font-semibold text-sidebar-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Probar Nummo
          </a>
        </div>
      </nav>
    </header>
  )
}
