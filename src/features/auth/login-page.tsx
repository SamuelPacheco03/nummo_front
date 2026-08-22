import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InlineError } from '@/components/ui/error-state'
import { getErrorMessage } from '@/lib/errors'
import { toastApiError } from '@/features/platform/errors'
import { AuthLayout } from './auth-layout'
import { useAuth, useLogin } from './hooks'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Ingresa tu email')
    .refine((v) => EMAIL_RE.test(v), 'Email inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type LoginValues = z.infer<typeof loginSchema>

/**
 * El botón de "credenciales demo" solo aparece si VITE_DEMO_LOGIN==='true'
 * (se activa en dev vía .env.development). En producción no se define → oculto,
 * y el build elimina el botón por dead-code.
 */
const DEMO_LOGIN = import.meta.env.VITE_DEMO_LOGIN === 'true'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: string; email?: string } | null
  const { isAuthenticated } = useAuth()
  const login = useLogin()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: state?.email ?? '', password: '' },
  })

  /*
    Mientras `/auth/me` está en vuelo no se sabe si hay sesión, y `isAuthenticated`
    todavía es `false`. Pintar el formulario mientras tanto hacía que quien ya
    tenía sesión viera el login un instante antes de que la respuesta lo mandara
    al panel: un parpadeo que hace dudar de si la sesión se cayó.

    El mismo loader que usa `ProtectedRoute`, para que las dos caras de la puerta
    esperen igual.
  */
  /*
    **No se espera a saber si hay sesión para pintar el formulario.**

    Antes esta pantalla se quedaba en «Verificando sesión…» hasta que `/auth/me` contestaba,
    y eso castiga al caso normal —quien llega aquí no tiene sesión— para cubrir el raro.
    Encima el parpadeo se repetía al saltar de login a registro.

    La comprobación sigue: es lo que impide que alguien con sesión se quede en esta pantalla.
    Lo que cambia es que ya no bloquea. Quien tenga sesión ve el formulario un instante antes
    de que lo redirijan, que es un precio mucho menor que un cargador para todos los demás.
  */
  if (isAuthenticated) return <Navigate to="/" replace />

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync({ data: values })
      const from = state?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } catch (err) {
      toastApiError(err, 'No se pudo iniciar sesión')
    }
  })

  const fillDemo = () => {
    setValue('email', 'demo@nummo.app')
    setValue('password', 'Demo1234!')
  }

  const busy = isSubmitting || login.isPending

  return (
    <AuthLayout title="Iniciar sesión" subtitle="Entra con tu cuenta para continuar.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <div className="relative">
            {/* El icono es decorativo: la etiqueta ya dice qué va aquí. */}
            <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-muted-foreground">
              <Mail aria-hidden className="size-4" />
            </span>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@empresa.com"
              className="pl-10"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
          </div>
        </Field>

        <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 grid w-10 place-items-center text-muted-foreground">
              <Lock aria-hidden className="size-4" />
            </span>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              className="pl-10 pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        {login.isError && (
          <InlineError>{getErrorMessage(login.error, 'Credenciales inválidas')}</InlineError>
        )}

        <Button type="submit" className="w-full bg-cta text-cta-foreground hover:bg-cta hover:opacity-90" disabled={busy}>
          {busy && <Loader size="sm" />}
          Entrar
        </Button>
      </form>

      {/*
        La demo **es una acción**, no una nota al pie: rellena el formulario. Como texto
        subrayado y en gris se leía como letra pequeña legal, que es justo lo contrario de
        lo que hace. Va separada por una línea porque tampoco es parte del formulario.
      */}
      {DEMO_LOGIN && (
        <div className="mt-6 border-t border-border pt-6">
          <button
            type="button"
            onClick={fillDemo}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Sparkles aria-hidden className="size-4 text-brand" />
            Probar con la cuenta demo
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="font-medium text-brand hover:underline">
          Regístrate
        </Link>
      </p>
    </AuthLayout>
  )
}
