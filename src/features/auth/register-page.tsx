import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
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
import { useAuth, useRegister } from './hooks'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Ingresa tu nombre').max(180),
  email: z
    .string()
    .trim()
    .min(1, 'Ingresa tu email')
    .refine((v) => EMAIL_RE.test(v), 'Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(200),
})

type RegisterValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: checkingSession } = useAuth()
  const signup = useRegister()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
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
      await signup.mutateAsync({ data: values })
      // El registro no inicia sesión (spec): llevamos al login con el email precargado.
      toast.success('Cuenta creada. Inicia sesión para continuar.')
      navigate('/login', { replace: true, state: { email: values.email } })
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo crear la cuenta'))
    }
  })

  const busy = isSubmitting || signup.isPending

  return (
    <AuthLayout title="Crear cuenta" subtitle="Regístrate para empezar a usar Nummo.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Nombre completo" htmlFor="fullName" error={errors.fullName?.message}>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Tu nombre"
            aria-invalid={!!errors.fullName}
            {...register('fullName')}
          />
        </Field>

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

        <Field label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres" error={errors.password?.message}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
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

        {signup.isError && (
          <InlineError>{getErrorMessage(signup.error, 'No se pudo crear la cuenta')}</InlineError>
        )}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader size="sm" />}
          Crear cuenta
        </Button>
      </form>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Inicia sesión
          </Link>
        </p>
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Tras registrarte, pídele a un administrador que te agregue a su organización con tu email. Hasta
          entonces no verás datos.
        </p>
      </div>
    </AuthLayout>
  )
}
