import { type ReactNode } from 'react'
import { BrandMark } from '@/components/brand-mark'

/**
 * Shell de las pantallas de autenticación: panel de marca (desktop) + columna de
 * formulario centrada. Reutilizado por login y registro para no duplicar el marco.
 * `children` es el contenido del formulario (campos, acciones y enlaces).
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
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca (desktop) */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          {/* Sobre el navy del panel, el isotipo va en una pastilla clara. */}
          <span className="grid size-9 place-items-center rounded-md bg-primary-foreground/95 p-1">
            <BrandMark className="size-full" />
          </span>
          <span className="font-display text-lg font-semibold">Nummo</span>
        </div>
        <div className="max-w-md space-y-3">
          <p className="font-display text-2xl font-semibold leading-snug">
            Administración financiera y cartera, en un solo lugar.
          </p>
          <p className="text-sm text-primary-foreground/70">
            Multiempresa y multisede. Contactos, cobros, gastos y cuentas con control por roles.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/50">© Nummo</p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 lg:hidden">
              <BrandMark className="size-9" />
              <span className="font-display text-lg font-semibold">Nummo</span>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
