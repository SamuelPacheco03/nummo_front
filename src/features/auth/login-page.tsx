import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InlineError } from '@/components/ui/error-state'
import { getErrorMessage } from '@/lib/errors'
import { AuthLayout } from './auth-layout'
import { PageLoader } from '@/components/ui/loader'
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
  const { isAuthenticated, isLoading: checkingSession } = useAuth()
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
  if (checkingSession) return <PageLoader label="Verificando sesión…" />
  if (isAuthenticated) return <Navigate to="/" replace />

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync({ data: values })
      const from = state?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo iniciar sesión'))
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
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@empresa.com"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
        </Field>

        <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              className="pr-10"
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

        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader size="sm" />}
          Entrar
        </Button>
      </form>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Regístrate
          </Link>
        </p>
        {DEMO_LOGIN && (
          <button
            type="button"
            onClick={fillDemo}
            className="block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Usar credenciales demo (demo@nummo.app)
          </button>
        )}
      </div>
    </AuthLayout>
  )
}
