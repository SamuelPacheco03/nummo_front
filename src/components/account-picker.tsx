import { Button } from '@/components/ui/button'
import { MoneyInput } from '@/components/ui/money-input'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { formatAmount, formatMoney, formatDateHuman, plural } from '@/lib/format'
import {
  MONEY_EPSILON,
  sumAllocations,
  type AccountPickerCopy,
  type Allocation,
  type OpenAccount,
} from '@/lib/settlement'

/**
 * **A qué cuentas va el dinero.** El selector que comparten las tres pantallas
 * que reparten: registrar un pago, registrar un egreso y aplicar un anticipo.
 *
 * Existe porque las tres hacían lo mismo con código distinto. Cuando el
 * formulario de registrar pasó a elegir cuentas en vez de repartir un total
 * (§11.1.17), su lista y la del diálogo de anticipos quedaron a treinta líneas
 * de ser idénticas —misma fila, misma casilla, mismo encabezado— y copiar el
 * rediseño al otro lado era exactamente lo que §«nada por duplicado» prohíbe.
 *
 * **Marcar es el gesto y el importe es la excepción**: la casilla pone el saldo
 * entero —lo que pasa casi siempre— y el campo de al lado solo hace falta para
 * un abono parcial. No hay dos estados: una cuenta está marcada **porque tiene
 * importe**, así que teclear una cifra la marca y borrarla la desmarca, y no
 * existe la casilla marcada que no aporta nada.
 *
 * Cada fila dice **de qué es** y **cómo está**. Antes decía «Vence 5 may» y un
 * saldo: cinco pensiones seguidas eran cinco filas que no se distinguían entre
 * sí, y desde luego no se veía cuál estaba vencida.
 */
export function AccountPicker({
  copy,
  accounts,
  concepts,
  statusOf,
  alloc,
  onRow,
  onToggleAll,
  allSelected,
  currency,
  capacity,
}: {
  copy: AccountPickerCopy
  accounts: OpenAccount[]
  /** El catálogo que la pantalla ya carga, para decir de qué es cada fila (§95.19). */
  concepts: { id: string; name: string }[]
  /** Tono y etiqueta del estado. Es distinto en cada cara del espejo (§88.5). */
  statusOf: (status: string) => { tone: StatusTone; label: string }
  alloc: Allocation
  onRow: (id: string, raw: string) => void
  /** Marca todo lo que quepa, o lo quita. Qué es «todo» lo decide quien llama. */
  onToggleAll: () => void
  allSelected: boolean
  currency?: string
  /**
   * Techo de lo que se puede repartir, si lo hay.
   *
   * Registrar un pago no tiene: el monto lo pone la selección. Aplicar un
   * anticipo sí —el crédito disponible—, y ahí marcar una cuenta pone lo que
   * quepa, no su saldo entero: ofrecer un saldo que no cabe es ofrecer un error.
   */
  capacity?: number
}) {
  const nameOf = (catalogId?: string) => concepts.find((c) => c.id === catalogId)?.name
  const totalOpen = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
  const remaining = capacity == null ? Infinity : capacity - sumAllocations(alloc)

  return (
    <section className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">{copy.title}</h3>
          {accounts.length > 0 && (
            <p className="nums text-muted-foreground flex flex-wrap gap-x-2 text-xs">
              <span>{plural(accounts.length, copy.open[0], copy.open[1])}</span>
              <span>{formatMoney(totalOpen.toFixed(2), currency)}</span>
            </p>
          )}
        </div>
        {accounts.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={onToggleAll}>
            {allSelected ? copy.clearAll : copy.selectAll}
          </Button>
        )}
      </div>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground py-2 text-sm">{copy.empty}</p>
      ) : (
        <ul className="divide-y border-y">
          {accounts.map((account) => {
            const raw = alloc[account.id] ?? ''
            const checked = Number(raw) > 0
            const concept = nameOf(account.catalogId)
            const título = `Vence ${formatDateHuman(account.dueDate)}`
            // Sin crédito que ponerle, marcarla no haría nada: se apaga en vez
            // de aceptar el clic y no cambiar nada en pantalla.
            const noRoom = !checked && remaining <= MONEY_EPSILON
            return (
              <li key={account.id} className="flex items-center gap-3 py-2 text-sm">
                {/*
                  La fila entera es el objetivo táctil (§43), y el <label> le
                  presta su texto a la casilla: sin él serían cinco casillas que
                  para un lector de pantalla se llaman igual (§46).
                */}
                <label
                  className={
                    noRoom
                      ? 'flex min-w-0 flex-1 items-center gap-3 py-1 opacity-50'
                      : 'flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1'
                  }
                >
                  <input
                    type="checkbox"
                    className="accent-primary size-4 shrink-0"
                    checked={checked}
                    disabled={noRoom}
                    onChange={() =>
                      onRow(
                        account.id,
                        checked ? '' : Math.min(Number(account.balance), remaining).toFixed(2),
                      )
                    }
                  />
                  <span className="min-w-0">
                    <span className="block">{título}</span>
                    <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                      {concept && <span className="truncate">{concept}</span>}
                      <StatusBadge {...statusOf(account.status)} className="text-xs" />
                      <span className="nums whitespace-nowrap">
                        Saldo {formatAmount(account.balance, account.currency)}
                      </span>
                    </span>
                  </span>
                </label>
                <MoneyInput
                  className="h-9 w-32 px-2 text-right"
                  placeholder="0"
                  aria-label={`Importe · ${concept ? `${concept} · ` : ''}${título}`}
                  value={raw}
                  onChange={(value) => onRow(account.id, value)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
