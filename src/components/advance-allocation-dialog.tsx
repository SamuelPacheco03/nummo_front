import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MoneyInput } from '@/components/ui/money-input'
import { getErrorMessage } from '@/lib/errors'
import { useIdempotencyKey } from '@/lib/idempotency'
import { formatAmount, formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Los estados en los que una cuenta todavía admite dinero encima. */
const OPEN = new Set(['PENDING', 'PARTIAL', 'OVERDUE'])

/** Una cuenta de la contraparte, ya traducida desde su endpoint. */
export interface AdvanceTarget {
  id: string
  dueDate: string
  balance: string
  currency?: string | null
  displayStatus: string
}

/** Un renglón del reparto. El adaptador le pone al `id` el nombre del API. */
export interface AdvanceAllocation {
  targetId: string
  /** Decimal con dos cifras, como lo espera el contrato (§88). */
  amount: string
}

/** Lo que cambia entre cobrar y pagar: las palabras. */
export interface AdvanceCopy {
  /** «Este pagador no tiene cuentas abiertas.» */
  empty: string
  /** «Asigna al menos una cuenta» / «… un gasto». */
  nothingAssigned: string
  /** Nombre accesible del campo de cada fila: «Asignar a la cuenta». */
  amountLabel: string
}

/** El endpoint de reparto, ya atado a su pago o egreso por el adaptador. */
export interface AdvanceApply {
  isPending: boolean
  apply: (allocations: AdvanceAllocation[]) => Promise<unknown>
}

/**
 * **Repartir un anticipo** entre las cuentas abiertas de la contraparte.
 *
 * Es el mismo diálogo para las dos caras —el anticipo de un pago se reparte
 * entre cuentas por cobrar, el de un egreso entre gastos— y por eso es **uno**:
 * eran dos archivos calcados que solo se diferenciaban en dos frases y el nombre
 * del campo que viaja al API, con el riesgo de siempre (§«nada por duplicado»:
 * se corrige la aritmética de un lado y el otro se queda con la vieja).
 *
 * Lo suyo es el reparto: filtra lo que sigue abierto, reparte automático por
 * orden de vencimiento, suma lo asignado y no deja pasar más crédito del que
 * hay. Lo que cambia de verdad viaja en `copy` y en los dos hooks que le pasa
 * cada cara (§94.0).
 *
 * Manda con **clave de idempotencia** y la renueva al aplicar: reintentar tras
 * un fallo de red no reparte dos veces, pero repartir otra vez a propósito sí
 * es otra operación (§88.4b).
 */
export function AdvanceAllocationDialog({
  open,
  onOpenChange,
  available,
  copy,
  useTargets,
  useApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Crédito sin aplicar, como string decimal. */
  available: string
  copy: AdvanceCopy
  /** Las cuentas de la contraparte. Es un hook: se llama en el render. */
  useTargets: () => AdvanceTarget[]
  /** El reparto contra el API. También es un hook. */
  useApply: (idempotencyKey: string) => AdvanceApply
}) {
  const idem = useIdempotencyKey()
  const { apply, isPending } = useApply(idem.key)
  const [alloc, setAlloc] = useState<Record<string, string>>({})
  const availableNum = Number(available) || 0

  const targets = useTargets()
  const openTargets = useMemo(
    () => targets.filter((t) => OPEN.has(t.displayStatus) && Number(t.balance) > 0),
    [targets],
  )
  const assigned = useMemo(
    () => Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0),
    [alloc],
  )
  const excess = assigned > availableNum + 0.001

  const autoAllocate = () => {
    let remaining = availableNum
    const next: Record<string, string> = {}
    for (const t of openTargets) {
      if (remaining <= 0) break
      const take = Math.min(Number(t.balance), remaining)
      if (take > 0) {
        next[t.id] = take.toFixed(2)
        remaining -= take
      }
    }
    setAlloc(next)
  }

  const submit = async () => {
    const allocations = Object.entries(alloc)
      .filter(([, amt]) => Number(amt) > 0)
      .map(([targetId, amount]) => ({ targetId, amount: Number(amount).toFixed(2) }))
    if (allocations.length === 0) {
      toast.error(copy.nothingAssigned)
      return
    }
    if (excess) {
      toast.error('Lo asignado supera el crédito disponible')
      return
    }
    try {
      await apply(allocations)
      toast.success('Anticipo aplicado')
      idem.renew()
      setAlloc({})
      onOpenChange(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo aplicar'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aplicar anticipo</DialogTitle>
          <DialogDescription>
            Crédito disponible:{' '}
            <span className="nums font-medium text-foreground">{formatAmount(available)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={autoAllocate}
              disabled={openTargets.length === 0}
            >
              <Wand2 className="size-4" />
              Automático
            </Button>
          </div>
          {openTargets.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{copy.empty}</p>
          ) : (
            <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">
              {openTargets.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div>{formatDateHuman(t.dueDate)}</div>
                    <div className="nums text-xs text-muted-foreground">
                      Saldo {formatAmount(t.balance, t.currency ?? undefined)}
                    </div>
                  </div>
                  <MoneyInput
                    // Sin rótulo visible: el nombre lo pone la fila, que es lo
                    // que distingue un campo del de arriba (§46).
                    aria-label={`${copy.amountLabel} que vence ${formatDateHuman(t.dueDate)}`}
                    className="h-8 w-32 text-right"
                    placeholder="0"
                    value={alloc[t.id] ?? ''}
                    onChange={(raw) => setAlloc((prev) => ({ ...prev, [t.id]: raw }))}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Asignado</span>
            <span className={cn('nums', excess && 'text-destructive')}>
              {formatAmount(assigned.toFixed(2))}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={isPending}>
            {isPending && <Loader size="sm" />}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
