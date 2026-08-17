import { useCallback, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { Search } from 'lucide-react'
import { PageLoader } from '@/components/ui/loader'
import { BrandMark } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { NumiWidget } from '@/features/assistant/numi-widget'
import { UserMenu } from '@/features/auth/user-menu'
import { useLogout } from '@/features/auth/hooks'
import { CreateOrgDialog } from '@/features/organizations/create-org-dialog'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { getErrorMessage } from '@/lib/errors'
import { toast } from 'sonner'
import { CommandBar } from '@/features/search/command-bar'
import { useCommandBarShortcut } from '@/features/search/use-command-bar-shortcut'
import { PageScrollRestoration } from '@/app/page-scroll'
import { BottomNav } from './bottom-nav'
import { Brand, SidebarBody } from './sidebar'

function NoOrgOnboarding() {
  const navigate = useNavigate()
  const logout = useLogout()
  const [open, setOpen] = useState(false)

  const onLogout = async () => {
    try {
      await logout.mutateAsync()
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="bg-background grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-md space-y-5 text-center">
        <BrandMark className="mx-auto size-12" />
        <div className="space-y-1">
          <h1 className="font-display text-xl font-semibold">Crea tu organización</h1>
          <p className="text-muted-foreground text-sm">
            Aún no perteneces a ninguna organización. Crea una para empezar a trabajar.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Button onClick={() => setOpen(true)}>Crear organización</Button>
          <button
            type="button"
            onClick={onLogout}
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
          >
            Cerrar sesión
          </button>
        </div>
        <CreateOrgDialog open={open} onOpenChange={setOpen} />
      </div>
    </div>
  )
}

export function AppShell() {
  const { isLoading, hasNoOrgs } = useCurrentOrg()
  const [commandOpen, setCommandOpen] = useState(false)
  const openCommand = useCallback(() => setCommandOpen(true), [])
  useCommandBarShortcut(openCommand)

  if (isLoading) return <PageLoader />
  if (hasNoOrgs) return <NoOrgOnboarding />

  return (
    <div className="bg-background flex min-h-dvh">
      {/* Cada pantalla empieza por arriba; volver atrás devuelve a su sitio. */}
      <PageScrollRestoration />

      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r lg:flex">
        <SidebarBody />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/*
          Escritorio: hasta la fase 6 no había cabecera. La barra de comandos es
          el punto de entrada universal de §36 —buscar, ir, registrar o preguntar
          desde el mismo sitio—, y necesita estar siempre a la vista.
        */}
        <header className="bg-background/85 sticky top-0 z-30 hidden h-16 items-center gap-3 border-b px-8 backdrop-blur lg:flex">
          <button
            type="button"
            onClick={openCommand}
            className="text-muted-foreground hover:border-brand/40 hover:text-foreground focus-visible:ring-ring/50 bg-card flex h-10 w-full max-w-lg items-center gap-2.5 rounded-lg border px-3.5 text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <Search aria-hidden className="size-4 shrink-0" />
            <span className="flex-1 text-left">Buscar o preguntarle algo a Numi…</span>
            <kbd className="bg-secondary text-muted-foreground rounded border px-1.5 py-0.5 font-sans text-[0.68rem]">
              ⌘K
            </kbd>
          </button>
          {/* Preferencia y cuenta: a la derecha, fuera del camino de la búsqueda
              pero siempre a mano. El menú de perfil incluye cerrar sesión. */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        {/*
          En móvil la cabecera ya no navega: de eso se encarga la barra inferior.
          Se queda con lo que identifica el contexto —marca, organización activa
          y usuario—, que es justo lo que §49 pide tener siempre a la vista.
        */}
        <header className="bg-background/90 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur lg:hidden">
          <Brand />
          <button
            type="button"
            onClick={openCommand}
            aria-label="Buscar o preguntarle algo a Numi"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 ml-auto grid size-9 shrink-0 place-items-center rounded-md focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <Search aria-hidden className="size-5" />
          </button>
          <UserMenu />
        </header>

        {/*
          El padding inferior reserva la altura de la barra de navegación más la
          franja de gestos de iOS: sin él, la última fila de cada lista queda
          debajo de la barra y no se puede tocar.
        */}
        <main className="flex-1 px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:px-8 lg:py-8 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />

      <CommandBar open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Numi: botón flotante en escritorio; en móvil su sitio es la barra. */}
      <NumiWidget />
    </div>
  )
}
