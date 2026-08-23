import { useState } from 'react'
import { Link } from 'react-router'
import { Archive, Lock, Pencil, Plus, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Note } from '@/components/ui/note'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentOrg } from '@/features/organizations/hooks'
import { toastApiError } from '@/features/platform/errors'
import { useCan } from '@/features/platform/permissions'
import { cn } from '@/lib/utils'
import type { PaymentInstruction } from '@/api/generated/model'
import {
  useArchivePaymentInstruction,
  useCreatePaymentInstruction,
  usePaymentInstructions,
  useUpdatePaymentInstruction,
} from './hooks'
import { MAX_IN_REMINDERS, instructionKind } from './payment-instruction-labels'
import { PaymentInstructionDialog } from './payment-instruction-dialog'

/**
 * **Dónde puede pagar quien debe.**
 *
 * El recordatorio de cobranza ya no dice solo cuánto se debe: dice dónde
 * pagarlo, y esto es de dónde saca ese renglón.
 *
 * Va **por organización** —no por acuerdo ni por concepto— porque una cuenta por
 * cobrar puede no tener acuerdo: las creadas a mano no lo tienen, y colgarlo de
 * ahí habría dejado sin datos de pago justo a esos cobros.
 *
 * **Permiso propio, `payment_instructions.manage`**, y no el de cuentas de
 * dinero: esto decide a qué cuenta le llega la plata de los cobros que salen, y
 * el deudor no tiene forma de notar un cambio.
 */
export function PaymentInstructionsPage() {
  const { orgId } = useCurrentOrg()
  const can = useCan()
  const canRead = can('payment_instructions.read')
  const canManage = can('payment_instructions.manage')

  const { instructions, isPending, isError, error } = usePaymentInstructions(
    canRead ? orgId : undefined,
  )
  const create = useCreatePaymentInstruction(orgId ?? '')
  const update = useUpdatePaymentInstruction(orgId ?? '')
  const archive = useArchivePaymentInstruction(orgId ?? '')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentInstruction | null>(null)
  const [archiving, setArchiving] = useState<PaymentInstruction | null>(null)

  if (!canRead) {
    return (
      <div className="space-y-4">
        <PageHeader title="Dónde te pagan" />
        <EmptyState
          Icon={Lock}
          title="No puedes ver esto"
          description="Tu rol no incluye las formas de pago de esta organización."
        />
      </div>
    )
  }

  const publicadas = instructions.filter((i) => i.showInReminders)
  const sobran = publicadas.length - MAX_IN_REMINDERS

  const abrir = (instruction: PaymentInstruction | null) => {
    setEditing(instruction)
    setFormOpen(true)
  }

  const onToggle = async (instruction: PaymentInstruction) => {
    if (!orgId) return
    try {
      await update.mutateAsync({
        orgId,
        id: instruction.id,
        data: { showInReminders: !instruction.showInReminders },
      })
    } catch (err) {
      toastApiError(err, 'No se pudo cambiar')
    }
  }

  const onArchive = async () => {
    if (!orgId || !archiving) return
    try {
      await archive.mutateAsync({ orgId, id: archiving.id })
      toast.success('Archivada', {
        description: 'Deja de salir en los recordatorios; los que ya salieron no cambian.',
      })
      setArchiving(null)
    } catch (err) {
      toastApiError(err, 'No se pudo archivar')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dónde te pagan"
        description="Las cuentas y los enlaces que salen dentro del recordatorio de cobranza."
      >
        {canManage && (
          <Button onClick={() => abrir(null)}>
            <Plus aria-hidden className="size-4" />
            <span className="hidden sm:inline">Añadir</span>
          </Button>
        )}
      </PageHeader>

      {isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState error={error} fallback="No se pudieron cargar las formas de pago." />
      ) : instructions.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            Icon={Wallet}
            title="Todavía no hay dónde pagar"
            description="Añade al menos una cuenta o billetera para que el recordatorio diga cómo pagarte."
            action={
              canManage ? <Button onClick={() => abrir(null)}>Añadir la primera</Button> : undefined
            }
          />
          {/* Es lo que está pasando ahora mismo, y sin decirlo nadie se entera. */}
          <Note tone="warning" title="Mientras esté vacío, el recordatorio dice «comunícate con nosotros»">
            No se queda en blanco —una variable vacía haría que Meta rechazara el envío entero—,
            pero el deudor no sabe a dónde pagarte.
          </Note>
        </div>
      ) : (
        <div className="space-y-4">
          <Panel title="Lo que ve quien te debe">
            <p className="text-muted-foreground mb-3 text-xs">
              Así de literal: es el renglón que sale en el mensaje.
            </p>
            <ul className="divide-y">
              {instructions.map((instruction) => (
                <InstructionRow
                  key={instruction.id}
                  instruction={instruction}
                  canManage={canManage}
                  busy={update.isPending}
                  onEdit={() => abrir(instruction)}
                  onToggle={() => void onToggle(instruction)}
                  onArchive={() => setArchiving(instruction)}
                />
              ))}
            </ul>
          </Panel>

          {/*
            En el recordatorio caben tres: con dos o tres el renglón se lee, con
            seis es un muro que nadie termina. El backend se queda con las
            primeras por orden y **no tiene dónde avisarlo**, así que lo decimos
            aquí.
          */}
          {sobran > 0 && (
            <Note tone="warning" title={`En el recordatorio solo caben ${MAX_IN_REMINDERS}`}>
              Tienes {publicadas.length} publicadas, así que {sobran === 1 ? 'la última' : `las ${sobran} últimas`}{' '}
              no van a salir. Quita de los recordatorios las que sobren para elegir cuáles.
            </Note>
          )}

          {publicadas.length === 0 && (
            <Note tone="warning" title="Ninguna sale en los recordatorios">
              Están todas guardadas pero ninguna publicada, así que el mensaje sigue diciendo
              «comunícate con nosotros».
            </Note>
          )}

          <p className="text-muted-foreground text-xs">
            Estas formas de pago salen en la{' '}
            <Link to="/config/cobranza" className="text-brand underline">
              cobranza automática
            </Link>
            .
          </p>
        </div>
      )}

      {formOpen && (
        <PaymentInstructionDialog
          open
          onOpenChange={setFormOpen}
          editing={editing}
          loading={create.isPending || update.isPending}
          onSubmit={async (data) => {
            if (!orgId) return
            try {
              if (editing) {
                await update.mutateAsync({ orgId, id: editing.id, data })
                toast.success('Forma de pago actualizada')
              } else {
                await create.mutateAsync({ orgId, data })
                toast.success('Forma de pago añadida')
              }
              setFormOpen(false)
            } catch (err) {
              toastApiError(err, 'No se pudo guardar')
            }
          }}
        />
      )}

      <ConfirmDialog
        open={archiving != null}
        onOpenChange={(open) => !open && setArchiving(null)}
        title="Archivar esta forma de pago"
        /* Archiva, no borra: un recordatorio que ya salió nombró esa cuenta, y
           quien lo mire mañana tiene que saber a dónde se le pidió pagar. */
        description="Deja de salir en los recordatorios y desaparece de esta lista. Los mensajes que ya salieron no cambian: siguen nombrándola."
        confirmLabel="Archivar"
        destructive
        loading={archive.isPending}
        onConfirm={() => void onArchive()}
      />
    </div>
  )
}

function InstructionRow({
  instruction,
  canManage,
  busy,
  onEdit,
  onToggle,
  onArchive,
}: {
  instruction: PaymentInstruction
  canManage: boolean
  busy: boolean
  onEdit: () => void
  onToggle: () => void
  onArchive: () => void
}) {
  const { label, Icon } = instructionKind(instruction.kind)

  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3">
      <div className="flex min-w-0 gap-3">
        <Icon aria-hidden className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 space-y-0.5">
          {/*
            **El `preview` viene calculado y no se rearma.** Es exactamente el
            renglón que verá el deudor; componerlo aquí haría que la vista previa
            y el mensaje real acabaran diciendo cosas distintas de la misma
            cuenta.
          */}
          <p className={cn('text-sm', !instruction.showInReminders && 'text-muted-foreground')}>
            {instruction.preview}
          </p>
          <p className="text-muted-foreground text-xs">
            {label}
            {instruction.label && ` · ${instruction.label}`}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {/* No escondido en un menú: es lo que decide si el deudor la ve. */}
        <label
          className={cn(
            'mr-2 flex items-center gap-2 text-xs',
            canManage ? 'cursor-pointer' : 'opacity-60',
          )}
        >
          <input
            type="checkbox"
            className="accent-primary size-4"
            checked={instruction.showInReminders}
            disabled={!canManage || busy}
            onChange={onToggle}
          />
          Sale en los recordatorios
        </label>

        {canManage && (
          <>
            <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Corregir ${label}`}>
              <Pencil aria-hidden className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onArchive} aria-label={`Archivar ${label}`}>
              <Archive aria-hidden className="size-4" />
            </Button>
          </>
        )}
      </div>
    </li>
  )
}
