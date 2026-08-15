import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { formatAmount, formatDateHuman } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useApplyDisbursementAllocations, useExpenses } from './hooks'

const OPEN = new Set(['PENDING', 'PARTIAL', 'OVERDUE'])

export function ApplySupplierAdvanceDialog({
  orgId,
  disbursementId,
  supplierId,
  available,
  open,
  onOpenChange,
}: {
  orgId: string
  disbursementId: string
  supplierId: string | null
  available: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const apply = useApplyDisbursementAllocations(orgId)
  const [alloc, setAlloc] = useState<Record<string, string>>({})
  const availableNum = Number(available) || 0

  const { items: all } = useExpenses(orgId, { page: 1, pageSize: 100, supplierContactId: supplierId || undefined, order: 'asc' })
  const openExpenses = useMemo(
    () => (supplierId ? all.filter((e) => OPEN.has(e.displayStatus) && Number(e.balance) > 0) : []),
    [supplierId, all],
  )
  const assigned = useMemo(() => Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0), [alloc])

  const autoAllocate = () => {
    let remaining = availableNum
    const next: Record<string, string> = {}
    for (const e of openExpenses) {
      if (remaining <= 0) break
      const take = Math.min(Number(e.balance), remaining)
      if (take > 0) {
        next[e.expenseId] = take.toFixed(2)
        remaining -= take
      }
    }
    setAlloc(next)
  }

  const submit = async () => {
    const allocations = Object.entries(alloc)
      .filter(([, amt]) => Number(amt) > 0)
      .map(([expenseId, amount]) => ({ expenseId, amount: Number(amount).toFixed(2) }))
    if (allocations.length === 0) {
      toast.error('Asigna al menos un gasto')
      return
    }
    if (assigned > availableNum + 0.001) {
      toast.error('Lo asignado supera el crédito disponible')
      return
    }
    try {
      await apply.mutateAsync({ orgId, id: disbursementId, data: { allocations } })
      toast.success('Anticipo aplicado')
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
            Crédito disponible: <span className="nums font-medium text-foreground">{formatAmount(available)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={autoAllocate} disabled={openExpenses.length === 0}>
              <Wand2 className="size-4" />
              Automático
            </Button>
          </div>
          {openExpenses.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Este proveedor no tiene gastos abiertos.</p>
          ) : (
            <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">
              {openExpenses.map((e) => (
                <li key={e.expenseId} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div>{formatDateHuman(e.dueDate)}</div>
                    <div className="nums text-xs text-muted-foreground">Saldo {formatAmount(e.balance, e.currency)}</div>
                  </div>
                  <MoneyInput
                    className="h-8 w-32 text-right"
                    placeholder="0"
                    value={alloc[e.expenseId] ?? ''}
                    onChange={(raw) => setAlloc((prev) => ({ ...prev, [e.expenseId]: raw }))}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Asignado</span>
            <span className={cn('nums', assigned > availableNum + 0.001 && 'text-destructive')}>{formatAmount(assigned.toFixed(2))}</span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={apply.isPending}>
            {apply.isPending && <Loader2 className="size-4 animate-spin" />}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
