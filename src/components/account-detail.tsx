import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { Ban, MoreHorizontal, XCircle, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DetailDrawer,
  DetailRow,
  DetailRows,
  DetailSection,
} from '@/components/ui/detail-drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { useContact } from '@/features/contacts/hooks'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { getErrorMessage } from '@/lib/errors'
import { toastApiError } from '@/features/platform/errors'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { withReturn } from '@/lib/settlement'

/** Una cuenta cerrada ya no admite dinero ni se vuelve a cerrar. */
const CLOSED = new Set(['CANCELLED', 'WRITTEN_OFF'])

/** La cuenta, ya traducida desde su endpoint. */
export interface AccountDetailData {
  id: string
  contactId: string | null
  /** Concepto de cobro o categoría de gasto, ya resuelto a su nombre. */
  catalogName?: string
  status: string
  currency?: string | null
  originalAmount: string
  /** Solo los tienen las cuentas por cobrar; en pagar van sin firmar (§70). */
  adjustmentsTotal?: string | null
  interestTotal?: string | null
  paidTotal?: string | null
  balance: string
  dueDate: string
  issueDate: string
  notes?: string | null
  cancellationReason?: string | null
}

/** Lo que cambia entre cobrar y pagar: las palabras. */
export interface AccountDetailCopy {
  /** Título cuando no se pudo cargar: «Cuenta por cobrar» / «Cuenta por pagar». */
  entity: string
  notFound: string
  /** Título cuando no hay contraparte. */
  fallbackTitle: string
  /** Botón principal: «Registrar pago» / «Registrar egreso». */
  settleLabel: string
  /** Rótulo de la fecha de emisión: «Emitida» / «Emitido». */
  issueLabel: string
  /** Opción del menú y botón de su confirmación: «Cancelar cuenta». */
  cancelItem: string
  cancelTitle: string
  cancelDescription: string
  canceled: string
  writeOffTitle: string
  writeOffDescription: string
  writtenOff: string
}

/** Una operación de cierre contra el API, ya atada a su cuenta. */
export interface AccountCloseAction {
  isPending: boolean
  run: () => Promise<unknown>
}

/** Lo que devuelve el hook de carga de la cuenta. */
export interface AccountDetailQuery {
  data: AccountDetailData | undefined
  isPending: boolean
  isError: boolean
  error: unknown
}

/**
 * **La ficha de una cuenta**, de cobro o de pago.
 *
 * Las dos caras comparten el esqueleto —quién, por qué concepto, cuánto queda,
 * cuándo vence, cómo se salda y cómo se cierra— y por eso es **una** (§«nada por
 * duplicado»). Lo que **no** comparten viaja como slots: mora, causaciones y
 * ajustes solo existen en cobrar, porque a un proveedor no se le cobran
 * intereses. Eso es una diferencia de dominio, no deriva, y por eso se ve.
 *
 * Abre como cajón sobre su lista, que sigue montada detrás: es una ruta **hija**
 * de la lista y `listTo` es a donde vuelve al cerrarse, así que la URL se puede
 * compartir y recargar sin perder filtros ni scroll (§87.5).
 */
export function AccountDetail({
  listTo,
  copy,
  statusOf,
  settleTo,
  settleIcon: SettleIcon,
  canSettle,
  canManage,
  query,
  close,
  menuItems,
  afterBalance,
  afterDetail,
  dialogs,
}: {
  /** Ruta de la lista: a donde se vuelve al cerrar el cajón. */
  listTo: string
  copy: AccountDetailCopy
  statusOf: (status: string) => { tone: StatusTone; label: string }
  /** Formulario de saldar, con la contraparte ya puesta. */
  settleTo: (contactId: string | null, accountId: string) => string
  settleIcon: LucideIcon
  /**
   * Quién puede saldar y quién puede cerrar la cuenta. Vienen de fuera porque el
   * permiso **es distinto en cada cara** —`payments.create` no es
   * `disbursements.create`, `receivables.manage` no es `expenses.manage`— y
   * porque un componente compartido no decide autorización (§87.2).
   */
  canSettle: boolean
  canManage: boolean
  /** La cuenta ya cargada y traducida. */
  query: AccountDetailQuery
  /** Cancelar y castigar, ya atadas a esta cuenta. */
  close: { cancel: AccountCloseAction; writeOff: AccountCloseAction }
  /**
   * Opciones propias de una cara al principio del menú. `undefined` si no hay
   * ninguna que ofrecer: de eso depende que el menú aparezca y que lleve
   * separador.
   */
  menuItems?: ReactNode
  /** Secciones propias de una cara, en su sitio dentro de la ficha. */
  afterBalance?: ReactNode
  afterDetail?: ReactNode
  /** Diálogos propios de una cara. */
  dialogs?: ReactNode
}) {
  const { pathname } = useLocation()
  const { orgId } = useCurrentOrg()

  const { data, isPending, isError, error } = query
  const [cancelOpen, setCancelOpen] = useState(false)
  const [writeOffOpen, setWriteOffOpen] = useState(false)

  const { contact } = useContact(orgId, data?.contactId ?? undefined)

  if (isPending) return <DetailDrawer closeTo={listTo} loading />
  if (isError || !data) {
    return (
      <DetailDrawer
        closeTo={listTo}
        title={copy.entity}
        error={getErrorMessage(error, copy.notFound)}
      />
    )
  }

  const isClosed = CLOSED.has(data.status)
  const hasMenu = !isClosed && (canManage || menuItems != null)

  const runClose = async (action: AccountCloseAction, okMsg: string, hide: () => void) => {
    try {
      await action.run()
      toast.success(okMsg)
      hide()
    } catch (err) {
      toastApiError(err)
    }
  }

  return (
    <>
      <DetailDrawer
        closeTo={listTo}
        title={contact?.displayName ?? copy.fallbackTitle}
        meta={
          <span className="flex items-center gap-2">
            {data.catalogName ?? '—'}
            <span className="text-border">·</span>
            <StatusBadge {...statusOf(data.status)} />
          </span>
        }
        // La cifra que se viene a consultar es el saldo, no el valor original.
        amount={formatAmount(data.balance, data.currency ?? undefined)}
        actions={
          <>
            {canSettle && !isClosed && (
              <Button asChild size="sm">
                <Link to={withReturn(settleTo(data.contactId, data.id), pathname)}>
                  <SettleIcon aria-hidden className="size-4" />
                  {copy.settleLabel}
                </Link>
              </Button>
            )}
            {/*
              Saldar es lo que se viene a hacer; lo demás son operaciones de
              excepción. En fila no caben en el cajón y ponen «Castigar» a la
              misma altura visual que el botón por el que se entró.
            */}
            {hasMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal aria-hidden className="size-4" />
                    Más
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {menuItems}
                  {canManage && (
                    <>
                      {menuItems != null && <DropdownMenuSeparator />}
                      <DropdownMenuItem onClick={() => setCancelOpen(true)}>
                        <XCircle className="size-4" />
                        {copy.cancelItem}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setWriteOffOpen(true)}>
                        <Ban className="size-4" />
                        Castigar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      >
        <DetailSection title="Saldo">
          <DetailRows>
            <DetailRow label="Valor original">
              {formatAmount(data.originalAmount, data.currency ?? undefined)}
            </DetailRow>
            {data.adjustmentsTotal != null && Number(data.adjustmentsTotal) !== 0 && (
              <DetailRow label="Ajustes">
                {formatAmount(data.adjustmentsTotal, data.currency ?? undefined)}
              </DetailRow>
            )}
            {data.interestTotal != null && Number(data.interestTotal) !== 0 && (
              <DetailRow label="Interés de mora">
                {formatAmount(data.interestTotal, data.currency ?? undefined)}
              </DetailRow>
            )}
            {data.paidTotal != null && Number(data.paidTotal) !== 0 && (
              <DetailRow label="Pagado">
                − {formatAmount(data.paidTotal, data.currency ?? undefined)}
              </DetailRow>
            )}
            <DetailRow label="Saldo" strong>
              {formatAmount(data.balance, data.currency ?? undefined)}
            </DetailRow>
          </DetailRows>
        </DetailSection>

        {afterBalance}

        <DetailSection title="Detalle">
          <DetailRows>
            <DetailRow label="Vence">{formatDateHuman(data.dueDate)}</DetailRow>
            <DetailRow label={copy.issueLabel}>{formatDateHuman(data.issueDate)}</DetailRow>
            <DetailRow label="Notas">{data.notes}</DetailRow>
            <DetailRow label="Motivo cierre">{data.cancellationReason}</DetailRow>
          </DetailRows>
        </DetailSection>

        {afterDetail}
      </DetailDrawer>

      {dialogs}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={copy.cancelTitle}
        description={copy.cancelDescription}
        confirmLabel={copy.cancelItem}
        destructive
        loading={close.cancel.isPending}
        onConfirm={() => void runClose(close.cancel, copy.canceled, () => setCancelOpen(false))}
      />
      <ConfirmDialog
        open={writeOffOpen}
        onOpenChange={setWriteOffOpen}
        title={copy.writeOffTitle}
        description={copy.writeOffDescription}
        confirmLabel="Castigar"
        destructive
        loading={close.writeOff.isPending}
        onConfirm={() => void runClose(close.writeOff, copy.writtenOff, () => setWriteOffOpen(false))}
      />
    </>
  )
}
