import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AccountPicker } from '@/components/account-picker'
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
import type { StatusTone } from '@/components/ui/status-badge'
import { toastApiError } from '@/features/platform/errors'
import { useIdempotencyKey } from '@/lib/idempotency'
import { formatAmount, formatMoney, plural } from '@/lib/format'
import {
  MONEY_EPSILON,
  allocationEntries,
  isOpenAccount,
  spreadAmount,
  sumAllocations,
  type AccountPickerCopy,
  type Allocation,
  type OpenAccount,
} from '@/lib/settlement'

/** Una cuenta de la contraparte, ya traducida desde su endpoint. */
export type AdvanceTarget = OpenAccount

/** Un renglón del reparto. El adaptador le pone al `id` el nombre del API. */
export interface AdvanceAllocation {
  targetId: string
  /** Decimal con dos cifras, como lo espera el contrato (§88). */
  amount: string
}

/** Lo que cambia entre cobrar y pagar: las palabras. */
export interface AdvanceCopy {
  /** Las del selector, compartidas con el formulario de registrar (§11.1.17). */
  picker: AccountPickerCopy
  /** Aviso cuando no se asignó nada: «Marca al menos una cuenta» / «un gasto». */
  nothingAssigned: string
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
 * **Se marcan cuentas**, como en el formulario de registrar (§11.1.17): la
 * casilla pone lo que quepa del saldo y el campo de al lado queda para el abono
 * parcial. Aquí el techo no lo pone la selección sino el **crédito disponible**,
 * así que marcar nunca ofrece un importe que no cabe y lo que queda sin aplicar
 * se dice con palabras en vez de dejar una cifra rotulada «Asignado».
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
  concepts,
  statusOf,
  useTargets,
  useApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Crédito sin aplicar, como string decimal. */
  available: string
  copy: AdvanceCopy
  /** El catálogo que la pantalla ya carga, para decir de qué es cada fila (§95.19). */
  concepts: { id: string; name: string }[]
  /** Tono y etiqueta del estado. Es distinto en cada cara (§88.5). */
  statusOf: (status: string) => { tone: StatusTone; label: string }
  /** Las cuentas de la contraparte. Es un hook: se llama en el render. */
  useTargets: () => AdvanceTarget[]
  /** El reparto contra el API. También es un hook. */
  useApply: (idempotencyKey: string) => AdvanceApply
}) {
  const idem = useIdempotencyKey()
  const { apply, isPending } = useApply(idem.key)
  const [alloc, setAlloc] = useState<Allocation>({})
  const availableNum = Number(available) || 0

  const targets = useTargets()
  const openTargets = useMemo(
    () => targets.filter((t) => isOpenAccount({ displayStatus: t.status, balance: t.balance })),
    [targets],
  )
  const assigned = useMemo(() => sumAllocations(alloc), [alloc])
  const unapplied = availableNum - assigned
  const excess = unapplied < -MONEY_EPSILON
  const selectedCount = useMemo(
    () => Object.values(alloc).filter((v) => Number(v) > 0).length,
    [alloc],
  )
  const currency = openTargets[0]?.currency

  /**
   * «Todas» aquí es **todas las que quepan**: el crédito puede no dar para la
   * última, y ofrecer marcarla igual sería ofrecer un error. Se reparte de la
   * más antigua a la más nueva, que es como se salda.
   */
  const spread = useMemo(
    () => spreadAmount(openTargets, availableNum),
    [openTargets, availableNum],
  )
  const allSelected = assigned >= sumAllocations(spread) - MONEY_EPSILON && assigned > 0
  const toggleAll = () => setAlloc(allSelected ? {} : spread)

  const submit = async () => {
    const allocations = allocationEntries(alloc).map(({ id, amount }) => ({
      targetId: id,
      amount,
    }))
    if (allocations.length === 0) {
      toast.error(copy.nothingAssigned)
      return
    }
    if (excess) {
      toast.error(
        `Lo asignado supera el crédito por ${formatAmount(Math.abs(unapplied).toFixed(2), currency)}`,
      )
      return
    }
    try {
      await apply(allocations)
      toast.success('Anticipo aplicado')
      idem.renew()
      setAlloc({})
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'No se pudo aplicar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aplicar anticipo</DialogTitle>
          <DialogDescription>
            Crédito disponible:{' '}
            <span className="nums text-foreground font-medium">{formatAmount(available)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="max-h-[45vh] overflow-y-auto">
            <AccountPicker
              copy={copy.picker}
              accounts={openTargets}
              concepts={concepts}
              statusOf={statusOf}
              alloc={alloc}
              onRow={(id, raw) => setAlloc((prev) => ({ ...prev, [id]: raw }))}
              allSelected={allSelected}
              onToggleAll={toggleAll}
              currency={currency}
              capacity={availableNum}
            />
          </div>
          {openTargets.length > 0 && (
            <AdvanceSummary
              copy={copy}
              selectedCount={selectedCount}
              assigned={assigned}
              unapplied={unapplied}
              excess={excess}
              currency={currency}
            />
          )}
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

/**
 * Qué va a pasar con el crédito, **en una frase**.
 *
 * Antes era una cifra rotulada «Asignado» y había que restarla del disponible de
 * la cabecera para saber cuánto quedaba vivo. Aquí lo que sobra no se pierde
 * —sigue siendo crédito de la contraparte—, y decirlo es la mitad de la
 * tranquilidad de aplicar un anticipo a medias.
 */
function AdvanceSummary({
  copy,
  selectedCount,
  assigned,
  unapplied,
  excess,
  currency,
}: {
  copy: AdvanceCopy
  selectedCount: number
  assigned: number
  unapplied: number
  excess: boolean
  currency?: string
}) {
  if (excess) {
    return (
      <p className="text-destructive text-sm">
        Lo asignado supera el crédito por{' '}
        <span className="nums font-medium">
          {formatMoney(Math.abs(unapplied).toFixed(2), currency)}
        </span>
        .
      </p>
    )
  }

  if (assigned <= MONEY_EPSILON) {
    return (
      <p className="text-muted-foreground text-sm">
        Marca lo que quieres cubrir con este anticipo.
      </p>
    )
  }

  const cubre = `Se aplica a ${plural(selectedCount, copy.picker.unit[0], copy.picker.unit[1])}`

  if (unapplied > MONEY_EPSILON) {
    return (
      <p className="text-muted-foreground text-sm">
        {cubre}. Quedan{' '}
        <span className="nums text-foreground font-medium">
          {formatMoney(unapplied.toFixed(2), currency)}
        </span>{' '}
        de crédito sin aplicar.
      </p>
    )
  }

  return <p className="text-muted-foreground text-sm">{cubre}, y el crédito queda en cero.</p>
}
