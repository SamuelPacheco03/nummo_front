import { type ReactNode } from 'react'
import { BrandLockup } from '@/components/brand-mark'
import { AuthDecor } from './auth-decor'

/**
 * El marco de las pantallas de acceso: **una columna, centrada, y nada más**.
 *
 * Hubo dos intentos antes de este y los dos sobraban por el mismo lado. El primero era
 * media pantalla de degradado azul con una frase genérica: ocupaba el 52% del ancho para
 * decir menos que nada. El segundo puso ahí el panel de la app que enseña la portada —y
 * quedaba bonito, pero convertía el acceso en una portada pequeña—.
 *
 * **Un login no vende: deja entrar.** Quien llega aquí ya decidió; lo único que necesita es
 * encontrar dos campos y un botón sin buscarlos. Todo lo que compita con eso, sobra.
 *
 * Lo que sí hacía falta y no estaba: una **superficie**. El formulario flotaba suelto sobre
 * el fondo, sin tarjeta ni borde, que es literalmente lo que se ve plano.
 *
 * Y algo de decoración, que es distinto de una vitrina: `AuthDecor` dice «finanzas» con
 * trazos muy tenues —una curva que sube, unas barras, un par de monedas— detrás de la
 * tarjeta. Se ve, no compite, y no hay que leerlo.
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
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 py-12">
      <AuthDecor />

      <div className="relative w-full max-w-[26rem]">
        {/* La marca va fuera de la tarjeta: identifica la pantalla sin robarle sitio. */}
        <div className="flex justify-center">
          <BrandLockup textClassName="text-lg" markClassName="size-8" />
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-7 shadow-sm">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>

        {/*
          Una línea y se acaba. Dice qué es Nummo para quien llegó sin saberlo, y no intenta
          convencer a nadie: quien está aquí ya decidió.
        */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Cobros, pagos y cartera al día. Multiempresa y multisede.
        </p>
      </div>
    </div>
  )
}
