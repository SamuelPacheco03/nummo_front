import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import {
  ArrowLeftRight,
  Banknote,
  Coins,
  FileText,
  HandCoins,
  LayoutDashboard,
  Menu,
  Plus,
  UserPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { NumiAppMark } from '@/features/assistant/numi-avatar'
import { useNumiStore } from '@/features/assistant/numi-store'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { canEditContacts, canManageAgreements, type AnyRole } from '@/features/organizations/roles'
import { cn } from '@/lib/utils'
import { SidebarBody } from './sidebar'

type QuickAction = {
  to: string
  label: string
  description: string
  Icon: LucideIcon
  allowed: (role: AnyRole | undefined) => boolean
}

/**
 * Lo que el usuario viene a hacer desde el teléfono (§15). No es un índice de la
 * aplicación: son las seis operaciones que se registran de pie, delante de
 * alguien, y que no deberían costar tres toques.
 *
 * Dos abren un diálogo que vive dentro de una lista, así que se piden por URL
 * (`?nueva=1`, `?transferir=1`) y la página los abre al llegar.
 */
const QUICK_ACTIONS: QuickAction[] = [
  {
    to: '/cartera/pagos/nuevo',
    label: 'Registrar pago',
    description: 'Alguien te pagó',
    Icon: Banknote,
    allowed: canEditContacts,
  },
  {
    to: '/gastos/egresos/nuevo',
    label: 'Registrar egreso',
    description: 'Pagaste algo',
    Icon: HandCoins,
    allowed: canEditContacts,
  },
  {
    to: '/cartera/cxc?nueva=1',
    label: 'Nueva cuenta por cobrar',
    description: 'Registrar algo que te deben',
    Icon: Coins,
    allowed: canEditContacts,
  },
  {
    to: '/contactos/nuevo',
    label: 'Nuevo contacto',
    description: 'Un pagador o un proveedor',
    Icon: UserPlus,
    allowed: canEditContacts,
  },
  {
    to: '/cartera/acuerdos/nuevo',
    label: 'Nuevo acuerdo',
    description: 'Un cobro que se repite cada mes',
    Icon: FileText,
    allowed: canManageAgreements,
  },
  {
    to: '/caja/cuentas?transferir=1',
    label: 'Transferencia',
    description: 'Mover dinero entre tus cuentas',
    Icon: ArrowLeftRight,
    allowed: canEditContacts,
  },
]

const itemClass =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.68rem] transition-colors focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none'

function BottomLink({
  to,
  label,
  Icon,
  end,
}: {
  to: string
  label: string
  Icon: LucideIcon
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(itemClass, isActive ? 'text-brand' : 'text-muted-foreground hover:text-foreground')
      }
    >
      <Icon aria-hidden className="size-5" />
      {label}
    </NavLink>
  )
}

/** Botón de la barra que no navega: abre una capa (Nuevo, Numi, Más). */
function BottomButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(itemClass, 'text-muted-foreground hover:text-foreground', className)}
    >
      {children}
      {label}
    </button>
  )
}

function QuickActionsSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { role } = useCurrentOrg()
  // §47: no ofrecer lo que el usuario no puede hacer. Si su rol no permite nada,
  // el botón "Nuevo" ni siquiera se dibuja (ver BottomNav).
  const actions = QUICK_ACTIONS.filter((a) => a.allowed(role))

  const go = (to: string) => {
    onOpenChange(false)
    navigate(to)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-1 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <SheetTitle className="px-1 pb-2 text-base">Registrar</SheetTitle>
        <div className="overflow-y-auto">
          {actions.map((action) => (
            <button
              key={action.to}
              type="button"
              onClick={() => go(action.to)}
              className="hover:bg-secondary focus-visible:ring-ring/50 flex min-h-14 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
            >
              <span className="bg-secondary text-brand grid size-10 shrink-0 place-items-center rounded-lg">
                <action.Icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{action.label}</span>
                <span className="text-muted-foreground block text-xs">{action.description}</span>
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Navegación de móvil y tablet (§15). Sustituye al menú de hamburguesa como
 * navegación principal: las dos secciones que más se consultan quedan a un
 * toque, el resto vive en "Más" —que sigue siendo el sidebar completo, no una
 * segunda navegación que aprender—.
 *
 * "Nuevo" ocupa el centro porque registrar es a lo que se entra desde el
 * teléfono; consultar se hace igual de bien desde el escritorio.
 *
 * Numi entra como destino de la barra en vez de flotar sobre ella: con la barra
 * puesta, el botón flotante se solapaba con la esquina inferior derecha.
 */
export function BottomNav() {
  const [quickOpen, setQuickOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const openNumi = useNumiStore((s) => s.open)
  const { role } = useCurrentOrg()
  const location = useLocation()
  const canCreate = QUICK_ACTIONS.some((a) => a.allowed(role))

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className={cn(
          'bg-background/95 fixed inset-x-0 bottom-0 z-40 flex border-t backdrop-blur lg:hidden',
          // Franja de gestos de iOS: sin esto la fila queda debajo del indicador.
          'pb-[env(safe-area-inset-bottom)]',
        )}
      >
        <BottomLink to="/" label="Inicio" Icon={LayoutDashboard} end />
        <BottomLink to="/cartera/cxc" label="Cartera" Icon={Coins} />

        {canCreate && (
          <BottomButton label="Nuevo" onClick={() => setQuickOpen(true)}>
            <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-full">
              <Plus aria-hidden className="size-5" />
            </span>
          </BottomButton>
        )}

        <BottomButton label="Numi" onClick={openNumi}>
          <NumiAppMark className="size-5 rounded-[28%]" />
        </BottomButton>

        <BottomButton label="Más" onClick={() => setMoreOpen(true)}>
          <Menu aria-hidden className="size-5" />
        </BottomButton>
      </nav>

      <QuickActionsSheet open={quickOpen} onOpenChange={setQuickOpen} />

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="left" className="p-0">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <SidebarBody onNavigate={() => setMoreOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Navegar cierra cualquier capa abierta. */}
      <CloseOnNavigate pathname={location.pathname} onClose={() => setMoreOpen(false)} />
    </>
  )
}

/** Cierra la hoja de "Más" al cambiar de ruta, sin re-renderizar toda la barra. */
function CloseOnNavigate({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const [seen, setSeen] = useState(pathname)
  if (seen !== pathname) {
    setSeen(pathname)
    onClose()
  }
  return null
}
