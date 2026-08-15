import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/errors'
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

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
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
    defaultValues: { email: '', password: '' },
  })

  if (isAuthenticated) return <Navigate to="/" replace />

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync({ data: values })
      const from = (location.state as { from?: string } | null)?.from
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
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca (desktop) */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-primary-foreground font-display text-base font-bold text-primary">
            N
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
              <span className="grid size-8 place-items-center rounded-md bg-primary font-display text-base font-bold text-primary-foreground">
                N
              </span>
              <span className="font-display text-lg font-semibold">Nummo</span>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
            <p className="text-sm text-muted-foreground">Entra con tu cuenta para continuar.</p>
          </div>

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
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {getErrorMessage(login.error, 'Credenciales inválidas')}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Entrar
            </Button>
          </form>

          <button
            type="button"
            onClick={fillDemo}
            className="block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Usar credenciales demo (demo@nummo.app)
          </button>
        </div>
      </div>
    </div>
  )
}
