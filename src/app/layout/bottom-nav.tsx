import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Coins, LayoutDashboard, Menu, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { NumiAppMark } from '@/features/assistant/numi-avatar'
import { useNumiStore } from '@/features/assistant/numi-store'
import { allowedQuickActions } from '@/features/actions/quick-actions'
import { PORTFOLIO_SECTIONS } from '@/features/navigation/sections'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { cn } from '@/lib/utils'
import { SidebarBody } from './sidebar'

const itemClass =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.68rem] transition-colors focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none'

/**
 * Destino de la barra inferior.
 *
 * Calcula él mismo si está activo en vez de dejárselo a `NavLink` porque un
 * destino puede cubrir más de una ruta: «Cartera» apunta a lo que te deben, pero
 * lo que debes es la misma sección mirada desde el otro lado, y apagarse al
 * saltar de una a la otra hace creer que te has salido de la sección.
 */
function BottomLink({
  to,
  label,
  Icon,
  end,
  also = [],
}: {
  to: string
  label: string
  Icon: LucideIcon
  /** Solo la ruta exacta cuenta como activa (para «/»). */
  end?: boolean
  /** Otras rutas que este destino también representa. */
  also?: string[]
}) {
  const { pathname } = useLocation()
  const isActive = end
    ? pathname === to
    : [to, ...also].some((route) => pathname === route || pathname.startsWith(`${route}/`))

  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        itemClass,
        isActive ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon aria-hidden className="size-5" />
      {label}
    </Link>
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
  const actions = allowedQuickActions(role)

  const go = (to: string) => {
    onOpenChange(false)
    navigate(to)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-1 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <SheetTitle className="px-3 pt-1 pb-2 text-base">Registrar</SheetTitle>
        <div className="scrollbar-slim overflow-y-auto">
          {actions.map((action) => (
            <button
              key={action.to}
              type="button"
              onClick={() => go(action.to)}
              className="hover:bg-secondary focus-visible:ring-ring/50 flex min-h-14 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
            >
              <action.Icon aria-hidden className="text-brand size-5 shrink-0" />
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
  const canCreate = allowedQuickActions(role).length > 0

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
        <BottomLink
          to="/cartera/cxc"
          label="Cartera"
          Icon={Coins}
          also={PORTFOLIO_SECTIONS.map((section) => section.to)}
        />

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
