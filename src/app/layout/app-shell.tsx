import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { PageLoader } from '@/components/ui/loader'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { NumiWidget } from '@/features/assistant/numi-widget'
import { UserMenu } from '@/features/auth/user-menu'
import { useLogout } from '@/features/auth/hooks'
import { OrgSwitcher } from '@/features/organizations/org-switcher'
import { CreateOrgDialog } from '@/features/organizations/create-org-dialog'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { getErrorMessage } from '@/lib/errors'
import { toast } from 'sonner'
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

  if (isLoading) return <PageLoader />
  if (hasNoOrgs) return <NoOrgOnboarding />

  return (
    <div className="bg-background flex min-h-dvh">
      <aside className="bg-sidebar sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r lg:flex">
        <SidebarBody />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/*
          En móvil la cabecera ya no navega: de eso se encarga la barra inferior.
          Se queda con lo que identifica el contexto —marca, organización activa
          y usuario—, que es justo lo que §49 pide tener siempre a la vista.
        */}
        <header className="bg-background/90 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur lg:hidden">
          <Brand />
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <div className="w-36 min-w-0">
              <OrgSwitcher />
            </div>
            <UserMenu />
          </div>
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

      {/* Numi: botón flotante en escritorio; en móvil su sitio es la barra. */}
      <NumiWidget />
    </div>
  )
}
