import { useEffect, useState } from 'react'
import { BrandLockup } from '@/components/brand-mark'
import { cn } from '@/lib/utils'
import type { Cola } from './signals'
import { rutasApp } from './links'
import { ThemeButton } from './theme-button'

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
 *
 * **El interruptor de tema lee el mismo store que la consola**: quien tiene la app en
 * oscuro no espera que la portada le dé un fogonazo blanco, ni al revés. Es una preferencia
 * de la persona, no de la página. El mando sí es distinto —un botón y no el segmentado de
 * tres—, y el porqué está en `theme-button.tsx`.
 */

const ENLACES = [
  /* Al gráfico y no a «El desorden cuesta»: aquello es el problema, no el producto. */
  { href: '#demo', texto: 'Producto' },
  { href: '#numi', texto: 'Numi' },
  { href: '#para-quien', texto: 'Para quién' },
] as const

export function Nav({ cola, dark }: { cola?: Cola | null; dark: boolean }) {
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
          <BrandLockup textClassName="text-lg" markClassName="size-8" />
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

        <div className="ml-auto flex items-center gap-3 md:ml-0 sm:gap-4">
          <ThemeButton dark={dark} />
          <a
            href={rutasApp.ingreso}
            onClick={() => cola?.encolar({ name: 'cta_clicked', section: 'hero', action: 'login' })}
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Iniciar sesión
          </a>
          {/*
            El mismo relleno que el resto de llamadas a la acción. Estuvo en `bg-sidebar`
            —la tinta oscura— hasta que se vio el problema: el shell va oscuro en los DOS
            modos, así que sobre una página oscura el botón desaparecía. `--cta` cambia con
            el modo y es la única de las dos que se ve siempre.
          */}
          <a
            href={rutasApp.registro}
            onClick={() => cola?.encolar({ name: 'cta_clicked', section: 'hero', action: 'signup' })}
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-cta px-5 text-sm font-semibold text-cta-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Probar Nummo
          </a>
        </div>
      </nav>
    </header>
  )
}
