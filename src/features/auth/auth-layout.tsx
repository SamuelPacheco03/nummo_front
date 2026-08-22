import { type ReactNode } from 'react'
import { BrandLockup } from '@/components/brand-mark'
import { OrdenArt } from './auth-art'

/**
 * El marco de las pantallas de acceso: panel de marca a la izquierda, formulario a la
 * derecha.
 *
 * El panel **decora, no vende**. Hubo un intento que puso ahí el panel de la app que enseña
 * la portada, y quedaba bonito pero convertía el acceso en una portada pequeña: un login no
 * vende, deja entrar. Lo que va es un símbolo y tres líneas — el titular a dos tonos, que
 * es el gesto de la portada, sin traerse la portada entera.
 *
 * Antes de esto había medio pantalla de degradado azul con una frase genérica, y el
 * formulario flotando suelto sobre el fondo, sin superficie ni borde. Eso era lo plano.
 */

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1fr_1fr]">
      {/*
        El panel va sobre el shell, que es oscuro en los dos modos (§3.2): así el acceso se
        ve igual venga de donde venga, sin declarar dos versiones.
      */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
        {/* Un velo de marca en diagonal, para que el oscuro no sea un rectángulo plano. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full blur-3xl"
          style={{ background: 'var(--logo-indigo)', opacity: 0.16 }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full blur-3xl"
          style={{ background: 'var(--logo-teal)', opacity: 0.12 }}
        />

        <BrandLockup textClassName="text-lg text-sidebar-foreground" markClassName="size-9" />

        <div className="relative">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-sidebar-muted-foreground">
            Tu espacio financiero
          </p>
          {/* El titular a dos tonos, que es el gesto de la portada (§97.6). */}
          <p className="mt-4 font-display text-4xl font-semibold tracking-tight text-sidebar-foreground">
            Todo en <span className="text-sidebar-primary">orden.</span>
          </p>
          <p className="mt-3 max-w-xs text-sm text-sidebar-muted-foreground">
            Cobros, pagos y movimientos en un solo lugar.
          </p>

          <div className="mt-10">
            <OrdenArt className="h-56 w-64" />
          </div>
        </div>

        <p className="relative text-xs text-sidebar-muted-foreground">© 2026 Nummo</p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[24rem]">
          {/* En móvil no hay panel, así que la marca entra aquí. */}
          <div className="mb-8 lg:hidden">
            <BrandLockup textClassName="text-lg" markClassName="size-8" />
          </div>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
