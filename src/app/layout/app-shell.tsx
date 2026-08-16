import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  Activity,
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Bot,
  Building2,
  Coins,
  CreditCard,
  FileText,
  HelpCircle,
  Landmark,
  LayoutDashboard,
  MapPin,
  Menu,
  MonitorSmartphone,
  Palette,
  Percent,
  PieChart,
  ReceiptText,
  Tags,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageLoader } from '@/components/ui/loader'
import { BrandLockup, BrandMark } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { NumiWidget } from '@/features/assistant/numi-widget'
import { UserMenu } from '@/features/auth/user-menu'
import { useLogout } from '@/features/auth/hooks'
import { OrgSwitcher } from '@/features/organizations/org-switcher'
import { CreateOrgDialog } from '@/features/organizations/create-org-dialog'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { getErrorMessage } from '@/lib/errors'
import { InstallAppButton } from '@/pwa/install-app-button'
import { OfflineIndicator } from '@/pwa/offline-indicator'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type NavItem = { to: string; label: string; Icon: LucideIcon; end?: boolean }
type NavSection = { title?: string; items: NavItem[] }

const SECTIONS: NavSection[] = [
  {
    items: [
      { to: '/', label: 'Panel', Icon: LayoutDashboard, end: true },
      { to: '/contactos', label: 'Contactos', Icon: Users },
    ],
  },
  {
    title: 'Cartera',
    items: [
      { to: '/cartera/cxc', label: 'Cuentas por cobrar', Icon: Coins },
      { to: '/cartera/pagos', label: 'Pagos', Icon: Banknote },
      { to: '/cartera/acuerdos', label: 'Acuerdos', Icon: FileText },
      { to: '/cartera/interes', label: 'Políticas de interés', Icon: Percent },
    ],
  },
  {
    title: 'Gastos',
    items: [
      { to: '/gastos/cxp', label: 'Cuentas por pagar', Icon: Coins },
      { to: '/gastos/egresos', label: 'Egresos', Icon: Banknote },
      { to: '/gastos/recurrentes', label: 'Recurrentes', Icon: FileText },
    ],
  },
  {
    title: 'Caja',
    items: [
      { to: '/caja/cuentas', label: 'Cuentas', Icon: Landmark },
      { to: '/caja/movimientos', label: 'Movimientos', Icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Informes',
    items: [
      { to: '/informes/resultados', label: 'Resultados', Icon: BarChart3 },
      { to: '/informes/cartera', label: 'Cobros y pagos', Icon: PieChart },
    ],
  },
  {
    title: 'Maestros',
    items: [
      { to: '/maestros/conceptos', label: 'Conceptos de cobro', Icon: ReceiptText },
      { to: '/maestros/categorias', label: 'Categorías de gasto', Icon: Tags },
      { to: '/maestros/metodos', label: 'Métodos de pago', Icon: CreditCard },
      { to: '/maestros/cuentas', label: 'Cuentas', Icon: Wallet },
    ],
  },
  {
    title: 'Organización',
    items: [
      { to: '/config/empresa', label: 'Empresa', Icon: Building2 },
      { to: '/config/sedes', label: 'Sedes', Icon: MapPin },
      { to: '/config/miembros', label: 'Miembros', Icon: UserCog },
      { to: '/config/apariencia', label: 'Apariencia', Icon: Palette },
      { to: '/config/asistente', label: 'Asistente', Icon: Bot },
      { to: '/config/sesiones', label: 'Sesiones', Icon: MonitorSmartphone },
    ],
  },
]

function Brand() {
  return (
    <Link to="/" className="flex items-center" aria-label="Nummo — ir al panel">
      <BrandLockup />
    </Link>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-5 px-3 py-4">
      {SECTIONS.map((section, i) => (
        <div key={section.title ?? i} className="flex flex-col gap-0.5">
          {section.title && (
            <div className="px-2 pb-1 text-[0.68rem] font-medium tracking-wider text-muted-foreground uppercase">
              {section.title}
            </div>
          )}
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                  isActive && 'bg-secondary font-medium text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.Icon className={cn('size-4 shrink-0', isActive && 'text-brand')} />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-14 items-center border-b px-4">
        <Brand />
      </div>
      <div className="border-b p-3">
        <OrgSwitcher />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="space-y-3 border-t p-3">
        <NavLink
          to="/ayuda"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-2 text-xs text-muted-foreground hover:text-foreground',
              isActive && 'text-foreground',
            )
          }
        >
          <HelpCircle className="size-3.5" />
          Ayuda
        </NavLink>
        <NavLink
          to="/estado"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-2 text-xs text-muted-foreground hover:text-foreground',
              isActive && 'text-foreground',
            )
          }
        >
          <Activity className="size-3.5" />
          Estado del sistema
        </NavLink>
        <InstallAppButton />
        <OfflineIndicator />
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </>
  )
}

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
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-md space-y-5 text-center">
        <BrandMark className="mx-auto size-12" />
        <div className="space-y-1">
          <h1 className="font-display text-xl font-semibold">Crea tu organización</h1>
          <p className="text-sm text-muted-foreground">
            Aún no perteneces a ninguna organización. Crea una para empezar a trabajar.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Button onClick={() => setOpen(true)}>Crear organización</Button>
          <button
            type="button"
            onClick={onLogout}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  if (isLoading) return <PageLoader />
  if (hasNoOrgs) return <NoOrgOnboarding />

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <SidebarBody />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetTitle className="sr-only">Navegación</SheetTitle>
              <SidebarBody onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <Brand />
          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Asistente Numi: flotante, disponible en cualquier pantalla del shell. */}
      <NumiWidget />
    </div>
  )
}
